#!/bin/bash
set -euo pipefail
arm=$1
cd /work/$arm
cat > playwright.profile.config.ts <<'TS'
import all from './playwright.config';
export default { ...all, webServer: all.webServer.filter(server=>server.url==='http://127.0.0.1:4173'), reporter: [['list'],['/evidence/steps.cjs']] };
TS
export PROFILE_STEPS=/evidence/$arm${2:+-$2}-steps.jsonl
export CI=true PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
npx --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm exec playwright test tests/e2e/builder-task${2:+-$2}.spec.ts --config=playwright.profile.config.ts --project=webkit --workers=1 > /evidence/$arm${2:+-$2}-task.log 2>&1
