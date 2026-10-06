#!/usr/bin/env bash
set -euo pipefail

project_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
recipe_logs=$(mktemp -d /tmp/gnu-mdv-v3.XXXXXX)
cd "$project_dir"
sha256sum tests/fixtures/v3/document.md tests/fixtures/v3/sub/guide.md \
  'tests/fixtures/v3/sub/été #%.md' 'tests/fixtures/v3/assets/été #%.png' \
  tests/fixtures/v3/assets/allowed.png > "$recipe_logs/source-before.sha256"
VITE_V3_HARNESS=1 pnpm tauri build --debug --no-bundle --features l09-harness

set +e
pushd /tmp >/dev/null
GNU_MDV_L09_HARNESS_DOCUMENT="$project_dir/tests/fixtures/v3/document.md" \
  GNU_MDV_V3_HARNESS_ROOT="$project_dir/tests/fixtures" \
  /usr/bin/time -v -o "$recipe_logs/metrics.log" \
  strace -f -e trace=connect -s 160 -o "$recipe_logs/network.log" \
  timeout 25s "$project_dir/src-tauri/target/debug/gnu-mdv" > "$recipe_logs/webview.log" 2>&1
status=$?
popd >/dev/null
set -e
printf 'Preuves V3 : %s\n' "$recipe_logs"
cat "$recipe_logs/webview.log"
test "$status" -eq 124
report=$(rg 'L09_WEBVIEW_REPORT:l09-report-v3_' "$recipe_logs/webview.log")
if [[ "$report" == *-fail* ]]; then
  printf 'Échec de la recette V3.\n' >&2
  exit 1
fi
for check in image hostile tasks anchor note back hide toc dark light zoom reset failure relative return encoded fragment outside root parent revoked; do
  [[ "$report" == *"${check}-ok"* ]]
done
if rg 'sa_family=AF_INET6?' "$recipe_logs/network.log"; then
  printf 'Connexion IP inattendue.\n' >&2
  exit 1
fi
sha256sum --check "$recipe_logs/source-before.sha256"
rg 'Maximum resident set size' "$recipe_logs/metrics.log"
printf 'Recette V3 réussie, aucune connexion IP observée, sources inchangées.\n'
