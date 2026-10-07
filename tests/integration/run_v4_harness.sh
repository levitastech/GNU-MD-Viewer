#!/usr/bin/env bash
set -euo pipefail
project_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
recipe_logs=$(mktemp -d /tmp/gnu-mdv-v4.XXXXXX)
cd "$project_dir"
sha256sum tests/fixtures/v4/document.md > "$recipe_logs/source.sha256"
VITE_V4_HARNESS=1 pnpm tauri build --debug --no-bundle --features l09-harness
set +e
(cd /tmp && GNU_MDV_L09_HARNESS_DOCUMENT="$project_dir/tests/fixtures/v4/document.md" \
 strace -f -e trace=connect -o "$recipe_logs/network.log" \
 timeout 25s "$project_dir/src-tauri/target/debug/gnu-mdv" > "$recipe_logs/webview.log" 2>&1)
status=$?
set -e
cat "$recipe_logs/webview.log"
test "$status" -eq 124
report=$(rg 'L09_WEBVIEW_REPORT:l09-report-v4_' "$recipe_logs/webview.log")
[[ "$report" != *-fail* ]]
for check in diagrams unique inert fallback theme; do [[ "$report" == *"${check}-ok"* ]]; done
! rg 'sa_family=AF_INET6?' "$recipe_logs/network.log"
sha256sum --check "$recipe_logs/source.sha256"
printf 'Preuves V4 : %s\n' "$recipe_logs"
