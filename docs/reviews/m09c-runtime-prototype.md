# M09c runtime prototype — budget review

Date: 2026-11-10. Author: Codex. **Uncommitted, unpushed prototype**, based on
`dcb7550c7990f57a789b4adc9a3563bd9059c221` (`m09c-logic-rules`). This is the first
implementation gate in ADR-0022, not completed M09c delivery. No enabled-consumer ceiling has
been granted and no existing ceiling, assertion, deadline, baseline or expression evaluator changed.

The amended plan [PR #18](https://github.com/nawinisha231272-wm/formkit/pull/18) merged on its
final head's first-attempt green CI. Those runs cover the plan/preflight, **not this prototype**:
[PR Verify](https://github.com/nawinisha231272-wm/formkit/actions/runs/42876499383),
[push Verify](https://github.com/nawinisha231272-wm/formkit/actions/runs/42876492548),
[advisory](https://github.com/nawinisha231272-wm/formkit/actions/runs/42876499586).

## Decision requested before shipping

Propose an **actual logic-enabled builder consumer closure ceiling of 74,500 Brotli bytes**,
with the existing **68,500 no-logic consumer** ceiling retained. This proposed number is
68,500 + 6,000; it is a request, not an interpretation that the expected 6,000 increment was
already approved. The prototype measures **71,036**, leaving **3,464** for the unfinished
runtime and initial integration. Keep measuring the matched form opt-in increment separately
(currently **1,911**), against the expected maximum 6,000. UI 32,600, builder-core 8,300,
runtime package and lazy budgets remain as accepted in ADR-0022.

The remaining implementation cost is not measured yet. The reserve is a planning allowance,
not a forecast or a passing final implementation. If completion cannot fit, stop for a measured
decision. Full pinned verify, push and implementation CI follow approval and gate implementation.
The probe currently fails the historical 67,700 full gate, as disclosed below; no passing full
verify is claimed for this draft.

## One final consumer measurement set

Production esbuild 0.25.12, published package entries, Node **22.22.3**, pnpm **10.10.0**,
native darwin-arm64, Node Brotli, shared files counted once. Builder UI ownership and marginal
builder-core contribution use the unchanged established consumer probe. No required dependency
was externalized to claim a runnable smaller build. `builder-core` is externalized only for its
established marginal attribution measurement.

| Measurement                                   | M09b+ immutable main |  Prototype |                          Delta | Applicable ceiling           |
| --------------------------------------------- | -------------------: | ---------: | -----------------------------: | ---------------------------- |
| Builder UI initial, excludes builder-core     |               31,769 | **31,780** |                            +11 | 32,600 accepted M09c maximum |
| Builder-core marginal contribution            |                7,120 |  **7,212** |                            +92 | 8,300 accepted M09c maximum  |
| Actual builder full initial, logic registered |               67,674 | **71,036** |                         +3,362 | **Pending**; propose 74,500  |
| Matched form consumer, no logic registered    |               28,232 | **29,395** |                         +1,163 | 68,500 no-logic full         |
| Same form consumer, logic registered          |  unavailable on main | **31,306** | +1,911 versus matched no-logic | New enabled ceiling pending  |

Main is the immutable M09b+ merge **`cd6d0b679027da328da9f5e4f63480437d6c765b`**,
built from its own archived source and frozen workspace install. The form fixture genuinely
imports `createFormController`, built-in components and Bootstrap 5; its sole opt-in difference
is `createLogic` registration. Metafiles prove the body `core/dist/logic/index.js` is absent
from no-logic consumers and present in enabled consumers. The **+1,163** no-logic form delta is
reported explicitly; it is not the +826 historical builder allowance or the +1,911 opt-in delta.
These form and builder fixtures have different closures and are never substituted for one another.

Builder setup always registers the capability, even for definitions without rules. Its actual
71,036-byte closure therefore cannot be judged against the no-logic gate or relabelled no-logic.
The byte-identical copy of the existing gate script exits 1 solely for **71,036 > 67,700**.
Its historical limits remain embedded in the raw JSON; the table above distinguishes accepted
M09c maxima from the still-pending enabled gate. All other existing probe checks pass.

Raw evidence: [builder](m09c-prototype-evidence/final-builder-size.json),
[matched forms and input attribution](m09c-prototype-evidence/final-form-sizes.json),
[standalone package bytes](m09c-prototype-evidence/final-package-bytes.json).

### Initial and deferred attribution

Root core keeps legacy expressions/conditions/calculations and the thin registration/session hooks.
Schema adds the safe wire/meta-schema; validation uses the same attached program. Only the explicit
`core/logic` entry contains the root compiler, indexes and execution body. Builder imports it initially.
The renderer and builder-core sources are unchanged. No new runtime dependency was added.

Standalone file Brotli (not additive consumer attribution): core root **13,193** (+1,058),
schema **6,055** (+396), validation **1,220** (+57), builder **30,243** (+55),
builder-core **9,729** (0), renderer **9,421** (0). All existing 17 file budgets pass;
standalone builder remains below 31,600. New opt-in logic body is **3,069** before consumer
tree shaking/compression. It must not be added to a consumer figure a second time.

| Builder-owned lazy closure       |         Bytes | Unchanged ceiling |
| -------------------------------- | ------------: | ----------------: |
| Logic / map reserved stubs, each |            37 |       10,000 each |
| JSON                             |           671 |             8,000 |
| Settings / Retry, each           |         7,704 |             8,000 |
| Command bar / Retry, each        |         3,586 |             4,500 |
| Quick-add / Retry, each          |         1,869 |             3,750 |
| Bulk editor / Retry              | 4,661 / 4,642 |        4,700 each |
| Bulk planning / Retry, each      |         1,547 |             1,750 |
| Data / Retry, each               |           269 |               300 |
| Logic/JSON/map union             |           745 |            28,000 |
| Union including Settings         |         8,449 |            36,000 |

Logic/map are still reserved stubs, **not implemented screens**. History remains unshipped.
The raw builder report also gives full-consumer and incremental first-open closures; initial
dependencies shared by a feature are counted once. For example Settings adds 7,664 consumer
bytes on first open, commands 3,431, quick-add 1,730 and bulk editor 4,647. No lazy policy,
protected initial interaction or host loading contract changed in this prototype.

## Runtime timing and actual work

This measures **form-runtime edits**, not builder authoring. Identical production consumer source
is built separately against immutable main and the draft. One Chromium runner, no concurrent
build/test workload, **five alternating A/B pairs**, three warm-ups plus nine samples per
fixture per pair, **25 edits and forced layout** per sample. Both sides assert processor work,
input identity, focus, field count and clean unmount. Low Power Mode was 0, AC, command-lifetime
`caffeinate -diu`; no system setting or deadline was changed.

| Fixture                        | Fields | Main ms / 25 edits | Prototype ms / 25 edits | Median paired ratio | ≤1.10 |
| ------------------------------ | -----: | -----------------: | ----------------------: | ------------------: | ----- |
| No conditions                  |    100 |              3.200 |                   3.100 |               1.000 | PASS  |
| No conditions                  |    500 |             12.200 |                  11.800 |               0.966 | PASS  |
| No conditions                  |  1,000 |             27.200 |                  27.500 |               1.022 | PASS  |
| Legacy conditions/calculations |    100 |             25.200 |                  24.700 |               0.964 | PASS  |
| Legacy conditions/calculations |    500 |             61.100 |                  61.500 |               1.007 | PASS  |
| Legacy conditions/calculations |  1,000 |            148.700 |                 153.900 |               1.016 | PASS  |

Divide absolute times by 25 for ms/edit. Independent median absolute times and median paired ratios
are different statistics, so their quotients need not match. Legacy fixtures have 25 dependent
fields, each with calculate/visibleWhen/disabledWhen; processor counts are exactly **650** per
25 edits, versus **25** for no conditions, on both builds. Original CI timing fixtures/policy
remain unchanged. These are local delivery measurements, not claims about Linux or CI timing.

The first measurement set is retained as preliminary. The final set includes the root-session
changes. Subsequent opt-in-body-only guards do not affect these no-logic bundles: rebuilt main
and branch JS hashes exactly match the timed artifacts, recorded in evidence. No failing timing
result was re-run to obtain green. [All pairs](m09c-prototype-evidence/paired-timings.json).

New [exact headless baselines](../performance/logic-work-counts.json) and
`packages/core/tests/logic-counts.test.ts` cover **100/500/1,000 fields, fields−1 rules**:

| Work per edit                                     | Unrelated field | One required-state rule |
| ------------------------------------------------- | --------------: | ----------------------: |
| Index reads / trigger membership reads            |           3 / 0 |                   3 / 1 |
| Candidate rules / conditions / cached writers     |       0 / 0 / 0 |               1 / 1 / 1 |
| Trigger edges / value writes / cascades / effects |   0 / 0 / 0 / 0 |           1 / 0 / 0 / 0 |
| Action expressions                                |               0 |                       0 |
| Processor runs / StatePatches / changed fields    |       1 / 1 / 1 |               2 / 1 / 1 |

Counters instrument actual lookups/evaluations/writer visits; an unrelated edit does not scan the
rule list or trigger refs. Zero action/effect counts describe these state fixtures, not coverage of
unfinished effects. Root-only browser timings are absolute, with no misleading main comparison;
see [root measurements](m09c-prototype-evidence/root-timings.json). Existing processor/DOM/render
count baselines are unchanged. Onboarding/root DOM and complete action counters remain delivery work.

Absolute root browser medians, ms per 25 edits at 100/500/1,000 fields: one active indexed rule
**2.6 / 11.4 / 26.9**; unrelated edits with the same installed rule lists **2.3 / 11.2 / 26.1**.
Every sample checks the exact 25-edit multiple of the headless rule counts, processor work,
control identity/focus and clean unmount. These are bounded state-rule fixtures, not complete
action/effect/onboarding performance acceptance.

## Verification and honest scope

- **PASS:** build (27 tasks), typecheck (45 tasks), 369 unit tests/59 files including packed scaffold
  proofs, all existing 17 standalone file size budgets. Unit coverage: root core 91.58%, opt-in
  logic 96.46%, validation 99.27%; existing 90% thresholds unchanged.
- **PASS:** final-source prototype browser/Node parity, control identity/focus, dynamic required,
  canonical submit and axe in **Chromium, Firefox and WebKit** (three tests). Not the complete
  1,605-case browser suite or all-theme root-rule conformance.
- **PASS:** all nine existing processor/DOM/render/CSP work-count browser checks with unchanged
  expectations, plus the three new headless indexed-rule tests in the unit total above.
- The initial new browser test failed module loading because Node's JSON import needed an
  attribute. The new fixture loader uses `readFileSync`/`JSON.parse`; assertions did not change.
  Its failure and successful final-source logs are both retained. Earlier formatting failure is
  retained; only formatting of the new counts test changed. No old test expectation changed.
- Full pinned `pnpm verify`, Linux prototype verification and implementation CI are **NOT RUN**.
  The enabled ceiling must first be approved and wired into the gate. No draft commit/push/PR,
  screenshot approval, M09c completion or M09d work is claimed.

Implemented representative paths: data-only schema/migration; missing-logic; isolated registration;
indexed state priority; show/hide/enable/disable/require/optional/readOnly; edge setValue/clear;
continuous calculations; load/change/submit/named events; revert that preserves later user/API
edits; authoritative Node replay; conflicts/cycles and bounded cascades. Diagnostics remain explicit:
effects and property overlays return `unsupported-logic-action`; an unfinished root→legacy
calculation→root scheduler combination returns `unsupported-logic-interleave`, rather than silently
using stale intermediate values. These guards are prototype limits, not accepted final behavior.

**Still required after this owner gate:** complete interleaved scheduling and action semantics;
setProperty/trusted metadata; typed effects and host delivery; async calls/Node timeout/cancellation;
submission-schema annotations; all-host/all-theme root-rule parity; commands/locks/history; initial
Build badges/chips; real lazy Logic editor/test pane and separate auto-loaded map; CSP/offline/assetBase
proof, onboarding map, fresh author exercise, screenshots, full verify and first-attempt CI.

API additions in this unshipped draft: schema LogicRule/Trigger/Action; core `LogicRegistration`
types and `EngineOptions.logic`, readonly `engine.logic`, `registerLogic`; explicit `core/logic`
`createLogic`; session `triggerLogicEvent`, optional `FieldState.logic`, `StatePatch.diagnostics`
and `debug.logic` counters. README/spec/changeset updates accompany the draft. No expression syntax
change: owner-approved **is one of** is OR-of-eq; no literal-list operator was added.

Evidence/reproduction and precise source hashes: [manifest](m09c-prototype-evidence/README.md).
Playground remains at `http://127.0.0.1:4173/builder.html?approved`; the narrow runtime demo is
`http://127.0.0.1:4173/logic-prototype.html`. Neither is completed screen 3.
