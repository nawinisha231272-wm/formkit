# M09b — isolated 500-field drag trace

Measured on macOS arm64 with Node 22.22.3, pnpm 10.10.0 and Playwright 1.56.1 Chromium.
These are local trace observations, not Linux runner baselines or cross-platform comparisons.
Run this command on its own, without another build/test/benchmark:

```sh
npx --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm benchmark:builder
```

The separate command records the actual Chromium `devtools.timeline`/top-level events. It does not
run in `pnpm verify`: PR hard performance gates remain deterministic counts, and wall-clock CI stays
advisory under the owner's redesign. The milestone's 50ms acceptance requires inspecting actual data;
zero recorded tasks is a harness failure, not evidence of success.

Both traces include pickup, 80 pointer moves, real 48px edge auto-scroll and geometry invalidation.
Durations include complete tasks that overlap pickup through the end of active movement, rather
than hiding pickup behind an already-dragging marker. Pickup elapsed time includes multiple tasks,
protocol calls and frames; it is not one uninterrupted main-thread task. Escape preserves the exact
schema and history. An existing field becomes selected on pickup, as expected.

| Source  | Moves | Pickup elapsed (ms) | Active interval (ms) | Largest overlapping task (ms) | Tasks >50ms |
| ------- | ----: | ------------------: | -------------------: | ----------------------------: | ----------: |
| palette |    80 |              72.436 |             1376.133 |                        47.981 |           0 |
| field   |    80 |              38.505 |             1383.720 |                        15.856 |           0 |

Evidence: `/tmp/m09b-builder-drag-selection-fix.log`, and ignored reproducible artifacts under
`benchmark-results/builder-drag/darwin-arm64/{palette,field}/{report,trace}.json`.
Trace SHA-256 digests:

- `palette/trace.json`: `bc9019aa896a53967cedccf1e84a6cdae4ac328fb96ea7d674c3c9890e22954c`
- `field/trace.json`: `ce5bb51d00a54adb44f795b2cb00a63b4f85fae730b11114ee1f8f0d1e8ff5a9`

## Retained failures and fixes

- Initial palette pickup had a **127.921ms** main-thread task, with 69.65ms of style recalculation.
  Changing inherited `user-select`/cursor on the whole builder invalidated thousands of descendants.
  Selection suppression is now static on design/palette/outline surfaces; drag cursor styles are local.
  Original trace/report: `trace-before-pickup-fix.json` and `report-before-pickup-fix.json` in the platform
  artifact directory. `/tmp/m09b-builder-drag.log` initially reported only active moves; analysis caught
  the excluded pickup, and the collector was corrected before claiming acceptance.
- Extending the workload to an existing field caught a **53.985ms** task. Selection now avoids writing
  unchanged attributes, caches field roots and does not lay out hidden toolbars. Before-fix traces/reports
  remain in `palette-before-selection-paint-fix` and `field-before-selection-paint-fix`; the log is
  `/tmp/m09b-builder-drag-final.log`. No timing threshold was raised, and neither trace was discarded.

Final observed verdict: **PASS on this machine**, both sources below 50ms. This is not a guarantee
against unrelated OS/browser scheduling noise on another machine. No existing baseline or runner
calibration changed, and the trace command does not turn advisory timing into a PR correctness gate.

## Owner-review follow-up — 2026-10-22

After the owner-review product changes, the same isolated pinned `CI=true pnpm benchmark:builder`
passes both sources (`/tmp/m09b-review-drag-benchmark.log`). For 500 fields and 80 actual pointer moves,
including pickup, palette maximum task is **49.275ms** (pickup interval 84.688ms, active 1486.528ms,
4,768 tasks); existing-field maximum is **17.362ms** (pickup interval 31.064ms, active 1402.022ms,
4,651 tasks). Neither contains a task over 50ms. Pickup intervals include multiple tasks and are not
reported as single-task duration. Earlier measurements/failures above are retained. No threshold or
runner baseline changed. Subsequent distinct read-only fill tokens affect only read-only previews,
not this editable drag fixture.
