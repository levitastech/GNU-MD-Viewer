#!/usr/bin/env python3
"""Check documentary links and the generated corpus, without application claims."""

import argparse
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def check_links() -> int:
    files = [ROOT / "README.md", ROOT / "THIRD_PARTY_NOTICES.md", ROOT / "benchmarks/README.md"]
    files += sorted((ROOT / "docs").rglob("*.md"))
    files += [ROOT / "tests/fixtures/README.md"]
    count = 0
    for file in files:
        text = re.sub(r"```.*?```", "", file.read_text(), flags=re.S)
        for match in re.finditer(r"(?<!!)\[[^\]\n]+\]\(([^)]+)\)", text):
            target = match.group(1).strip().strip("<>")
            parsed = urlsplit(target)
            if parsed.scheme or target.startswith("//") or not parsed.path:
                continue
            path = file.parent / unquote(parsed.path)
            require(path.exists(), f"Broken file link: {file.relative_to(ROOT)} -> {target}")
            count += 1
    return count


def check_corpus(first: Path, second: Path) -> dict:
    raw = (first / "manifest.json").read_bytes()
    require(raw == (second / "manifest.json").read_bytes(), "Manifests differ")
    manifest = json.loads(raw)
    require(manifest["generator_sha256"] == hashlib.sha256((ROOT / "benchmarks/generate_corpus.py").read_bytes()).hexdigest(), "Generator hash differs")
    files = manifest["files"]
    require(len(files) == 21, "Expected 21 corpus files")
    names = {entry["file"] for entry in files}
    require(len(names) == len(files), "Duplicate file names")
    for folder in (first, second):
        require({p.name for p in folder.iterdir()} == names | {"manifest.json"}, "Unexpected corpus inventory")
    for entry in files:
        data = (first / entry["file"]).read_bytes()
        require(data == (second / entry["file"]).read_bytes(), f"Non deterministic: {entry['file']}")
        require(len(data) == entry["bytes"], f"Size mismatch: {entry['file']}")
        require(hashlib.sha256(data).hexdigest() == entry["sha256"], f"Hash mismatch: {entry['file']}")
        if entry["class"] in {"prose", "gfm", "code"}:
            require(len(data) == int(Path(entry["file"]).stem.split("-")[-1]), "Wrong nominal size")
        if entry["class"] != "invalid-utf8":
            require(len(data.decode("utf-8")) == entry["characters"], "Character count mismatch")
    invalid = (first / "encoding-invalid.md").read_bytes()
    try:
        invalid.decode("utf-8")
    except UnicodeDecodeError:
        pass
    else:
        raise ValueError("Invalid UTF-8 fixture is valid")
    bom = (first / "encoding-bom-crlf.md").read_bytes()
    require(bom.startswith(b"\xef\xbb\xbf") and b"\r\n" in bom, "Missing BOM/CRLF")
    require(bom.decode("utf-8-sig").replace("\r\n", "\n") == (first / "encoding-lf.md").read_bytes().decode(), "Encoding variants differ")
    require((first / "oversize-20000001.md").stat().st_size == 20_000_001, "Wrong oversize boundary")
    return {"files": len(files), "manifest_sha256": hashlib.sha256(raw).hexdigest()}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--corpus", nargs=2, required=True, type=Path, metavar=("FIRST", "SECOND"))
    args = parser.parse_args()
    result = check_corpus(*args.corpus)
    result["local_file_links"] = check_links()
    # Exact input snapshot, excluding the report that records this digest.
    artifacts = [ROOT / name for name in (".gitignore", "LICENSE", "README.md", "THIRD_PARTY_NOTICES.md")]
    artifacts += [p for folder in ("docs", "tests/fixtures", "benchmarks") for p in (ROOT / folder).rglob("*")
                  if p.is_file() and p.suffix in {".md", ".svg", ".py"} and p.name != "V0_ENTRY_REPORT.md" and "generated" not in p.relative_to(ROOT).parts]
    digest = hashlib.sha256()
    for path in sorted(artifacts):
        digest.update(str(path.relative_to(ROOT)).encode() + b"\0" + path.read_bytes() + b"\0")
    result["artifacts_sha256"] = digest.hexdigest()
    print(json.dumps(result, sort_keys=True))


if __name__ == "__main__":
    main()
