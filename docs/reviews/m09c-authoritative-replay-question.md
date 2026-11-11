# M09c authoritative replay — owner decision recorded

2026-11-11. Found while completing the runtime after the approved budget extraction. This is an
explicit contract question, not a claim that unfinished implementation alone is a blocker.

Spec 11 defines **load** as a session-start trigger and value actions as edge actions. ADR-0022 and
spec 11 also make calculations/load/submit assignments authoritative in customer Node and require
browser/Node parity. Node receives final data and cannot infer the client's original load data/event
history. Two accepted definitions currently produce a successful browser-side submission that the
shared Node validator rejects:

| Case                                    | Initial state                         | Edit                       | Browser submit         | Node replay                                     |
| --------------------------------------- | ------------------------------------- | -------------------------- | ---------------------- | ----------------------------------------------- |
| Load copies source into target          | source=A, target=A                    | source=B                   | OK: source=B, target=A | Rejects target=A; authoritative load computes B |
| Change rule assigns a calculated target | total's non-overridable calculation=2 | source=go assigns total=99 | OK: total=99           | Rejects total=99; calculation computes 2        |

Both reproductions use the public engine, registered opt-in entry, session submit and
`validateSubmission` with pinned Node 22.22.3. There is no alternate evaluator, timer, network call or
mutated input. Raw [results](m09c-replay-question-evidence/results.json) include definitions, initial/
edited values, client submission and exact Node `calculated` errors. The [script](m09c-replay-question-evidence/repro.mjs.txt)
can run from the repository root with `node --input-type=module < <script-path>` after a pinned build.

## Original recommendation — rejected by owner

Before capturing a browser submission, canonicalize active authoritative calculation/load/submit
values using final form data and the same server policy. Do **not** replay effects or create new
change/event trigger edges during canonical replay. Ordinary change/event values remain editable
unless an active authoritative writer owns the same target. Preserve immutable snapshots, one settled
submission transaction, focus/touched/dirty state and existing count/performance/budget gates.

This needs an explicit decision because it introduces a client-side authoritative replay step in
addition to the session-start load trigger. It must not silently turn load effects into submit
effects, relax Node forgery checks, or make editable values falsely authoritative. Alternatives are
to reject conflicting definitions at compile or revise the previously accepted load-authority policy.

[AGENTS.md](../../AGENTS.md) says: “If the spec is ambiguous or wrong, stop and record the question”.
The question is recorded under Open questions in progress.md and asked of the owner. Replay-dependent
implementation is paused until answered. No JSON format, effect timing or test expectation is changed
to paper over the mismatch.

## State at this question

- Foundation **2eb031278bc9473638cf9564d474b4345f37bdf3** is pushed after full pinned PASS:
  373 unit / 1,608 browser checks, all package/consumer/lazy gates and nine runtime count checks.
  [First push CI](https://github.com/nawinisha231272-wm/formkit/actions/runs/43048423537) **passed attempt 1**
  (373 unit / 1,608 browser / all gates / nine runtime counts). It is separate from the newer working draft; no rerun or merge.
- Working scheduling/schema draft: 154 focused unit checks with unchanged coverage gates
  (root core 91.48%, opt-in logic 96.76%, validation 99.27%), nine browser checks across all three
  engines including shared interleaved fixtures, lint/typecheck/build and consumer gates pass.
- Draft UI/core/enabled full **31,780 / 7,205 / 72,070** under **32,600 / 8,300 / 74,500**;
  matched no-logic **28,813/28,832**, increment **3,046/6,000**. No cap increase needed.
- The newer draft remains uncommitted/unpushed and has no full pinned or CI claim. Remaining M09c
  runtime semantics, effects/async/Node timeout, commands, Build summaries, Logic/map, host/theme
  delivery and author exercise remain open. No M09d work or completed M09c recommendation.

## Owner decision — 2026-11-11

Load setValue/clear are one-time editable initializers, not replayed/enforced by Node. All state
actions are recomputed from final data, including load state. Only non-overridable continuous
calculations and submit assignments are authoritative. Browser submit runs submit rules as today,
without extra canonicalization or effects. setValue/clear to a non-overridable calculation is a
compile ERROR naming the rule/field; allowOverride:true writes are ordinary editable answers.
The original failure results above are preserved. The pause described above is historical; this
explicit owner answer resolves it. New parity/compile checks implement the revised contract.
