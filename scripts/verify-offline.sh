#!/bin/sh
# macOS Phase 0 proof. Dependencies/toolchain must already be installed and cached.
set -eu
cd "$(dirname "$0")/.."
runtime=$(npx --offline --yes --package=node@22.22.3 --package=pnpm@10.10.0 node -p 'process.execPath')
runtime_dir=$(dirname "$runtime")
profile="$PWD/scripts/offline.sb"
/usr/bin/sandbox-exec -f "$profile" "$runtime" scripts/assert-offline.mjs
# Run every package build script directly in dependency order, bypassing Turbo caches/IPC.
/usr/bin/sandbox-exec -f "$profile" /usr/bin/env PATH="$runtime_dir:$PWD/node_modules/.bin:$PATH" TURBO_TELEMETRY_DISABLED=1 \
  "$runtime" node_modules/pnpm/bin/pnpm.cjs -r --workspace-concurrency=4 run build
