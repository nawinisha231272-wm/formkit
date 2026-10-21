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
case "$visual_suite" in
  themes) visual_snapshot_dir=tests/e2e/__screenshots__/linux-x64 ;;
  author) visual_snapshot_dir=tests/e2e/__screenshots__/linux-x64/authoring.spec.ts ;;
  boolean) visual_snapshot_dir=tests/e2e/__screenshots__/linux-x64/nullable-boolean.spec.ts ;;
  m09) visual_snapshot_dir=tests/e2e/__screenshots__/linux-x64/tabs.spec.ts ;;
  builder) visual_snapshot_dir=tests/e2e/__screenshots__/linux-x64/builder-hosts.spec.ts ;;
  tabs) visual_snapshot_dir=tests/e2e/__screenshots__/linux-x64/tabs.spec.ts ;;
  sdk) visual_snapshot_dir=tests/e2e/__screenshots__/linux-x64/sdk-extensions.spec.ts ;;
  *) echo "Usage: sh scripts/linux-visuals.sh [record|check] [themes|sdk|author|boolean|tabs|builder|m09]" >&2; exit 2;;
esac
mkdir -p "$visual_snapshot_dir"
if [ "$visual_mode" = record ] && [ -n "$(find "$visual_snapshot_dir" -name '*.png' -print -quit)" ]; then
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
if [ "$OURFORM_VISUAL_SUITE" = sdk ]; then visual_file=tests/e2e/sdk-extensions.spec.ts; visual_filter="SDK composites/presets"; fi
if [ "$OURFORM_VISUAL_SUITE" = author ]; then visual_file=tests/e2e/authoring.spec.ts; visual_filter="authoring:"; fi
if [ "$OURFORM_VISUAL_SUITE" = boolean ]; then visual_file=tests/e2e/nullable-boolean.spec.ts; visual_filter="nullable boolean:"; fi
if [ "$OURFORM_VISUAL_SUITE" = tabs ]; then visual_file=tests/e2e/tabs.spec.ts; visual_filter="visual conformance"; fi
if [ "$OURFORM_VISUAL_SUITE" = builder ]; then visual_file=tests/e2e/builder-hosts.spec.ts; visual_filter="builder .*Tabs"; fi
visual_files=("$visual_file")
if [ "$OURFORM_VISUAL_SUITE" = m09 ]; then visual_files=(tests/e2e/tabs.spec.ts tests/e2e/builder-hosts.spec.ts); visual_filter="visual conformance|builder .*Tabs"; fi
: > /results/generation.log
: > /results/themes.log
set +e
if [ "$OURFORM_VISUAL_MODE" = record ]; then
  npx --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm exec playwright test "${visual_files[@]}" --workers=1 --grep "$visual_filter" --update-snapshots=all > /results/generation.log 2>&1
  result=$?
  cat /results/generation.log
else result=0
fi
if [ "$result" -eq 0 ]; then
  npx --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm exec playwright test "${visual_files[@]}" --workers=1 --grep "$visual_filter" > /results/themes.log 2>&1
  result=$?
fi
set -e
cat /results/themes.log
cp -R test-results /results/ 2>/dev/null || true
if [ "$result" -eq 0 ]; then cp -R tests/e2e/__screenshots__/linux-x64/. /visual-output/; fi
exit "$result"
'
