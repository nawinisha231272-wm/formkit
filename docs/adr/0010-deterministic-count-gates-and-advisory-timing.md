# 0010 — Deterministic work gates and advisory wall-clock timing

Status: accepted by user decision 2026-10-20  
Date: 2026-10-20  
Scope: pre-M08 CI; supersedes ADR-0009 and spec 09 only for wall-clock hard-gating

## Context and evidence

Unchanged runtime/workload sources produced roughly **40–70% shared-runner noise**. Against Linux
500-field medians 5.90/52.30/136.20/91.30 ms, the initial enforcing
[PR run](https://github.com/nawinisha231272-wm/formkit/actions/runs/39474015036/attempts/1)
measured 8.40/78.80/194.10/140.80 ms and the
[push run](https://github.com/nawinisha231272-wm/formkit/actions/runs/39474008325/attempts/1)
measured 9.90/90.60/214.00/154.30 ms. Compile increased 42%/68%, theme 54%/69%; mount reached 73%.
A documentation-only retry passed the identical strict gate (PR 5.60/52.70/129.30/87.70 ms), followed
by green main at 4.60/40.60/102.90/64.80 ms. Full local Mac timing also failed then passed in isolation.
See [the preserved progress evidence](../progress.md#initial-required-enforcement-ci-results).
These observations establish variability, not its root cause. Re-running until green is not an
acceptable PR acceptance strategy.

## Options considered

- Raise wall-clock tolerances or re-record the baseline: masks regressions and discards evidence.
- Keep the noisy 20% PR wall-clock hard gate: blocks unchanged code without identifying extra work.
- Hard-gate exact work and retain isolated advisory/trend timings: chosen by the user.

## Decision

`pnpm verify` retains lint, types, builds, coverage, browser/a11y/visual correctness and size budgets,
and runs `pnpm benchmark:counts`. It does not measure wall-clock timings. The work gate exercises
25 edits in each 100/500/1,000-field dependency-fan-out fixture and the shared onboarding fixture.
It stores exact expected processor runs, created/replaced DOM nodes, StatePatch counts and renders
per StatePatch in docs/performance/work-counts.json. Increases fail. Decreases also fail until the
same PR updates the reviewed expectations. No automatic baseline update or platform fallback exists.

DOM creation includes explicit detached allocations and implicit native additions; replacement counts
existing nodes missing after the edit. Portable-view wrappers count actual render invocations, bracketed
by subscribers before/after the renderer for each patch. The gate also preserves control count/identity/focus
and cleanup assertions. These fixtures use synchronous local built-ins; async provider behavior keeps
its existing correctness tests.

PR timing has a separate job/runner with no correctness work. After preparing both production builds,
it alternates main then PR on the same runner for five pairs, with a fresh browser context per build.
Each measurement retains three warm-ups and 15 samples for every size. The summary reports the median
of the five paired PR/main ratios, per size/metric. Timing ratios are advisory and never fail a PR.
Unavailable measurements are explicitly reported, not mislabeled as a measured pass. Local
`pnpm benchmark:check` is a standalone advisory timing command retaining benchmark correctness assertions.

Nightly main timing runs alone at 07:17 UTC. It preserves the original Vite development serving mode
used to record the stored Linux baseline; PR A/B compares production builds to each other, not to that
dev baseline. Nightly state is persisted in Actions artifacts and keyed by the baseline SHA-256,
linux-x64, metric/size and UTC date. Missing nights, recovery and changed baseline identity reset a
streak; duplicate delivery of a date never advances it. Only three consecutive nights more than 20%
over baseline open an issue. Further reports update one managed issue; human notes outside its managed
section are retained. Manual dispatch measures without advancing streaks or modifying issues.

All historical Mac/Linux baseline files and failed-run records remain unchanged. The 20% threshold
remains the nightly trend threshold; it is superseded as a PR/local-verify hard gate. Old policy helpers
remain for historical baseline validation, not as active PR timing enforcement.

## Consequences

Deterministic extra work blocks PRs immediately. Wall-clock regressions remain observable through
paired reports and sustained-night alerts; reviewers can act on advisory evidence. This does not
relax any correctness, accessibility, pixel, coverage or bundle-size check. New components must retain
all-four-theme conformance/visual coverage, including fully supported Bootstrap 4. M10 adds the grid
workload when that component exists.

Build preparation runs on a separate runner and transfers immutable artifacts. The timing runners
perform only dependency/setup, artifact loading and their timing workload; no builds or correctness
checks execute on those measurement runners.

PR baseline evolution is checked against its immutable main/base SHA: raising expected counts or
removing an existing fixture fails even if the measurements match the edited JSON. Decreases remain
allowed only with exact updated expectations and matching measurements in that PR. The initial
baseline is explicitly seeded because the prior main revision has no count artifact.
