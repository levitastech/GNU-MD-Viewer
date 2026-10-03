#!/usr/bin/env python3
"""Inspect exact npm archives/advisories without installing or executing packages."""

import argparse
import base64
import concurrent.futures
import hashlib
import io
import json
from pathlib import Path
import subprocess
import tarfile
from urllib.parse import quote, urlsplit

PACKAGES = {
    "pnpm": "12.8.1", "@tauri-apps/api": "2.12.1", "@tauri-apps/cli": "2.12.1",
    "svelte": "5.57.1", "typescript": "6.0.3", "vite": "8.3.2",
    "@sveltejs/vite-plugin-svelte": "7.3.1", "markdown-it": "15.0.2",
    "dompurify": "3.4.16", "highlight.js": "11.12.0", "mermaid": "12.1.0",
    "katex": "0.19.0", "vitest": "5.0.3", "svelte-check": "4.7.6",
    "eslint": "10.12.0", "prettier": "3.9.9", "eslint-plugin-svelte": "3.23.0",
    "typescript-eslint": "8.71.0", "@eslint/js": "10.0.1",
    "prettier-plugin-svelte": "4.1.1", "@types/node": "24.19.1",
}
CRATES = {"tauri": "2.12.1", "tauri-build": "2.7.1"}


def request(url: str, payload: bytes | None = None) -> bytes:
    command = ["curl", "--fail", "--silent", "--show-error", "--location",
               "--connect-timeout", "5", "--max-time", "60", url]
    if payload is not None:
        command += ["--header", "Content-Type: application/json", "--data-binary", "@-"]
    return subprocess.run(command, input=payload, capture_output=True, check=True).stdout


def inspect(name: str, version: str, output: Path) -> dict:
    metadata = json.loads(request(f"https://registry.npmjs.org/{quote(name, safe='@')}/{version}"))
    if metadata["name"] != name or metadata["version"] != version:
        raise ValueError("Unexpected package identity")
    url = metadata["dist"]["tarball"]
    parsed = urlsplit(url)
    if parsed.scheme != "https" or parsed.hostname != "registry.npmjs.org":
        raise ValueError("Unexpected archive origin")
    archive = request(url)
    integrity = metadata["dist"]["integrity"]
    algorithm, expected = integrity.split("-", 1)
    if algorithm not in ("sha512", "sha256"):
        raise ValueError("Unsupported archive digest")
    actual = base64.b64encode(hashlib.new(algorithm, archive).digest()).decode()
    if actual != expected:
        raise ValueError("Archive integrity mismatch")
    notices = []
    with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as tar:
        for member in tar:
            basename = Path(member.name).name.lower()
            if member.isfile() and member.size <= 1_000_000 and any(word in basename for word in ("license", "licence", "notice", "copyright")):
                content = tar.extractfile(member).read()
                notices.append({"path": member.name, "sha256": hashlib.sha256(content).hexdigest(),
                                "text": content.decode("utf-8", errors="replace")})
    # No tar extraction, lifecycle scripts, imports, or execution of package code.
    result = {"name": name, "version": version, "integrity": integrity,
              "archive_sha256": hashlib.sha256(archive).hexdigest(),
              "archive_bytes": len(archive), "license": metadata.get("license"),
              "engines": metadata.get("engines"), "peers": metadata.get("peerDependencies"),
              "dependencies": metadata.get("dependencies", {}), "types": metadata.get("types"),
              "notices": notices}
    filename = name.replace("@", "").replace("/", "--")
    (output / f"{filename}-{version}.json").write_text(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True) + "\n")
    return {key: value for key, value in result.items() if key != "notices"} | {"notice_files": len(notices)}


def inspect_crate(name: str, version: str, output: Path) -> dict:
    index = request(f"https://index.crates.io/{name[:2]}/{name[2:4]}/{name}")
    metadata = next(row for line in index.splitlines() if (row := json.loads(line))["vers"] == version)
    if metadata["yanked"]:
        raise ValueError("Crate is yanked")
    archive = request(f"https://static.crates.io/crates/{name}/{name}-{version}.crate")
    digest = hashlib.sha256(archive).hexdigest()
    if digest != metadata["cksum"]:
        raise ValueError("Crate checksum mismatch")
    notices = []
    with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as tar:
        for member in tar:
            if member.isfile() and member.size <= 1_000_000 and any(word in Path(member.name).name.lower() for word in ("license", "notice", "copyright")):
                content = tar.extractfile(member).read()
                notices.append({"path": member.name, "sha256": hashlib.sha256(content).hexdigest(), "text": content.decode("utf-8", errors="replace")})
    result = {"name": name, "version": version, "archive_sha256": digest,
              "rust_version": metadata["rust_version"], "dependencies": metadata["deps"], "notices": notices}
    (output / f"{name}-{version}.json").write_text(json.dumps(result, indent=2, sort_keys=True) + "\n")
    return {key: value for key, value in result.items() if key != "notices"} | {"notice_files": len(notices)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--ecosystem", choices=("npm", "crates"), default="npm")
    parser.add_argument("--only", nargs="+")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    if args.output.resolve().is_relative_to(root):
        parser.error("Audit cache must stay outside the project repository")
    args.output.mkdir(parents=True, exist_ok=False)
    packages = CRATES if args.ecosystem == "crates" else PACKAGES
    if args.only:
        if set(args.only) - packages.keys():
            parser.error("Unknown selected package")
        packages = {name: packages[name] for name in args.only}
    inspector = inspect_crate if args.ecosystem == "crates" else inspect
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(inspector, name, version, args.output): name for name, version in packages.items()}
        for future in concurrent.futures.as_completed(futures):
            name = futures[future]
            try:
                row = future.result()
            except Exception as error:
                row = {"name": name, "error": str(error)}
            results.append(row)
            print(json.dumps({key: row[key] for key in ("name", "version", "notice_files", "error") if key in row}), flush=True)
    advisories = (json.loads(request("https://registry.npmjs.org/-/npm/v1/security/advisories/bulk",
                                    json.dumps({name: [version] for name, version in packages.items()}).encode()))
                  if args.ecosystem == "npm" else "manual GitHub/RustSec review required")
    report = {"schema": 1, "scope": f"exact direct {args.ecosystem} candidates only; no resolved transitive graph",
              "script_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              "packages": sorted(results, key=lambda row: row["name"]), "advisories": advisories}
    raw = (json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode()
    (args.output / "report.json").write_bytes(raw)
    print(json.dumps({"report_sha256": hashlib.sha256(raw).hexdigest(), "advisory_packages": sorted(advisories) if isinstance(advisories, dict) else advisories}), flush=True)
    if any("error" in row for row in results):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
