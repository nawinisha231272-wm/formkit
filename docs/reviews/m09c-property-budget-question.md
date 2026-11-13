# M09c property-overlay prototype — size decision

**Resolved by owner on 2026-11-12:** approve measured feature costs 29,061 / 6,300 and final
remaining-runtime maxima 29,200 / 7,000 / 76,200 (UI32,600/core8,300 unchanged). The STOP and
failed measurements below are historical evidence; delivery/browser/full verification is pending.

Status: **BLOCKED on approved size gates; uncommitted/unpushed prototype**.
Last verified/pushed checkpoint: `420879478568a1717efc928badd34774040ecbab`.
Its frozen proof passed414 units/1,692 browsers/all budgets/nine counts. This draft is separate.

## Concrete current implementation

Explicit immutable model/config logicSettable capabilities; safe canonical property resolution;
indexed property expressions and wire-order contributions; cached resolved nodes/config, reversion
and per-writer invalid-result diagnostics; shared browser-session/Node validation and renderer
resolution. No form JSON/Expr change, executable metadata, registry mutation, new dependency,
networking or removal of protected UI behavior. Public optional metadata/state types are additive.

225 targeted tests pass, including all15 new property regressions and the unchanged SDK authoring
checks. The Rating definition still has29 meaningful lines: shared explicit capabilities and local
config destructuring preserve the exact old control behavior/ARIA/messages; no expectation changed.
Browser/SDK-metadata/CSP/performance/full delivery work is still pending. No release/GO is claimed.

## One best measurement set (Brotli)

| Gate                                        | Draft / approved limit |            Gap | Delta from pushed4208794 |
| ------------------------------------------- | ---------------------: | -------------: | -----------------------: |
| Builder UI initial, excludes builder-core   |        31,780 / 32,600 |   820 headroom |                        0 |
| Builder-core marginal consumer contribution |          7,167 / 8,300 | 1,133 headroom |                       -1 |
| Logic-enabled builder full initial          |        75,493 / 75,700 |   207 headroom |                     +968 |
| Matched no-logic form                       |        29,061 / 28,897 |   **164 over** |                     +164 |
| Matched opt-in increment                    |          6,300 / 6,000 |   **300 over** |                     +924 |

No-logic growth is trusted built-in capability declarations/copying and the generic resolved
validation/view hooks. Opt-in growth is safe property resolution/types, indexed expression values,
ordered immutable overlays, cached recovery and validation integration. Marginal compressed figures
are not additive; no code was relabeled/externalized. New features cannot consume the correctness-only
reserve.29,061 also exceeds that reserve's29,000 maximum. All ceiling constants remain unchanged.

## Rejected normal compactions

| Probe                                   | No-logic | Opt-in increment | Full initial | Outcome                       |
| --------------------------------------- | -------: | ---------------: | -----------: | ----------------------------- |
| Original coherent prototype             |   29,061 |            6,300 |       75,493 | Best; still fails two gates   |
| Shared registry metadata cloning        |   29,122 |            6,250 |       75,455 | Restored: no-logic+61         |
| Shared SDK JSON copy/freeze             |   29,084 |            6,289 |       75,536 | Restored: no-logic+23/full+43 |
| Minimal property validation descriptors |   29,061 |            6,303 |       75,497 | Restored: increment+3/full+4  |
| Lazy calculation context allocation     |   29,062 |            6,300 |       75,562 | Restored: no-logic+1/full+69  |

Each was measured against the same coherent source/toolchain. No assertion, pixel threshold,
ARIA, selector, CSS rule or user message was removed. Rejected code is restored; failed measurements
and initial red/regression logs remain in [the evidence](m09c-property-budget-evidence/).

## Decision needed

Recommended: approve exact new-feature limits **29,061 matched no-logic** and **6,300 opt-in
increment**, keeping UI32,600/core8,300/full75,700 and every package/lazy/correctness/count/performance
gate unchanged. This approval would fund only the measured runtime prototype, not declare it done;
full initial headroom is only207 bytes and all remaining authoring must still pass its gates.

Alternatively retain28,897/6,000 and review a deeper opt-in capability/validation bridge redesign.
That route needs a new concrete API/placement plan and measurements; no unmeasured saving is promised.
No further implementation or over-budget push proceeds without this decision.
