# M09c effects and compatibility checkpoint

Status: **full pinned verify PASS, exit 0**; commit/push and first-attempt new-head CI follow.
M09c remains open. This is a runtime checkpoint, not release/delivery or merge approval.

## Implementation and API additions

- Core: typed optional StatePatch.effects/LogicEffect and LogicCallContext; optional cancellable
  HostFunction.effect with unchanged pure/legacy run arguments; session event snapshots and per-session
  effect outbox. Trusted calls start after patch publication and never apply returned data implicitly.
- Node: skips browser focus/emit and functions unavailableInNode; permitted calls are awaited with
  configurable default 5,000 ms timeout and diagnostic. Reset/dispose cancels queued/running calls;
  stale completion cannot publish. Interrupted Node submit fails rather than returning stale success.
- Renderer: updates state/DOM before focus and onLogicEffect callback. Element dispatches composed
  of-effect; React forwards latest callback; Angular adds logicEffect output/provider callback.
  DOM five-theme and Element light/shadow lifecycle are tested; dedicated React/Angular effect
  lifecycle acceptance is still pending, not claimed complete by typechecking.
- Button custom events trigger matching rules; valid empty custom events retain onAction/of-action
  without triggering a named rule. Public session.triggerLogicEvent still rejects empty names.
- No SDK-owned network calls, new runtime dependency, executable JSON, changed Expr/form format,
  CSS/ARIA/threshold removal or baseline change. README/spec/changeset document the unreleased APIs.

## Final verification and one measurement set

Pinned Node 22.22.3 / pnpm 10.10.0, darwin-arm64, Low Power Mode 0, command-lifetime caffeinate.
`pnpm verify`: **410 units (69 files), 1,656 browser checks (Chromium/Firefox/WebKit), 17 package
budgets, every consumer/lazy/aggregate gate and nine exact runtime counts PASS**. Source fingerprint
before/after: `7bcb56a2846782fbe81017fff4f1849c0513bfc64130ee6c939be388a029c968`.

| Gate                                       | Actual / enforced ceiling | Delta from pushed 0ac checkpoint |
| ------------------------------------------ | ------------------------: | -------------------------------: |
| Builder UI initial (excludes builder-core) |           31,780 / 32,600 |                                0 |
| Builder-core marginal contribution         |             7,129 / 8,300 |                              -32 |
| Logic-enabled builder full initial         |           74,437 / 75,700 |                           +1,216 |
| Matched no-logic form                      |           28,897 / 28,897 |                              +85 |
| Matched opt-in increment                   |             5,396 / 6,000 |                           +1,179 |

Figures use the unchanged consumer method/shared attribution and are marginal, not additive. The
matched enabled form is 34,293. No-logic contains neither execution nor rule meta-schema; enabled
contains both. All lazy/package ceilings remain unchanged. The current full still fits the former
74,500; no actual growth beyond it has yet been used.

Owner amendments on 2026-11-12: no-logic +20 to 28,852, then +45 to 28,897 for compatibility.
Correctness-only measured rises up to 29,000 are preapproved for remaining M09c; **new features may
not consume that margin**. Enforce 28,897 now, not the unused maximum. Remaining runtime may grow
enabled builder full up to 75,700, recording actual causes; UI/core/opt-in/edit-ratio gates remain.
Full +1,216 covers effects, snapshots, async dispatch, Node timeout/cancellation, messages and bridge.
The final compatibility guard is +6 full/+45 no-logic versus the approved pre-fix sample.

[Machine proof](m09c-effects-evidence/final-verification.json),
[full log](m09c-effects-evidence/final-full-pinned-verify.log.gz),
[consumer assets/accounting](m09c-effects-evidence/final-full-gates.json.gz).
Historical failed size stop/compaction ledger remains in [the earlier report](m09c-effects-size-stop.md).

## Regressions, work and preserved failed evidence

The empty-event failure reproduced in all three browsers before correction. The API size-policy test
was updated openly for each explicitly approved ceiling: exact equality and +1 rejection remain;
current failure boundary is 28,898 > 28,897. Its earlier 409-pass/one-fail local run is retained.
Another full local run passed 410 units/273 browsers before deliberate interruption for the independent
empty-event repro (exit130), not a full pass. No failed source was pushed or CI workflow rerun.
The initial invalid-effect test fixture mistake and unregistered-call diagnostic change are disclosed
in the historical report; all failing logs and rejected compactions remain under the evidence folder.

Rejected post-approval probes: shell node alias, submit capture, context reuse, opt-in Button routing
and opt-in payload snapshot. All were restored; no behavior was dropped for bytes. Exact final
empty-string guard preserves valid empty events and strict named-event misuse handling.

At 100/500/1,000 fields and rules, an effect event does exactly one index read, candidate,
action expression, edge and effect; zero condition/writer/write/cascade/source/value/override work,
zero additional processors and one patch. Unmatched event: zero candidate/effect/patch. Existing
processor/render/DOM/CSP counts pass unchanged. New effects proof is targeted171 units/51 browsers
plus the full run above. Fresh paired timing of this effects checkpoint is still pending; prior
0ac timing evidence is not relabeled as this source's result. No changed/new screenshots.

## Remaining correctness work and delivery

A private regression investigation also proved an **existing 0ac** bug with a strict custom numeric
adapter: an invalid continuous calculation reports invalid-logic-value; editing an unrelated field
clears that diagnostic, browser submit succeeds and Node rejects it. The exact baseline and draft
reproductions match. Built-in numberValue intentionally normalizes the same invalid string to null;
that first hypothesis was not a bug and its result is retained separately. The next runtime step
adds persistent calculation-error/recovery/override tests and fixes the cache without rule-list scans.
This is open M09c work, not an effects regression or a reason to claim the whole runtime accepted.

Then property overlays, rule commands/locks/history, Build badges/chips, real lazy Logic/test/map,
all-host/CSP/offline/assetBase, edit A/B timing, onboarding map, fresh guide-only author evidence,
owner screenshots and final PR first-attempt CI remain. Do not merge or start M09d.
