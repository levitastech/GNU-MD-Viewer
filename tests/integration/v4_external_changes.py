"""Mutate only the harness-owned temporary copy, after native beacons."""
import json
import pathlib
import sys
import time

logs = pathlib.Path(sys.argv[1])
path = logs / 'document.md'

def stage(name):
    deadline = time.monotonic() + 35
    while time.monotonic() < deadline:
        log = logs / 'webview.log'
        if log.exists() and f'l09-report-v4-stage-{name}' in log.read_text(errors='replace'):
            return
        time.sleep(0.05)
    raise SystemExit(f'Stage absent: {name}')

metrics = {}
stage('watch-ready')
started = time.monotonic()
path.write_text('# Modification externe\n', encoding='utf8')
stage('overwrite-observed')
metrics['overwrite_seconds'] = time.monotonic() - started
started = time.monotonic()
temporary = logs / 'save.md'
temporary.write_text('# Remplacement atomique\n', encoding='utf8')
temporary.replace(path)
stage('atomic-observed')
metrics['atomic_seconds'] = time.monotonic() - started
path.unlink()
stage('removed-observed')
started = time.monotonic()
path.write_text('# Document recréé\n', encoding='utf8')
stage('recreated-observed')
metrics['recreated_seconds'] = time.monotonic() - started
path.write_bytes(b'\xff\xfe')
stage('invalid-observed')
for index in range(20):
    path.write_text(f'# Rafale {index}\n', encoding='utf8')
    time.sleep(0.01)
path.write_text('# Rafale terminée\n', encoding='utf8')

(logs / 'changes-metrics.json').write_text(json.dumps(metrics, indent=2))
print(json.dumps(metrics))

if any(value > 1 for value in metrics.values()):
    raise SystemExit('Budget reload 1 s dépassé sur cette recette')
