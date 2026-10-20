#!/bin/sh
# Reproduce CI visuals without sharing macOS node_modules or build outputs with Linux.
set -eu
cd "$(dirname "$0")/.."
repository_root="$PWD"
container_image=$(python3 -c 'import json; print(json.load(open("scripts/playwright-container.json"))["image"])')
mkdir -p tests/e2e/__screenshots__/linux-x64 visual-results
# 'record' generates missing Linux baselines; 'check' must match the reviewed files.
visual_mode=${1:-check}
case "$visual_mode" in record|check) ;; *) echo "Usage: sh scripts/linux-visuals.sh [record|check]" >&2; exit 2;; esac
if [ "$visual_mode" = record ] && [ -n "$(find tests/e2e/__screenshots__/linux-x64 -name '*.png' -print -quit)" ]; then
  echo "Refusing to overwrite existing Linux PNGs. Use check; baseline replacement requires review." >&2
  exit 2
fi
# Source is read-only. Container dependencies/builds live only in its disposable filesystem.
docker run --rm --init --ipc=host --platform linux/amd64 \
  --name ourform-linux-visuals \
  --mount "type=bind,source=$repository_root,target=/source,readonly" \
  --mount "type=bind,source=$repository_root/tests/e2e/__screenshots__/linux-x64,target=/visual-output" \
  --mount "type=bind,source=$repository_root/visual-results,target=/results" \
  --env CI=true --env PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 --env "OURFORM_VISUAL_MODE=$visual_mode" \
  "$container_image" /bin/bash -c '
set -euo pipefail
mkdir -p /work/ourform
cd /source
tar --exclude="./.git" --exclude="node_modules" --exclude="dist" --exclude=".turbo" --exclude="coverage" --exclude="./test-results" --exclude="./playwright-report" --exclude="./benchmark-results" --exclude="./visual-results" -cf - . | tar -C /work/ourform -xf -
cd /work/ourform
npx --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm install --frozen-lockfile
npx --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm build
visual_filter="conformance states and visual snapshot|read-only prevents text, checkbox and Rating edits|Bootstrap preset works with the real Bootstrap 5 stylesheet installed|Bootstrap 4 .* with real framework CSS"
: > /results/generation.log
: > /results/themes.log
set +e
if [ "$OURFORM_VISUAL_MODE" = record ]; then
  npx --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm exec playwright test tests/e2e/themes.spec.ts --workers=1 --grep "$visual_filter" --update-snapshots=all > /results/generation.log 2>&1
  result=$?
  cat /results/generation.log
else result=0
fi
if [ "$result" -eq 0 ]; then
  npx --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm exec playwright test tests/e2e/themes.spec.ts --workers=1 --grep "$visual_filter" > /results/themes.log 2>&1
  result=$?
fi
set -e
cat /results/themes.log
cp -R test-results /results/ 2>/dev/null || true
if [ "$result" -eq 0 ]; then cp -R tests/e2e/__screenshots__/linux-x64/. /visual-output/; fi
exit "$result"
'
