#!/usr/bin/env bash
set -euo pipefail

project_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
fixture_dir=$(mktemp -d /tmp/gnu-mdv-l09.XXXXXX)
baseline_log="$fixture_dir/baseline.log"
metrics_log="$fixture_dir/metrics.log"
network_log="$fixture_dir/network.log"
trap 'rm -rf "$fixture_dir"' EXIT

printf '%s\n' \
  '# Fixture L09' \
  '' \
  '| Colonne | Valeur |' \
  '| --- | --- |' \
  '| locale | sûre |' \
  '' \
  '```html' \
  '<script>alert("inerte")</script>' \
  '```' \
  '' \
  '[Guide externe](https://example.test/guide)' \
  '' \
  '<img src="https://example.invalid/pixel.png" onclick="alert(1)">' \
  > "$fixture_dir/document.md"

cd "$project_dir"
VITE_L09_HARNESS=1 pnpm tauri build --no-bundle --features l09-harness

set +e
GNU_MDV_L09_HARNESS_DOCUMENT="$fixture_dir/document.md" \
  /usr/bin/time -v -o "$metrics_log" \
  timeout 20s src-tauri/target/release/gnu-mdv 2>&1 | tee "$baseline_log"
status=${PIPESTATUS[0]}
set -e

if [[ "$status" -ne 124 ]]; then
  printf 'Le harness devait rester vivant jusqu’au timeout (124), statut=%s\n' "$status" >&2
  exit 1
fi

grep -Eq 'L09_WEBVIEW_REPORT:l09-report-document-ok_table-ok_code-ok_hostile-ok_link-ok_render-ms-[0-9]+' "$baseline_log"
grep -F 'Maximum resident set size' "$metrics_log"

set +e
GNU_MDV_L09_HARNESS_DOCUMENT="$fixture_dir/document.md" \
  strace -f -e trace=connect -s 160 -o "$network_log" \
  timeout 15s src-tauri/target/release/gnu-mdv >/dev/null 2>&1
network_status=$?
set -e

if [[ "$network_status" -ne 124 ]]; then
  printf 'Le contrôle réseau devait rester vivant jusqu’au timeout (124), statut=%s\n' "$network_status" >&2
  exit 1
fi

if grep -Eq 'sa_family=AF_INET6?' "$network_log"; then
  printf 'Connexion IP inattendue pendant le harness L09.\n' >&2
  grep -E 'sa_family=AF_INET6?' "$network_log" >&2
  exit 1
fi

printf 'Harness L09 réussi ; baseline consignée et aucune connexion IP observée.\n'
