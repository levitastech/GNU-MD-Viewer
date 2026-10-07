#!/usr/bin/env bash
set -euo pipefail

project_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
recipe_logs=$(mktemp -d /tmp/gnu-mdv-v3.XXXXXX)
cd "$project_dir"
sha256sum tests/fixtures/v3/document.md tests/fixtures/v3/sub/guide.md \
  tests/fixtures/v3/headings.md tests/fixtures/v3/no-headings.md \
  tests/fixtures/v3/styles.md tests/fixtures/v3/extensions.md \
  'tests/fixtures/v3/sub/été #%.md' 'tests/fixtures/v3/assets/été #%.png' \
  tests/fixtures/v3/assets/allowed.png > "$recipe_logs/source-before.sha256"
VITE_V3_HARNESS=1 pnpm tauri build --debug --no-bundle --features l09-harness

original_scheme=$(gsettings get org.gnome.desktop.interface color-scheme)
original_scheme=${original_scheme//\'/}
trap 'gsettings set org.gnome.desktop.interface color-scheme "$original_scheme"' EXIT
gsettings set org.gnome.desktop.interface color-scheme prefer-light
await_stage() {
  local stage=$1
  for ((attempt=0; attempt<120; attempt++)); do
    if rg -q "L09_WEBVIEW_REPORT:l09-report-v3-stage-${stage}" "$recipe_logs/webview.log"; then
      return 0
    fi
    sleep 0.1
  done
  printf 'Étape de recette V3 absente : %s\n' "$stage" >&2
  return 1
}

set +e
pushd /tmp >/dev/null
GNU_MDV_L09_HARNESS_DOCUMENT="$project_dir/tests/fixtures/v3/document.md" \
  GNU_MDV_V3_HARNESS_ROOT="$project_dir/tests/fixtures" \
  /usr/bin/time -v -o "$recipe_logs/metrics.log" \
  strace -f -e trace=connect -s 160 -o "$recipe_logs/network.log" \
  timeout 30s "$project_dir/src-tauri/target/debug/gnu-mdv" > "$recipe_logs/webview.log" 2>&1 &
recipe_pid=$!
set -e
await_stage theme-ready
gsettings set org.gnome.desktop.interface color-scheme prefer-dark
await_stage dark-observed
gsettings set org.gnome.desktop.interface color-scheme prefer-light
await_stage light-observed
await_stage size-ready
recipe_scale=${GDK_SCALE:-1}
wmctrl -r 'GNU-MD Viewer' -b remove,maximized_vert,maximized_horz
wmctrl -r 'GNU-MD Viewer' -e "0,0,72,$((640 * recipe_scale)),$((480 * recipe_scale))"
set +e
wait "$recipe_pid"
status=$?
popd >/dev/null
set -e
printf 'Preuves V3 : %s\n' "$recipe_logs"
cat "$recipe_logs/webview.log"
test "$status" -eq 124
report=$(rg 'L09_WEBVIEW_REPORT:l09-report-v3_' "$recipe_logs/webview.log")
if [[ -n "${GNU_MDV_V3_EXPECT_SCALE:-}" ]]; then
  rg -q "L09_WEBVIEW_REPORT:l09-report-v3-stage-scale-${GNU_MDV_V3_EXPECT_SCALE}" "$recipe_logs/webview.log"
fi
if [[ "$report" == *-fail* ]]; then
  printf 'Échec de la recette V3.\n' >&2
  exit 1
fi
for check in image hostile tasks anchor note back hide toc dark light palette zoom reset failure relative return encoded fragment outside root parent headings keyboard namespace missing tocfocus scroll jumps sectionreset systemdark systemlight zoommin zoommax zoomstable narrow rtl extensions alerts alertstyles falsealerts extnotes extsecure extback extheading extreturn revoked; do
  [[ "$report" == *"${check}-ok"* ]]
done
if rg 'sa_family=AF_INET6?' "$recipe_logs/network.log"; then
  printf 'Connexion IP inattendue.\n' >&2
  exit 1
fi
sha256sum --check "$recipe_logs/source-before.sha256"
rg 'Maximum resident set size' "$recipe_logs/metrics.log"
printf 'Recette V3 réussie, aucune connexion IP observée, sources inchangées.\n'
