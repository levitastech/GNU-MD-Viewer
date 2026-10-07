#!/usr/bin/env bash
set -euo pipefail
project_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
recipe_logs=$(mktemp -d /tmp/gnu-mdv-v4.XXXXXX)
cd "$project_dir"
sha256sum tests/fixtures/v4/document.md > "$recipe_logs/source.sha256"
VITE_V4_HARNESS=1 pnpm tauri build --debug --no-bundle --features l09-harness
cp tests/fixtures/v4/document.md "$recipe_logs/document.md"
set +e
(cd /tmp && XDG_CONFIG_HOME="$recipe_logs/config" GNU_MDV_L09_HARNESS_DOCUMENT="$recipe_logs/document.md" \
 strace -f -e trace=connect -o "$recipe_logs/network.log" \
 timeout 40s "$project_dir/src-tauri/target/debug/gnu-mdv" > "$recipe_logs/webview.log" 2>&1) &
recipe_pid=$!
set -e
python3 tests/integration/v4_external_changes.py "$recipe_logs"
set +e
wait "$recipe_pid"
status=$?
set -e
cat "$recipe_logs/webview.log"
test "$status" -eq 124
report=$(rg 'L09_WEBVIEW_REPORT:l09-report-v4_' "$recipe_logs/webview.log")
[[ "$report" != *-fail* ]]
for check in diagrams unique inert fallback theme math money matherrors mathinert fonts lazy code copy unknown overwrite atomic removed recreated invalidreload burst explicitreload dedup recentmissing recentopen preferences; do [[ "$report" == *"${check}-ok"* ]]; done
! rg 'sa_family=AF_INET6?' "$recipe_logs/network.log"
sha256sum --check "$recipe_logs/source.sha256"
printf 'Preuves V4 : %s\n' "$recipe_logs"

set +e
(cd /tmp && XDG_CONFIG_HOME="$recipe_logs/config" GNU_MDV_L09_HARNESS_DOCUMENT="$recipe_logs/document.md" \
 strace -f -e trace=connect -o "$recipe_logs/restore-network.log" \
 timeout 30s "$project_dir/src-tauri/target/debug/gnu-mdv" > "$recipe_logs/restore.log" 2>&1) &
restore_pid=$!
set -e
python3 tests/integration/v4_external_changes.py "$recipe_logs" restore
set +e
wait "$restore_pid"
restore_status=$?
set -e
cat "$recipe_logs/restore.log"
test "$restore_status" -eq 124
restore_report=$(rg 'L09_WEBVIEW_REPORT:l09-report-v4restore_' "$recipe_logs/restore.log")
[[ "$restore_report" != *-fail* ]]
for check in noautoload restored recentrestored tocrestored removeone clear clearstays; do [[ "$restore_report" == *"${check}-ok"* ]]; done
! rg 'sa_family=AF_INET6?' "$recipe_logs/restore-network.log"
