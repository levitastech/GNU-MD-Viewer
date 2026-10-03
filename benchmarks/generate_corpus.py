#!/usr/bin/env python3
"""Generate original, deterministic QA data; never replace an existing output."""

import argparse
import hashlib
import json
from pathlib import Path

SIZES = (100_000, 1_000_000, 5_000_000, 20_000_000)
PATTERNS = {
    "prose": (
        "## Lecture locale\n\n"
        "Été à Alger : lecture déterministe, sans réseau ni document personnel.\n\n"
        "```text\nligne de code courte\n```\n\n"
    ),
    "gfm": (
        "## Tableau et tâches\n\n"
        "| Nom | Valeur |\n| --- | ---: |\n| été | 42 |\n\n"
        "- [ ] Lecture\n- [x] Vérification\n\n~~barré~~ et **texte**.\n\n"
    ),
    "code": (
        "## Code\n\n```typescript\n"
        + "const lecture = '<texte inerte>';\n" * 128
        + "```\n\n"
    ),
}


def sized(pattern: str, size: int) -> tuple[bytes, int]:
    unit = pattern.encode("utf-8")
    count, remainder = divmod(size, len(unit))
    # Whole blocks only, then an ASCII paragraph so UTF-8/fences remain valid.
    return unit * count + b"x" * remainder, count


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    # Fail before any write if output exists, including a symlink.
    args.output.mkdir(parents=True, exist_ok=False)
    entries = []

    def emit(name: str, payload: bytes, kind: str, units: int | None = None) -> None:
        (args.output / name).write_bytes(payload)
        try:
            text = payload.decode("utf-8")
        except UnicodeDecodeError:
            text = None
        entries.append({
            "file": name,
            "class": kind,
            "bytes": len(payload),
            "characters": len(text) if text is not None else None,
            "lines": payload.count(b"\n") + bool(payload and not payload.endswith(b"\n")),
            "complete_units": units,
            "sha256": hashlib.sha256(payload).hexdigest(),
        })

    for kind, pattern in PATTERNS.items():
        for size in SIZES:
            payload, units = sized(pattern, size)
            emit(f"{kind}-{size}.md", payload, kind, units)
    emit("oversize-20000001.md", b"x" * 20_000_001, "oversize")
    sample = "# Été\n\nالعربية et 日本語.\n"
    emit("encoding-lf.md", sample.encode(), "encoding")
    emit("encoding-bom-crlf.md", b"\xef\xbb\xbf" + sample.replace("\n", "\r\n").encode(), "encoding")
    emit("encoding-invalid.md", b"# UTF-8 invalide\n\xc3\x28\xff\n", "invalid-utf8")
    emit("adversarial-fence.md", b"`" * 100_000 + b"\nx\n", "long-fence")
    emit("adversarial-table.md", ("| a | b |\n| --- | --- |\n" + "| x | y |\n" * 50_000).encode(), "large-table", 50_000)
    emit("adversarial-code.md", b"```text\n" + b"<script>inert</script>" * 100_000 + b"\n```\n", "long-code", 1)
    graph = "```mermaid\nflowchart LR\n" + "".join(f"N{i} --> N{i+1}\n" for i in range(10_000)) + "```\n"
    emit("adversarial-mermaid.md", graph.encode(), "many-edges", 10_000)
    emit("adversarial-math.md", ("$$\n" + "\\frac{1}{" * 10_000 + "x" + "}" * 10_000 + "\n$$\n").encode(), "nested-math", 10_000)
    manifest = {
        "schema": 1,
        "generator_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "license": "MIT",
        "size_unit": "decimal bytes",
        "token_count": "not measured: parser absent",
        "unit_definitions": {"prose": "heading + paragraph + fenced code", "gfm": "heading + table + task list + paragraph", "code": "heading + 128-line fenced code"},
        "files": entries,
    }
    raw = (json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode()
    (args.output / "manifest.json").write_bytes(raw)
    print(json.dumps({"files": len(entries), "manifest_sha256": hashlib.sha256(raw).hexdigest()}))


if __name__ == "__main__":
    main()
