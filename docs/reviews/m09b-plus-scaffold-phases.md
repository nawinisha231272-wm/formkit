# M09b+ scaffold phase measurements — 2026-10-30

Status: **measured, harness corrected; approved independent proofs implemented**. All times below are seconds, two
counterbalanced main/branch samples on the same darwin-arm64 host with Node 22.22.3 and
pnpm 10.10.0. Main is verified `0b3b452`; branch is 7885dca plus the recorded owner-fix draft.
Each fresh project runs its unmodified generated `pnpm verify`; streaming command headers delimit
build/typecheck/Node/browser phases. Complete exports/assets, fresh-cache install and frozen/offline
reinstall are checked. Each component/plugin has 18 browser tests; theme has 21, on both revisions.

The first experiment accidentally used stale local main `485c7db`. It is explicitly discarded;
its results are retained separately and excluded from these tables and deadline calculations.

## Phase medians (two samples; diagnostics, not performance gates)

| Scaffold  | Revision | Pack | Install | Offline | Build | Typecheck | Node | Browser | Total |
| --------- | -------- | ---: | ------: | ------: | ----: | --------: | ---: | ------: | ----: |
| component | main     | 4.29 |    2.37 |    1.34 |  2.79 |      2.51 | 2.39 |   37.62 | 54.57 |
| component | branch   | 5.15 |    2.95 |    1.39 |  2.82 |      1.88 | 2.08 |   35.54 | 53.40 |
| theme     | main     | 4.50 |    2.43 |    1.46 |  2.60 |      2.97 | 2.46 |   36.02 | 53.88 |
| theme     | branch   | 3.76 |    2.57 |    1.64 |  2.47 |      2.50 | 2.37 |   38.11 | 55.12 |
| plugin    | main     | 4.25 |    4.01 |    1.63 |  4.61 |      2.17 | 2.13 |   33.40 | 53.77 |
| plugin    | branch   | 3.92 |    2.67 |    1.45 |  2.86 |      3.07 | 2.59 |   41.31 | 59.74 |

Totals also include export/asset checking, generation, node_modules removal, verify startup and
cleanup. Every raw phase/sample is in `m09b-plus-scaffold-phase-evidence/before-worker-fix.json`.
These paired diagnostics have host variance and do not alone establish a library regression.

## What got slower and the proposed fix

Plugin browser median: **33.40 → 41.31 s**; total **53.77 → 59.74 s**. Component total falls
**54.57 → 53.40 s**; theme changes **53.88 → 55.12 s**. Pack/install are not a consistent
regression: component pack/install are modestly slower; theme/plugin packing and plugin install
are faster. Typecheck/Node changes are mixed.

The kit grows **217,691 → 476,207 bytes**. New full-builder (**252,132 bytes**) and themes
(**2,082 bytes**) archives explain most of the 258,516-byte difference. Every entry, lazy asset
and map stays covered. Per-theme CDN app bundles are outside this SDK kit. The mini-builder
uses builder-core, not the full builder UI; that added UI archive is not on its browser path.

A concrete harness difference is **one browser worker on main versus two on this branch**. Plugin
and component previews exercise the same field fixture and 18 browser checks. Before absorbing
the slower browser phase in a deadline, restore the generated scaffold to main’s one worker and
re-measure. This bounds competing browser processes, retaining all browser/theme/axe/editor
assertions and the 30-second browser deadline.

## Formula before the proposed harness fix

Use the slowest complete branch sample, including pack/checks/cleanup; multiply the unrounded
time by two, round up to 10 seconds, and cap at 120 seconds. These are provisional, not shipped:

| Scaffold  | Slowest measured | Rounded 2× | Capped deadline |
| --------- | ---------------: | ---------: | --------------: |
| component |         53.695 s |      110 s |           110 s |
| theme     |         55.171 s |      120 s |           120 s |
| plugin    |         63.901 s |      130 s |           120 s |

