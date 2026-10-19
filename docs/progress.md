# Progress log

Maintained by whoever builds a milestone (human or agent). Newest entry at the top.
For each milestone: plan, what was built, acceptance criteria with PASS/FAIL + evidence,
deviations from spec, open questions.

## Current state

- Starting point: `ourform-phase0` starter kit (5 packages, relative imports, 3 Node tests passing
  with TypeScript 5.8). See the "Starter kit review" in the build specification for the nine known issues.
- **M00 complete** — clean installation and full verification pass.
- Next milestone after M00: **M01 — Schema and core engine**.

## Open questions

_None yet. Add questions here instead of guessing at a contract._

## Log

_No milestones completed yet._

## M00 plan — 2026-10-19

1. Separate schema, headless models and SDK views; preserve starter behavior.
2. Add pinned pnpm, Turbo, strict package builds, boundaries and tests.
3. Move playground to Vite; add fixture, browser smoke checks and CI.
4. Verify from a clean install and record evidence.

Risks: starter renderer accessibility and required Rating remain later-milestone work. The referenced nine-issue review is absent from the supplied kit.

## M00 — Workspace foundation

Implemented six ESM packages with exports and declarations, pnpm 10.10.0 lockfile, Turbo dependency ordering,
strict TypeScript, tsup, Vitest projects, Playwright/axe, ESLint import boundaries, Prettier, size-limit,
Changesets and GitHub Actions. Playground runs through Vite and shares the feedback fixture with tests.
Core now consumes headless models; SDK definitions pair models with portable views. No external runtime
dependencies were added. Package READMEs and ADR-0001 document the transitional API.

### Acceptance evidence

- PASS — original three behaviors: `tests/starter.test.ts` (registry/defaults/validation/subscriptions,
  duplicate type, duplicate key), all three tests passing.
- PASS — core has no DOM lib or SDK dependency: package tsconfig, `pnpm build`, `pnpm typecheck`.
  Additional headless lifecycle tests run in Node; core line coverage is 100% (required minimum 90%).
- PASS — relative cross-package and forbidden direction imports rejected by ESLint:
  `tests/boundaries.test.ts`, two deliberate probes against the real flat config.
- PASS — Vite smoke flow: Text, Rating, theme data preservation, validation and generated property changes
  pass in Chromium, Firefox and WebKit. axe reports zero serious/critical violations in this flow.
- PASS — all six initial packages are below their ADR-recorded 30 kB Brotli budgets: `pnpm size`.
- PASS — `git check-ignore` confirms root and nested dist, dependencies, coverage, Turbo and test output are ignored.
- PASS — full `pnpm verify` (lint, build, typecheck including tests/configs, six unit tests, three browser cases, size).
- PASS — removed every workspace node_modules/dist/.turbo directory and coverage; `CI=true npx pnpm@10.10.0 install --frozen-lockfile` followed by `npx pnpm@10.10.0 verify` succeeds (six unit tests, 100% core lines, three browser cases, six size budgets). This proves a clean local installation; remote-clone CI has not run yet.

### Deviations and limits

- Added keyboard access to the playground's scrollable JSON/output panels after Firefox axe found a serious violation.
- Vitest uses `projects`, its supported workspace configuration, rather than a deprecated workspace file.
- The shell-provided pnpm wrapper runs a different version; checks use `npx pnpm@10.10.0` and local pinned tools.
- Full renderer accessibility and reconciliation are still M02/M03 work; the smoke scan is not full conformance.
- Required Rating retains the starter's zero-empty behavior until M02 as required by M00's behavior-preservation scope.
- Supplied documentation references a nine-issue review and commercial open decisions that are absent from the archives.
- No milestone beyond M00 has been implemented.
- GitHub connector returns 404; GitHub CLI has no authenticated account. A PR cannot currently be opened.

### Review summary — M00: Workspace foundation

This change replaces global-tool starter setup with a reproducible monorepo and preserves the existing demo.
Use `pnpm install --frozen-lockfile`, install Playwright browsers, then `pnpm verify` and `pnpm dev`.
The acceptance checklist above serves as the PR summary while authenticated GitHub access is unavailable.
