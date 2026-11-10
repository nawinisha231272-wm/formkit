# M09c plan — local power evidence and verification

Owner request: record macOS Low Power Mode and display/idle sleep before long browser runs,
then compare the unchanged WebKit author task with Low Power Mode off. No deadline/retry changes.
This is verification tooling for the accepted plan, not M09c runtime implementation.

## Preserved failure and controlled comparison (2026-11-10)

| Run                                   | Active Low Power Mode      | Result                                                                                                      | Scope                                                                               |
| ------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| First amended full native verify      | On (`lowpowermode 1`)      | Exit 1: 341 unit and 1,604 browser checks passed; unchanged WebKit keyboard author task timed out at 30.1 s | Size/count stages were not reached; this is not a full PASS                         |
| Isolated diagnostic, unchanged task   | On                         | PASS, 16.3 s task / 30.8 s command                                                                          | Same assertions, default 30 s deadline; `DEBUG=pw:api`                              |
| Owner-controlled off-state comparison | Off (`lowpowermode 0`), AC | PASS, 13.9 s task / 26.7 s command                                                                          | Same task, assertions, deadline, debug output and command-lifetime awake assertions |

Exact test: **twelve-field task built with keyboard only: nested slots, conditional and SDK component**,
`tests/e2e/builder-task.spec.ts`, project `webkit`. The failed suite stopped during keyboard typing;
its page snapshot showed the unfinished Customer reference draft. No semantic assertion failed.
At the failed run, runtime/test/config sources matched immutable main `cd6d0b679027da328da9f5e4f63480437d6c765b`.
Before/after source fingerprints matched: 2,526 files, SHA-256
`ff146d5e2d1641c054d4e7889206853a686d817e43372e450d37cecd0ff22c50`.
The new preflight/tests below were added only after that diagnostic.

The single off-state sample is faster, but not randomized and not proof that Low Power Mode caused
the timeout. Concurrent host load and native compositor scheduling remain possible contributors.
The isolation results do not replace the required full verification. No CI was re-run for green.

Local raw evidence is retained in `.git/ourform-m09c-amendments-2026-11-10/`:
`verify.log`, `verify-exit`, `source-before.json`, `source-after-failure.json`,
`keyboard-error-context.md`, `low-power-before.txt`, `power-assertions.txt`, `host-processes.txt`,
`isolation.log`; off-state `power-off/active-power.txt`, `power-off/power-profiles.txt`,
`power-off/controlled.log` and `power-off/controlled-exit`. These paths are local, not published assets.

## Read-only preflight

`pnpm test:e2e`, including its invocation by `pnpm verify`, now runs
`node scripts/verify-preflight.mjs` before Playwright. On macOS it logs timestamp/platform, raw
`pmset -g`, power source and sleep assertions; summarizes Low Power Mode and display/idle sleep;
warns if power saving is on or sleep is configured without a recorded prevention assertion.
Missing probes are explicit unknowns. Other platforms never invoke pmset. Probe failures warn without
changing verification outcomes. No system preference, awake assertion, deadline or retry is changed.

Evidence: `tests/verify-preflight.test.ts` — four tests cover read-only command allow-list and log,
macOS on/off/unknown/unavailable probes, held assertions and Linux/Windows exclusion. The tests,
root typecheck and lint pass. Existing tests/assertions and pixel/count/size ceilings are unchanged.
No dependency, SDK API, form JSON or screenshot changes are part of this plan amendment.

## Full proof and push policy

After recording the off-state comparison and finishing all source/document changes, run pinned
Node **22.22.3** / pnpm **10.10.0**, frozen install, then complete `pnpm verify` under command-lifetime
`caffeinate -diu`. Preserve its independent log/result and before/after source fingerprint under
`power-off/full/`; the preflight power snapshot is part of `verify.log`. A push requires exit 0
and unchanged source fingerprints. The PR records the terminal local totals and final-head first-attempt
CI links separately; prior failed or old-head green runs do not approve this amended head.

[Plan PR #18 and its current-head checks](https://github.com/nawinisha231272-wm/formkit/pull/18)
provide the shared result. Merge only after first-attempt green correctness CI at that exact head.
The opt-in runtime prototype and measured enabled-closure owner gate follow the plan merge.
