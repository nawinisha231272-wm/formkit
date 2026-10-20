# Platform-specific performance baselines

Build first: `pnpm install --frozen-lockfile && pnpm build`.
Run `pnpm benchmark:check`, or start `pnpm --filter @ourform/benchmarks dev` and open
http://127.0.0.1:4190 for interactive measurements.

Baselines are selected by the exact Node platform/architecture (`os.platform()` + `os.arch()`):

| Platform     | Artifact                    | Status                                              |
| ------------ | --------------------------- | --------------------------------------------------- |
| darwin-arm64 | baselines/darwin-arm64.json | Measured M07 local medians, timing values unchanged |
| linux-x64    | baselines/linux-x64.json    | Measured: medians of three clean main CI runs       |

There is no platform fallback. Linux calibration is complete; linuxBaselineRequired=true closes the
bootstrap exception. Both stored platform baselines are now enforced. The user authorized this
temporary Linux bootstrap on 2026-10-20:
while linux-x64 is pending and scripts/performance-policy.json has linuxBaselineRequired=false,
ordinary verification measures and uploads timings, logs **linux baseline missing: not enforced**,
and retains every correctness assertion. This is record-only, not a performance regression verdict.
Mac always enforces its stored baseline. A measured Linux artifact always enforces its own baseline.
Malformed/mismatched data and missing files fail; no cross-platform substitution is allowed.
Docker-on-Mac/emulated measurements cannot populate the CI baseline.

Each size has 3 warm-ups and 15 samples; report timings are medians in ms. Compile, mount plus forced
layout, 25 edits plus layout and two appearance changes plus layout are measured. The 500-field form
includes 25 calculated dependents; each edit batch executes exactly 650 processors. All sizes assert
control count/identity/focus and DOM cleanup. Every 500-field timing must be <= its platform baseline
×1.20. Boundary and cross-platform rejection tests are in tests/performance.test.ts.

## Recording and checking

`pnpm benchmark:record` explicitly records a local platform baseline for review and refuses a single
linux-x64 recording. Checks never rewrite baselines. Reports in benchmark-results/measurement.json
include commit, dirty state, GitHub ref/run ID/attempt, platform and configured runner type.

Merge [PR #1](https://github.com/nawinisha231272-wm/formkit/pull/1) only after all Linux correctness
checks pass: lint, types, build, unit/browser tests, all Linux visuals and size budgets. Its pending
Linux performance stage is explicitly record-only. Then dispatch Verify three times on the same clean
**main** commit, with no intervening code changes, all on ubuntu-24.04. Each full run must succeed.
Download each run's benchmark-results/measurement.json, then:

```sh
node scripts/aggregate-ci-baseline.mjs run1/measurement.json run2/measurement.json run3/measurement.json
```

The CLI uses authenticated `gh api` to verify each run succeeded on main at the measured commit and
its jobs used ubuntu-24.04. It requires three distinct run IDs, clean GitHub Actions linux-x64 reports,
one matching commit, all three sizes, 15 samples and the expected 650 processors. It writes per-metric
medians of the three run medians and the run URLs to baselines/linux-x64.json. Open a second PR on
`ci-linux-baseline`, store those medians and set linuxBaselineRequired=true. This closes the bootstrap
exception: pending or missing Linux data must then fail. Merge that PR only after its own ordinary
CI passes the unchanged >20% limit. Record both PR links, the three runs and medians in progress.md.
Stop before M08. Product questions in progress.md remain unanswered.

The previous M07 single artifact was relocated from docs/performance/m07-baseline.json without
altering its measured values. Absolute timings still depend on hardware, browser, CPU/power and load;
keep the pinned environment and investigate regressions before updating a baseline.
