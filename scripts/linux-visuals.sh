#!/bin/sh
# Reproduce CI visuals without sharing macOS node_modules or build outputs with Linux.
set -eu
cd "$(dirname "$0")/.."
repository_root="$PWD"
container_image=$(python3 -c 'import json; print(json.load(open("scripts/playwright-container.json"))["image"])')
mkdir -p tests/e2e/__screenshots__/linux-x64 visual-results
# Record is allowed only for an empty selected suite; check compares reviewed files.
visual_mode=${1:-check}
visual_suite=${2:-themes}
case "$visual_mode" in record|check) ;; *) echo "Usage: sh scripts/linux-visuals.sh [record|check]" >&2; exit 2;; esac
visual_snapshot_pattern="*.png"
case "$visual_suite" in
  workbench) visual_snapshot_dir=tests/e2e/__screenshots__/linux-x64/builder-visual.spec.ts ;;
  material) visual_snapshot_dir=tests/e2e/__screenshots__/linux-x64/themes.spec.ts ; visual_snapshot_pattern="material-*.png" ;;
  themes) visual_snapshot_dir=tests/e2e/__screenshots__/linux-x64 ;;
  author) visual_snapshot_dir=tests/e2e/__screenshots__/linux-x64/authoring.spec.ts ;;
  boolean) visual_snapshot_dir=tests/e2e/__screenshots__/linux-x64/nullable-boolean.spec.ts ;;
  m09) visual_snapshot_dir=tests/e2e/__screenshots__/linux-x64/tabs.spec.ts ;;
  builder) visual_snapshot_dir=tests/e2e/__screenshots__/linux-x64/builder-hosts.spec.ts ;;
  tabs) visual_snapshot_dir=tests/e2e/__screenshots__/linux-x64/tabs.spec.ts ;;
  sdk) visual_snapshot_dir=tests/e2e/__screenshots__/linux-x64/sdk-extensions.spec.ts ;;
  *) echo "Usage: sh scripts/linux-visuals.sh [record|check] [themes|material|workbench|sdk|author|boolean|tabs|builder|m09]" >&2; exit 2;;
esac
mkdir -p "$visual_snapshot_dir"
if [ "$visual_mode" = record ] && [ -n "$(find "$visual_snapshot_dir" -name "$visual_snapshot_pattern" -print -quit)" ]; then
  echo "Refusing to overwrite existing Linux PNGs. Use check; baseline replacement requires review." >&2
  exit 2
fi
if [ "$visual_mode" = record ] && [ "$visual_suite" = m09 ] && [ -n "$(find tests/e2e/__screenshots__/linux-x64/builder-hosts.spec.ts -name '*.png' -print -quit 2>/dev/null)" ]; then
  echo "Refusing to overwrite existing builder PNGs. Use check." >&2
  exit 2
fi
# Source is read-only. Container dependencies/builds live only in its disposable filesystem.
docker run --rm --init --ipc=host --platform linux/amd64 \
  --name ourform-linux-visuals \
  --mount "type=bind,source=$repository_root,target=/source,readonly" \
  --mount "type=bind,source=$repository_root/tests/e2e/__screenshots__/linux-x64,target=/visual-output" \
  --mount "type=bind,source=$repository_root/visual-results,target=/results" \
  --env CI=true --env PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 --env "OURFORM_VISUAL_MODE=$visual_mode" \
  --env "OURFORM_VISUAL_SUITE=$visual_suite" \
  "$container_image" /bin/bash -c '
set -euo pipefail
mkdir -p /work/ourform
cd /source
tar --exclude="./.git" --exclude="node_modules" --exclude="dist" --exclude=".turbo" --exclude="coverage" --exclude="./test-results" --exclude="./playwright-report" --exclude="./benchmark-results" --exclude="./visual-results" -cf - . | tar -C /work/ourform -xf -
cd /work/ourform
npx --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm install --frozen-lockfile
npx --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm build
visual_filter="conformance states and visual snapshot|read-only prevents text, checkbox and Rating edits|Bootstrap preset works with the real Bootstrap 5 stylesheet installed|Bootstrap 4 .* with real framework CSS"
visual_file=tests/e2e/themes.spec.ts
if [ "$OURFORM_VISUAL_SUITE" = workbench ]; then visual_file=tests/e2e/builder-visual.spec.ts; visual_filter="approved screen"; fi
if [ "$OURFORM_VISUAL_SUITE" = material ]; then visual_filter="material .*conformance states|material: read-only"; fi
if [ "$OURFORM_VISUAL_SUITE" = sdk ]; then visual_file=tests/e2e/sdk-extensions.spec.ts; visual_filter="SDK composites/presets"; fi
if [ "$OURFORM_VISUAL_SUITE" = author ]; then visual_file=tests/e2e/authoring.spec.ts; visual_filter="authoring:"; fi
if [ "$OURFORM_VISUAL_SUITE" = boolean ]; then visual_file=tests/e2e/nullable-boolean.spec.ts; visual_filter="nullable boolean:"; fi
if [ "$OURFORM_VISUAL_SUITE" = tabs ]; then visual_file=tests/e2e/tabs.spec.ts; visual_filter="visual conformance"; fi
if [ "$OURFORM_VISUAL_SUITE" = builder ]; then visual_file=tests/e2e/builder-hosts.spec.ts; visual_filter="visual conformance"; fi
# Only screenshot cases belong to image recording; full pnpm verify retains every functional/axe case.
run_visual() {
  local snapshot_args=()
  if [ "$1" = record ]; then snapshot_args=(--update-snapshots=all); fi
  if [ "$OURFORM_VISUAL_SUITE" = m09 ]; then
    npx --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm exec playwright test tests/e2e/tabs.spec.ts --workers=1 --max-failures=1 --grep "visual conformance" "${snapshot_args[@]}" || return $?
    npx --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm exec playwright test tests/e2e/builder-hosts.spec.ts --project=chromium --workers=1 --max-failures=1 --grep "visual conformance" "${snapshot_args[@]}"
  else
    local project_args=()
    if [ "$OURFORM_VISUAL_SUITE" = builder ] || [ "$OURFORM_VISUAL_SUITE" = workbench ]; then project_args=(--project=chromium); fi
    npx --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm exec playwright test "$visual_file" --workers=1 --max-failures=1 --grep "$visual_filter" "${project_args[@]}" "${snapshot_args[@]}"
  fi
}
: > /results/generation.log
: > /results/themes.log
set +e
if [ "$OURFORM_VISUAL_MODE" = record ]; then
  run_visual record > /results/generation.log 2>&1
  result=$?
  cat /results/generation.log
else result=0
fi
if [ "$result" -eq 0 ]; then
  run_visual check > /results/themes.log 2>&1
  result=$?
fi
set -e
cat /results/themes.log
cp -R test-results /results/ 2>/dev/null || true
if [ "$result" -eq 0 ]; then cp -R tests/e2e/__screenshots__/linux-x64/. /visual-output/; fi
exit "$result"
'
