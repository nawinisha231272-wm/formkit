# M09c pay-for-use extraction checkpoint

2026-11-11, Codex. Owner approved 74,500 enabled builder full, 32,600 UI, 8,300 builder-core,
and added hard matched-form gates: no-logic 28,832 (main 28,232 +600), opt-in increment 6,000.
The [prototype report](m09c-runtime-prototype.md) is historical; its pending budget decision is
resolved. This checkpoint is not finished M09c. Its foundation now passes full pinned verification; implementation CI is pending.

| Consumer measurement                | Prototype | After extraction |              Accepted gate |
| ----------------------------------- | --------: | ---------------: | -------------------------: |
| Builder UI initial                  |    31,780 |           31,780 |                     32,600 |
| Builder-core marginal contribution  |     7,212 |            7,217 |                      8,300 |
| Actual enabled builder full initial |    71,036 |           71,509 |                     74,500 |
| Matched no-logic form               |    29,395 |           28,804 |                     28,832 |
| Same form with logic registration   |    31,306 |           31,571 | Report plus increment gate |
| Matched opt-in increment            |     1,911 |            2,767 |                      6,000 |

Same production consumer sources, esbuild 0.25.12/Node 22.22.3 Brotli method, shared files once,
unchanged ownership/marginal attribution. The matched no-logic consumer is **+572** over immutable
main `cd6d0b679027da328da9f5e4f63480437d6c765b`, within +600. It contains neither rule metadata
nor execution. The enabled consumer contains both. The builder always registers logic and is
measured enabled. No dependency was externalized to claim a smaller runnable consumer.

The complete public definition schema is composed from separate structural/rule sources and
constructed in a removable pure factory. Existing `validateDefinition`, `migrate` and deeply frozen
`formDefinitionSchema` retain their full validation contracts. New structural compiler primitives
preserve safe opaque rule JSON; they do not validate rules or authorize execution. Engine compilation
rejects missing registration; registered core/logic validates the complete wire before reading it.
The SDK's local composite-template processing uses structure validation, as templates contain
components rather than root logic. Rule-only store normalization, provenance, diagnostics and cycle
descriptions moved to the opt-in entry. Protected writes/legacy processors and optional dispatch stay
initial. No old test expectation, expression syntax/evaluator, pixel/count threshold or deadline changed.

Measured extraction ledger (no-logic / enabled, bytes):

- Before extraction: **29,395 / 31,306**.
- First metadata split: **29,526 / 31,394**, rejected as complete extraction: argument spreads kept
  rule metadata despite the pure call. A zero-argument pure factory fixes that retention.
- Correctly removable full metadata: **29,076 / 31,387**.
- Opt-in store/provenance/error bridge: **28,853 / 31,589**.
- Shared validation-result collection probe: **28,905 / 31,584**, **discarded** because no-logic grew
  52 bytes; the prior collection code remains. No tests/assertions were removed.
- Direct rank access, removing its redundant getter: **28,831 / 31,586**.
- Move rule-specific cycle descriptions out of root: **28,804 / 31,571** (kept).

The core package's existing 30,000-byte standalone allowance now counts root and logic assets together,
not an additional 30,000 for the new entry. All other package/lazy ceilings remain unchanged.
`scripts/builder-size-gate.mjs` enforces accepted consumer ceilings and calls the new matched-form
measurement. Policy tests reject one-byte violations and missing/leaked validation/execution bodies.

Post-extraction form-runtime edit timing: five alternating main/branch pairs, one isolated Chromium
runner, production builds, 25 edits/sample, three warmups/nine samples, Low Power Mode 0/caffeinate.
The immutable main build owns its frozen workspace links; no branch package substitution.

| Fixture                        | Fields | Main / draft ms per 25 edits | Median paired ratio |
| ------------------------------ | -----: | ---------------------------: | ------------------: |
| No conditions                  |    100 |                    3.3 / 3.6 |              1.0909 |
| No conditions                  |    500 |                  12.0 / 12.2 |              1.0517 |
| No conditions                  |  1,000 |                  28.7 / 28.5 |              1.0215 |
| Legacy conditions/calculations |    100 |                  25.8 / 25.4 |              1.0081 |
| Legacy conditions/calculations |    500 |                  66.1 / 65.0 |              0.9815 |
| Legacy conditions/calculations |  1,000 |                155.7 / 155.4 |              0.9929 |

All six satisfy ≤1.10. Ratios are medians of paired ratios; absolute medians are independent statistics.
Processor work, identity/focus/field count and clean unmount are asserted on both sides. No concurrent
build/test workload, no timing retry to obtain green; raw pairs remain in evidence.

Focused checks passed (149), followed by **full pinned verify PASS**, exit 0: **373 unit / 1,608
browser / 17 package budgets plus all consumer/lazy gates / nine existing runtime count checks**.
Node 22.22.3/pnpm 10.10.0, frozen install, Low Power Mode 0/caffeinate. Before/after source hashes
match; all three browsers and unchanged native baselines pass. Core's combined root/logic package
is 16.93 kB, within its unchanged 30 kB. See `verification.json` and archived complete log.
No implementation CI or completed M09c delivery is claimed.
Remaining M09c work: complete scheduling/state/effects/async lifecycle, commands/locks/history,
initial Build summaries, lazy Logic/test and automatic map, all-host/theme/CSP/offline/assetBase,
onboarding and fresh author exercise, screenshots/full verify/first-attempt CI. No M09d implementation.

Raw evidence: [manifest](m09c-pay-for-use-evidence/README.md).
