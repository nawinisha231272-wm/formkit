# 09 — Engineering standards

Status: normative. `pnpm verify` enforces most of these.

| Area          | Standard                                                                                                                                                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toolchain     | Node 22 LTS+; pnpm pinned in `packageManager`; TypeScript pinned in root devDependencies; no global tools                                                                                                                  |
| TypeScript    | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `isolatedModules`; no `any` in public API; no `DOM` lib for schema/core/validation/builder-core                                |
| Module format | ESM only; `exports` map; `sideEffects: false`; `.d.ts` emitted                                                                                                                                                             |
| Builds        | tsup (or Vite library mode) per package; Angular with ng-packagr; `dist/` git-ignored                                                                                                                                      |
| Boundaries    | ESLint import rules per `00-architecture.md`; cross-package imports by package name only; no cycles                                                                                                                        |
| Unit tests    | Vitest; Node environment for headless packages, happy-dom/jsdom for renderer; ≥ 90% lines in core and validation                                                                                                           |
| Fixtures      | `fixtures/forms/*.json` shared by all suites; each fixture has `*.data.json` (good) and `*.invalid.json` (bad) where relevant                                                                                              |
| Conformance   | `@ourform/testing`: core suite, component suite, renderer/host suite, theme suite                                                                                                                                          |
| E2E + a11y    | Playwright (Chromium, Firefox, WebKit) on playground and examples; @axe-core/playwright: zero serious/critical                                                                                                             |
| Performance   | PR hard gate: exact processor/DOM/render work counts for 100/500/1,000 fields and onboarding; isolated five-pair main/PR A/B timings advisory; nightly >20% for three consecutive nights opens/updates an issue (ADR-0010) |
| Size          | size-limit budget per package; raising a budget needs an ADR                                                                                                                                                               |
| Security      | No `eval`/`new Function`/`innerHTML` with untrusted text; sanitize Content HTML (allow-list); URLs limited to http, https, mailto, tel; reject prototype-polluting keys; fuzz definitions and expressions (M11)            |
| Network       | No package performs network I/O except through host-configured providers                                                                                                                                                   |
| i18n          | Message keys with English defaults; RTL in theme suite                                                                                                                                                                     |
| Versioning    | Changesets; fixed version across `@ourform/*` until 1.0                                                                                                                                                                    |
| Docs          | Package README per package; spec updated with contract changes; ADRs in `docs/adr`                                                                                                                                         |
| Git           | Conventional commits; branch per milestone `mNN-slug`; PR body lists acceptance criteria PASS/FAIL                                                                                                                         |
| CI            | GitHub Actions: frozen install → lint → typecheck → build → test → e2e → size; bench on main                                                                                                                               |

## Performance policy — revised 2026-10-20 (ADR-0010)

This supersedes the M07/housekeeping 20% wall-clock PR and local-verify hard gate. Historical platform
baselines and failed-run records are preserved. No correctness, pixel, coverage or size check is relaxed.

`pnpm verify` runs all existing correctness checks plus `pnpm benchmark:counts`: 25 edits for each
100/500/1,000-field fan-out fixture and onboarding. Store exact processor runs per edit, DOM nodes
created/replaced per edit, StatePatches per edit and renders per StatePatch in
`docs/performance/work-counts.json`. Any increase fails. A decrease requires a baseline update in the
same PR; no automatic recording or tolerance is permitted. Tests instrument actual work and preserve
focus/identity/cleanup assertions. The 100-row grid fixture arrives with M10.

`pnpm benchmark:check` runs standalone timings with the original correctness assertions and advisory
platform-baseline ratios. It is not part of verify. PR timing runs on its own runner/job with no other
checks: prepare main and PR production builds, alternate main → PR for at least five pairs on that
same runner, and report the median paired ratio per size/metric in the job summary. Timing is advisory,
never a PR failure; unavailable reports are explicit. The original Vite timing workload is unchanged.

Nightly main runs alone at 07:17 UTC using the pinned Linux image/runner and original Vite serving mode.
Compare only to the linux-x64 baseline. Persist per-metric streaks by UTC date, platform and baseline
identity. Open/update a GitHub issue for >20% on three consecutive nights; gaps, recovery or a changed
baseline reset the streak, and rerunning a date never advances it. Manual dispatch does not advance
streaks or modify issues. The repository default branch must be main for GitHub's scheduled trigger.

Visual baselines continue selecting exact platform/architecture. Linux generation and CI use the same
digest-pinned official Playwright image matching the package version. Bootstrap 4 is fully supported
for 1.0; every new component passes conformance and visual checks in base/Bootstrap 4/Bootstrap 5/Tailwind.

This change's initial CI run must pass before merge. Do not re-run CI to obtain green; fix causes with
code/tests and preserve failure evidence when a check fails.

Build preparation runs on a separate runner and transfers immutable artifacts. The timing runners
perform only dependency/setup, artifact loading and their timing workload; no builds or correctness
checks execute on those measurement runners.

PR baseline evolution is checked against its immutable main/base SHA: raising expected counts or
removing an existing fixture fails even if the measurements match the edited JSON. Decreases remain
allowed only with exact updated expectations and matching measurements in that PR. The initial
baseline is explicitly seeded because the prior main revision has no count artifact.

### M09b+ one-time owner size reset (2026-10-28)

ADR-0018/0020 record the owner-approved additional planning/Data lazy boundaries and measured
ceilings: builder UI initial (excludes builder-core) **31,600**, builder-core marginal consumer
contribution **7,300**, full initial closure **67,400**, standalone builder package **31,600** Brotli
bytes. New lazy closure ceilings are planning **1,750** and Data **300**, including each Retry closure.
Existing per-feature/aggregate and correctness gates remain enforced. No further byte-hunting in
M09b+; remaining polish must fit. From M09c on, each milestone proposes initial/lazy size allowances
for owner approval before implementation. Historical measurements and failed probes are retained.
