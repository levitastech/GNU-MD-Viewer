#!/usr/bin/env bash
set -euo pipefail

project_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
fixture_dir=$(mktemp -d /tmp/gnu-mdv-l04.XXXXXX)
log_file="$fixture_dir/harness.log"
network_log="$fixture_dir/network.log"
trap 'rm -rf "$fixture_dir"' EXIT

mkdir -p "$fixture_dir/root/assets"
printf '# Fixture native L04\n' > "$fixture_dir/root/document.md"
cp "$project_dir/src-tauri/icons/32x32.png" "$fixture_dir/root/assets/allowed.png"
cp "$project_dir/src-tauri/icons/32x32.png" "$fixture_dir/outside.png"

cd "$project_dir"
VITE_L04_HARNESS=1 pnpm tauri build --no-bundle --features l04-harness

set +e
GNU_MDV_L04_HARNESS_DOCUMENT="$fixture_dir/root/document.md" \
  strace -f -e trace=connect -s 160 -o "$network_log" \
  timeout 30s src-tauri/target/release/gnu-mdv 2>&1 | tee "$log_file"
status=${PIPESTATUS[0]}
set -e

if [[ "$status" -ne 124 ]]; then
  printf 'Le harness devait rester vivant jusqu’au timeout (124), statut=%s\n' "$status" >&2
  exit 1
fi

grep -Fq 'L04_WEBVIEW_REPORT:harness-report-html-ok_katex-ok_mermaid-ok_image-ok_path-ok_revoked-ok' "$log_file"

if grep -Eq 'sa_family=AF_INET6?' "$network_log"; then
  printf 'Connexion IP inattendue pendant le harness L04.\n' >&2
  grep -E 'sa_family=AF_INET6?' "$network_log" >&2
  exit 1
fi

printf 'Harness L04 réussi ; aucune connexion IP observée.\n'