**Sum: 350 s versus the old collective 180 s.** Plugin’s cap binds. Final deadlines use the post-fix measurements; none gets an automatic 180 seconds.

At the pre-fix measurement stage no scaffold had been split. That historical proposal is superseded
by the implemented split and final deadlines below. No push until navigation diagnosis and full
pinned verify pass. Exact drivers and phase logs are retained beside this report.

## Post-fix measurements and final deadlines

Generated scaffolds now use **one worker**, matching main. Every export, packed asset, fresh-cache
install, offline reinstall, build, typecheck, Node, browser, axe and property-editor assertion remains.
The proof is split into three independent tests, each packing/checking a complete kit and using its
own temporary project/cache. No shared fixture timeout or hidden retry is added.

One quieter branch sample and a later main/branch pair were measured after this change. The host
also slowed on unchanged main: the later main totals alone sum to **220.416 s** before removing
repeated packing, already exceeding the old collective 180 s. Browser/startup phases vary markedly;
these measurements do not establish a package-caused performance regression. The worker change
bounds concurrent browser processes, but is not claimed to explain all elapsed-time variation.

| Scaffold  | Revision / sample |  Pack | Install | Offline | Build | Typecheck |  Node | Browser |  Total |
| --------- | ----------------- | ----: | ------: | ------: | ----: | --------: | ----: | ------: | -----: |
| component | branch / 2        | 2.872 |   2.937 |   1.121 | 2.262 |     1.586 | 1.736 |  28.094 | 41.893 |
| theme     | branch / 2        | 1.878 |   2.021 |   0.815 | 2.369 |     1.580 | 1.613 |  29.669 | 41.061 |
| plugin    | branch / 2        | 1.894 |   1.992 |   0.812 | 2.256 |     1.587 | 1.622 |  28.526 | 39.811 |
| component | main / 3          | 4.483 |   2.473 |   0.825 | 2.519 |     1.699 | 1.832 |  62.603 | 77.919 |
| component | branch / 3        | 5.266 |   3.494 |   1.971 | 5.001 |     4.463 | 9.941 |  51.028 | 83.492 |
| theme     | main / 3          | 5.772 |   4.141 |   2.314 | 4.924 |     2.453 | 2.361 |  43.839 | 67.842 |
| theme     | branch / 3        | 5.124 |   3.813 |   1.593 | 2.542 |     2.324 | 2.451 |  45.382 | 65.579 |
| plugin    | main / 3          | 5.102 |   4.226 |   3.734 | 6.125 |     4.247 | 2.518 |  46.659 | 74.655 |
| plugin    | branch / 3        | 4.158 |   3.749 |   1.941 | 3.635 |     3.130 | 3.308 |  49.946 | 72.130 |

The larger kit is disclosed above; packing/install changes are mixed, including improvements on
this branch in the later pair. No package or asset is omitted to improve a timing. The observed
browser-worker difference is fixed rather than simply granted more time.

For each scaffold take the **slowest complete post-fix branch measurement**, including pack and
cleanup. Apply the owner's exact formula: `min(120, ceil(2 × seconds / 10) × 10)`.

| Scaffold  | Measured seconds | 2× rounded to 10 s | Final capped deadline |
| --------- | ---------------: | -----------------: | --------------------: |
| component |        83.491558 |              170 s |                 120 s |
| theme     |        65.578593 |              140 s |                 120 s |
| plugin    |        72.129826 |              150 s |                 120 s |

**Sum: 360 s (three 120 s caps) versus the former collective 180 s.** Every cap binds; none is
180 s. Each browser case remains at its existing 30 s deadline, with zero retries. This is an
explicit owner-approved granularity/allowance change, not an undisclosed test expectation edit.
See `all-samples.json`, `final-deadlines.json` and the raw compressed phase logs. All 21 measured
scaffold proofs passed; final root verification remains required before push.
