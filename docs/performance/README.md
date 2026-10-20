# Platform-specific performance baselines

Build first: `pnpm install --frozen-lockfile && pnpm build`.
Run `pnpm benchmark:check`, or start `pnpm --filter @ourform/benchmarks dev` and open
http://127.0.0.1:4190 for interactive measurements.

Baselines are selected by the exact Node platform/architecture (`os.platform()` + `os.arch()`):

| Platform     | Artifact                    | Status                                               |
| ------------ | --------------------------- | ---------------------------------------------------- |
| darwin-arm64 | baselines/darwin-arm64.json | Measured M07 local medians, timing values unchanged  |
| linux-x64    | baselines/linux-x64.json    | **PENDING** — no CI timing values have been invented |

There is no platform fallback. A missing, mismatched or pending baseline fails `benchmark:check`
with an explicit error. The Linux gate remains blocked until calibration is complete; a green
calibration job is not a green performance regression verdict. Never compare Linux to the Mac file.
Docker-on-Mac/emulated measurements cannot populate the CI baseline.

Each size has 3 warm-ups and 15 samples; report timings are medians in ms. Compile, mount plus forced
layout, 25 edits plus layout and two appearance changes plus layout are measured. The 500-field form
includes 25 calculated dependents; each edit batch executes exactly 650 processors. All sizes assert
control count/identity/focus and DOM cleanup. Every 500-field timing must be <= its platform baseline
×1.20. Boundary and cross-platform rejection tests are in tests/performance.test.ts.

## Recording and checking

`pnpm benchmark:record` explicitly records a local platform baseline for review. It refuses a single
linux-x64 recording. Checks never rewrite baselines. `pnpm benchmark:measure` records timings to
benchmark-results/measurement.json without comparing or approving a baseline. It labels the result
**CALIBRATION ONLY**, retains correctness/count/cleanup assertions, and includes commit, dirty state,
GitHub ref/run ID/attempt and platform. No measurement-only mode is enabled for ordinary push/PR CI.

The Verify workflow has an explicit workflow_dispatch `performance_mode: measure` calibration mode.
Run it three times on the same clean **main** commit after that harness is available there. Each full
correctness run must succeed. Download each run's benchmark-results/measurement.json, then:

```sh
node scripts/aggregate-ci-baseline.mjs run1/measurement.json run2/measurement.json run3/measurement.json
```

The CLI uses authenticated `gh api` to verify each referenced workflow run concluded successfully
on main at the measured commit. It requires three distinct run IDs, clean GitHub Actions linux-x64
reports, one matching commit, all three sizes, 15 samples and the expected 650 processors. It writes
per-metric medians of the three run medians, with the CI run URLs, to baselines/linux-x64.json. The
exported pure aggregator can also consume run metadata retrieved through the connected GitHub API.
Review and commit the resulting artifact, then run the ordinary check-mode CI. No automatic merge or
baseline replacement occurs. GitHub CLI API access is available; the three clean main measurements
remain pending. Main still has the M07 workflow without this harness. Landing the harness on main
requires a separately approved bootstrap if the housekeeping PR itself must wait for these main
measurements. Do not merge or bypass the pending budget to resolve that sequencing requirement.

The previous M07 single artifact was relocated from docs/performance/m07-baseline.json without
altering its measured values. Absolute timings still depend on hardware, browser, CPU/power and load;
keep the pinned environment and investigate regressions before updating a baseline.
