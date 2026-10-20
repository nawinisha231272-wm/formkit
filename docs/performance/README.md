# Work counts and advisory timing

Current policy: [ADR-0010](../adr/0010-deterministic-count-gates-and-advisory-timing.md). It supersedes
the old wall-clock PR hard gate after documented 40–70% runner noise. All original timing artifacts and
failed-run records remain in this repository and docs/progress.md.

## Deterministic hard gate

`pnpm verify` runs correctness, accessibility, visuals, coverage, size budgets and `pnpm benchmark:counts`.
The latter performs 25 edits per fixture: 100/500/1,000 fields (one source plus 25 calculated dependents)
and the shared 40-field onboarding form (contact.firstName). Exact expectations live in work-counts.json:

| Fixture          | Processors/edit | Created DOM/edit | Replaced DOM/edit | Patches/edit | Renders/patch |
| ---------------- | --------------- | ---------------- | ----------------- | ------------ | ------------- |
| 100 / 500 / 1000 | 26              | 0                | 0                 | 1            | 26            |
| onboarding       | 1               | 0                | 0                 | 1            | 1             |

Every edit and patch is checked, not an average. Any increase fails. Decreases fail with an explicit
instruction to update the reviewed count baseline in the same PR. No automatic updater runs in CI.
The probe wraps actual portable views and session counters, observes implicit DOM additions and hooks
explicit allocations (including detached nodes). Replacements are previously present node identities
missing after an edit. Hook restoration, implicit replacements/transient allocations, control count, focused-control
identity and cleanup have browser tests. No wall-clock measurement runs in verify.

## Standalone local timing

Build first: `pnpm install --frozen-lockfile && pnpm build`. Run `pnpm benchmark:check` by itself with
other workloads stopped. It retains 3 warm-ups and 15 samples per size, 650 processor assertions,
identity/focus/control-count and cleanup checks. Timing ratios against the exact platform baseline are
advisory; timing changes do not fail the command. Invalid benchmark data/correctness failures still fail.
`pnpm benchmark:record` is an explicit local recording tool, not a way to repair a failing check.
It still refuses a single Linux recording.

| Platform     | Preserved timing artifact   | Provenance                                              |
| ------------ | --------------------------- | ------------------------------------------------------- |
| darwin-arm64 | baselines/darwin-arm64.json | Original M07 local values                               |
| linux-x64    | baselines/linux-x64.json    | Per-metric medians of three clean same-commit main runs |

There is no cross-platform fallback. These files are unchanged by this redesign. The old
performance-policy.json/bootstrap selection helpers remain as historical validation utilities, not
active PR timing enforcement. The original aggregation CLI and API-verified run URLs remain available.
Docker-on-Mac/emulated measurements must never replace a CI baseline.

## Isolated PR A/B job

`.github/workflows/performance.yml` uses an independent pinned Ubuntu/Playwright runner. It prepares
the main/base-SHA and PR production builds, then runs only timings: main → PR → main → PR for five
pairs on that same runner, fresh browser contexts per build. Each size/metric reports the median of
five paired PR/main ratios (not a ratio of medians) in the job summary and advisory-ab-timings artifact.
It does not compare production builds to the historical Vite-dev baseline. Timing is advisory, never
a PR failure. An unavailable report is explicitly labeled and must be investigated rather than called
a measured result. Both build revisions and all pair samples are retained in the artifact.

## Nightly main trend

`.github/workflows/nightly-performance.yml` runs at 07:17 UTC, on main, on its own runner with no other
checks. It uses the original Vite development serving mode and the preserved linux-x64 baseline.
State is an Actions artifact keyed by exact baseline SHA-256/platform/UTC date and each size/metric.
More than 20% for three consecutive nights opens one managed GitHub issue. Later nightly reports update
that issue; recovery is reported without automatically closing it. Human notes outside the managed
section are preserved. Missing nights, recovery and baseline changes reset streaks. Duplicate dates
never advance them. Manual workflow_dispatch measures without advancing streaks or modifying issues.

Only this trusted-main workflow receives issues:write/actions:read. The SDK makes no new network calls.
GitHub's scheduled trigger requires main as the default branch; see the
[GitHub scheduled-workflow reference](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).
State downloads use the [Actions artifact API](https://docs.github.com/en/rest/actions/artifacts#download-an-artifact)
and the pinned image's Python zip reader; no GitHub token is forwarded to the archive storage host.

Tests: tests/ci-performance.test.ts (count changes, paired medians, nightly boundary/streak/reset/issue
behavior), tests/work-counts/counts.spec.ts (actual browser work), and the existing platform/container tests.

Build preparation runs on a separate runner and transfers immutable artifacts. The timing runners
perform only dependency/setup, artifact loading and their timing workload; no builds or correctness
checks execute on those measurement runners.

PR baseline evolution is checked against its immutable main/base SHA: raising expected counts or
removing an existing fixture fails even if the measurements match the edited JSON. Decreases remain
allowed only with exact updated expectations and matching measurements in that PR. The initial
baseline is explicitly seeded because the prior main revision has no count artifact.
