# ADR-0022 — Logic engine placement, lazy authoring and M09c allowances

Status: **accepted by the owner on 2026-11-10; budget amendments accepted 2026-11-11 and 2026-11-12**
Date: 2026-11-09
Milestone: M09c (accepted plan; implementation evidence remains pending)

## State-read fix — full pinned verification and production comparison PASS, 2026-11-13

The corrected first five-pair production comparison passes all ≤1.10 edit gates: plain
100/500/1,000 ratios **1.0000/0.9935/0.9952**, legacy **0.9919/1.0051/1.0062**. Main and branch
use identical 250-edit fixtures (three warmups/nine samples), alternating order on one runner;
all processor, identity/focus and control-count checks hold. The original failed comparison is
retained separately; this follows a proven code fix, not a timing retry without a change.
Seven new exact main-derived state-read count checks and the original nine pass. Both WebKit cases
from an overlapped rebuild pass in isolation, then all 78 property browser cases pass in serial.
The failed overlap log contains disappearing dist modules/TS2307; no assertion/deadline changed.
[Complete corrected performance, counts, disclosure and full proof](../reviews/m09c-property-read-fix.md).
The corrected frozen pinned run now exits **0**: **446 units / 74 files / 1,770 browsers / 17 package
budgets / all consumer/lazy gates / 16 count checks**. Its coherent UI/core/full/no-logic/increment
measurements are **31,780 / 7,188 / 75,619 / 29,111 / 6,318**, with every ceiling unchanged.
Before/after source fingerprint is identical:
`9af7d44e8a03d14fb25dfcd268ecd9b9b1ea94fe2696620db5d7efd5ea4547f1`.
Only documentation/evidence is finalized afterwards. All tested/new non-document files must match the
verified manifest in the index before commit/push; new-head CI is pending. This is a runtime
checkpoint, not M09c completion: rule authoring, dependency map, fresh author exercise and delivery
screenshots still follow.

## State-read correctness fix measurement — 2026-11-13

Reusing one state snapshot restores immutable main's exact state-read counts: plain100/500/1,000
**202/1,002/2,002**, legacy **252/1,052/2,052**, onboarding **158**, on each of 25 edits. Seven
new hard count checks and the original nine all pass. A red/green unit retains derived captions and
errors while requiring one lookup. The original failed five-pair timing experiment is preserved.

Corrected consumer sample: UI **31,780/32,600**, builder-core **7,188/8,300**, enabled full
**75,619/76,200**, no-logic **29,111/29,200**, matched increment **6,318/7,000**. The correctness
fix changes no-logic by **+50** and enabled full by **+81** relative to 29,061/75,538 within the
owner's final remaining-runtime envelope; Brotli symbol/layout changes are non-additive. It does
not move behavior or code outside accounting. All ceilings stay unchanged. Fresh paired timings
and full pinned verification remain required; nothing from this draft has been pushed.

## Property-overlay hardening measurement — 2026-11-12

Coherent consumer build: UI **31,780/32,600**, builder-core **7,145/8,300**, enabled full
**75,538/76,200**, matched no-logic **29,061/29,200**, opt-in **6,395/7,000**. Relative to the
owner-reviewed prototype 75,493/6,300, full rises **45** and opt-in **95** for property-only
processor invalidation, repeated scalar/pattern parsing reuse and preservation of static submission
constraints under display-only rules. No-logic/UI remain unchanged; marginal compression deltas are
not additive. All protected behavior and package/lazy ceilings stay unchanged. Three added
100/500/1,000-field property-rule work checks retain the original state-rule assertions and expect
one property expression, bounded indexed work and zero unrelated rules. A regression proves no
reprocessing of unchanged legacy value dependants. Invalid-property recovery, safe config/metadata
isolation and stale async validator cancellation have targeted tests; complete verification follows.

## Owner final M09c runtime envelope — accepted 2026-11-12

The owner accepted the property prototype's measured feature costs: matched no-logic **29,061**
(+164 from 28,897), opt-in increment **6,300** (+924 from the preceding 5,376 sample), enabled
builder full **75,493** (+968), UI **31,780**, builder-core **7,167**. Brotli deltas are not additive.
The root FormSession validation path must read an optional resolved compiled entry, and the generic
renderer shell/error-label path must read optional `FieldState.resolvedNode`, so the same renderer
supports legacy and logic-enabled sessions. Trusted built-in capability declarations are retained.
No-logic consumers still contain no root-rule execution or rule meta-schema; only bounded optional
dispatch and trusted model metadata remain. Four rejected compaction probes remain recorded.

Final preapproved **remaining-runtime** envelope: matched no-logic **29,200**, matched opt-in
increment **7,000**, logic-enabled builder full **76,200**, builder UI **32,600**, builder-core
**8,300**. These cover remaining setProperty/effects/async-call/Node timeout/cancellation work,
superseding the earlier feature/correctness-only caps below. Record each actual rise and cause;
above any maximum STOP with measured options. Package/lazy limits, no-logic full 68,500 and all
correctness, deterministic work-count and ≤1.10 plain/legacy edit-ratio gates remain unchanged.
The equality/+1-byte policy tests retain their intent and now test these explicit owner limits.
This approval resolves the size STOP; browser/CSP/performance/full verification and delivery remain
pending. No unverified feature source has been pushed, and M09c remains open.

## Historical property-overlay prototype — proposal accepted above, 2026-11-12

Historical record of the request **before** the owner answer. Its pending/STOP wording below is
retained as evidence and is superseded by the accepted final envelope above.

No change to accepted limits. The uncommitted coherent feature measures UI31,780/core7,167/
full75,493, matched no-logic29,061 and opt-in6,300. No-logic exceeds28,897 by164 and opt-in
exceeds6,000 by300. The correctness-only margin cannot fund new features. Four measured normal
compactions were discarded for growth. [Owner decision/evidence](../reviews/m09c-property-budget-question.md)
proposes exact feature limits29,061/6,300, retaining every other ceiling; these are **not accepted**
or applied in code. STOP instead of shipping over budget. Broader feature acceptance is still pending.

## Recorded runtime allowance use — persistent calculation diagnostics, 2026-11-12

The corrected opt-in runtime retains an invalid active calculation diagnostic across unrelated edits,
without re-evaluating unrelated rules. Recovery, inactive contributions, allowed explicit overrides
and reset remove the affected cached error. Supplied overrideable values remain accepted by Node,
which cannot infer client edit history. This is a correctness fix, not a new wire/API contract.

Consumer build: UI **31,780**, builder-core **7,168**, enabled full **74,525**, matched no-logic
**28,897**, opt-in increment **5,376**. Full +88 versus effects checkpoint 74,437 is attributable to
persistent per-target errors/recovery, first exceeding the historical 74,500 by 25 within the owner's
preapproved 75,700 remaining-runtime maximum. No-logic is unchanged; no new feature consumes its
correctness-only margin. All enforced ceilings remain unchanged; marginal Brotli deltas are not additive.

## Owner Button-event/correctness amendment — 2026-11-12

Accept matched no-logic **28,897** (+45 from 28,852) for the regression fix preserving valid empty
custom Button events. The new logic bridge must not throw before existing onAction/of-action
callbacks. The public named-session-event API still rejects an empty name. Three-browser repro
and correction evidence are retained, along with rejected compactions.

Standing permission for the rest of M09c: correctness/regression fixes may raise the measured
no-logic ceiling as needed up to **29,000** (immutable main 28,232 +768), without another question.
Record every rise and its cause in progress.md. **New features may not use this margin.** Enforce
28,897 now, not the unspent correctness maximum. Above 29,000, stop with measured options. UI
32,600, builder-core 8,300, enabled full 75,700 for remaining runtime, opt-in increment 6,000,
package/lazy/count/correctness and edit-ratio requirements remain unchanged.

Final current effects/compatibility sample: UI **31,780**, builder-core **7,129**, enabled full
**74,437**, no-logic **28,897**, opt-in increment **5,396**. The compatibility guard increases the
actual full closure by **6** versus the prior 74,431 sample; no full growth beyond the preceding
74,500 ceiling has yet been used. Marginal Brotli figures are not additive. Old measurements and
failed/interrupted local proofs remain historical evidence, never overwritten as green.

## Owner effects-budget amendment — 2026-11-12

The owner accepts the measured matched no-logic form ceiling **28,852** (+620 over immutable
main 28,232; +20 over the prior 28,832 ceiling). The effects draft measured exactly 28,852.
The enabled builder closure may grow as needed for remaining M09c runtime (setProperty, async
calls, Node timeout and effects) up to **75,700**, without another question. Enforce that maximum;
above it, stop with measured options. Builder UI **32,600**, builder-core **8,300**, matched
opt-in increment **6,000**, package/lazy limits and all correctness/count/edit-ratio requirements
remain unchanged. No-logic must stay at or below 28,852; the ≤1.10 plain/legacy runtime edit ratios
still apply. This is a scoped owner amendment, not an automatic allowance for later milestones.

Current effects draft: UI/core/full **31,780 / 7,180 / 74,431**; matched no-logic **28,852**,
opt-in increment **5,284**. Full growth from pushed replay checkpoint 73,221 is **+1,210** for
immutable effect outboxes/context, trusted async dispatch, Node timeout/cancellation, English
fallbacks and host delivery. It still fits the preceding 74,500 ceiling. Any subsequent actual
rise and its cause must be recorded here and in progress.md before shipping. Keep all historical
failed measurements; the owner's amendment resolves their gate failure without rewriting history.

## Context

### Owner budget amendment — accepted 2026-11-11

The owner approved **74,500** for the actual logic-enabled builder closure (=68,500+6,000),
with UI **32,600** and builder-core **8,300** maximums. Also enforce **28,832** for the exact
matched no-logic form consumer (immutable main **28,232**, at most **+600**) and **6,000** for
its matched opt-in increment. No-logic full remains 68,500; runtime package/lazy limits unchanged.
The earlier prototype's pending-budget statements below describe its historical review, now resolved.

Wire/meta-schema validation and rule-only session state/provenance/diagnostics move out of the
no-logic engine path. The full public `formDefinitionSchema`, `validateDefinition` and `migrate`
keep their complete format validation; pure construction makes this metadata removable when unused.
The engine and local composite template processing use bounded component-structure primitives
`validateStructure`/`migrateStructure`; the registered core/logic compiler validates the entire
root wire before reading any rule. A no-logic engine detects a declared logic key and fails
missing-logic. Structural primitives are not a replacement for engine/full definition validation.
No duplicate schema truth: compose the complete meta-schema from structural and rule definitions.

Move rule-only store bridging into the opt-in entry; leave only optional capability dispatch and
the legacy processors in the root. Keep every existing test's intent, safety checks and edit
performance. If the matched target cannot be met without breaking those contracts, stop with
measured options rather than increasing the target or hiding code outside accounting.

The owner approved M09b+ at `a9899587bd9369589e2cc9729dbc73238c33e7df`.
PR #16 merged as `cd6d0b679027da328da9f5e4f63480437d6c765b` after both Verify
runs succeeded on attempt 1. This merge is the immutable M09c comparison baseline.
Spec 11 defines root rules, browser/customer-Node parity, Logic authoring and a dependency map.
M09b+ already provides reserved Logic/map entries, accessible feature loading, compact expression
editors, command history, Build condition chips and all five themes. The reserved entries are stubs,
not an implemented rule engine or usable Logic screen.

The M09b+ consumer baseline is **31,769 UI / 7,120 builder-core / 67,674 full initial** Brotli
bytes, under **31,800 / 7,300 / 67,700**. The owner rejected unconditional root-rule cost and the
original proposed 75,700-byte full ceiling. Root rules are now an explicit pay-for-use runtime entry;
the legacy engine stays in the root entry. The approved M09c maxima are **32,600 UI / 8,300
builder-core / 68,500 no-logic full initial**. The logic-enabled closure needs a measured prototype
and a separate owner-approved numeric ceiling before shipping. This plan PR changes no gate script
or runtime code; implementation must add the accepted gates and stop at that measurement review.

Baseline evidence: [final consumer measurement](../reviews/m09b-plus-followup-evidence/final-consumer-size.json),
[full proof and performance diagnosis](../reviews/m09b-plus-owner-followup.md),
[PR #16](https://github.com/nawinisha231272-wm/formkit/pull/16).

## Options considered and accepted placement

Unconditional execution in the root core entry was amended by the owner. Execution in the builder
or a lazy UI is also unsuitable: browser forms and customer Node must enforce the same rules without
loading a builder or DOM package. A second interpreter in validation is rejected.

Keep legacy `visibleWhen` / `disabledWhen` / `calculate` execution in `@ourform/core`. Ship root-rule
compilation/execution as **`@ourform/core/logic`**, installed explicitly at `createEngine` in browser
and customer Node. The root entry exports only the small typed registration hook; it never imports
or re-exports the runtime implementation. Registrations and execution state are instance-local.
A definition declaring root `logic` without registration fails compile with **`missing-logic`**;
never ignore its rules, silently validate it as a legacy form or auto-download an entry.
The builder always registers the entry before compiling/previewing definitions.

| Layer              | Responsibility                                                                                                  | Loading                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| schema             | Root `logic` wire types, shape validation/meta-schema, safe migration and submission-schema annotations         | Shared format support; no import of the execution entry                      |
| core root          | Existing legacy compiler/session path and minimal optional registration/diagnostic hooks                        | Initial legacy runtime; no root-rule implementation                          |
| core/logic         | Root-rule compiler, indexes, priority, edge actions, otherwise/revert, cascades, provenance, effects and events | Explicit runtime opt-in at engine creation; always included by builder setup |
| validation         | Reuse the runtime attached to the compiled form in the customer-Node engine                                     | No second interpreter or automatic runtime import                            |
| sdk/components     | Typed logic-settable metadata and trusted registrations                                                         | Existing descriptors; no execution/UI import                                 |
| builder-core       | Atomic rule commands, locks, patches/history and reference diagnostics                                          | Initial headless commands                                                    |
| builder initial UI | Build logic badges/info chips, navigation and existing immediate frames/focus/loading/Retry                     | Initial; no rule-editor or graph-layout body                                 |
| Logic feature      | Rule list/editor, sentence pickers, nested All/Any, expression view, isolated test panel and CSS                | Lazy Logic activation; optional existing idle preload                        |
| map feature        | Compiled-graph layout/rendering, navigation and diagnostics                                                     | Separate request automatically after Logic mounts and is interactive         |
| Settings           | Component Logic tab/read-target lists/Add logic                                                                 | Existing lazy Settings body, still ≤8,000 bytes                              |

No new runtime dependency is planned. The map starts with an accessible DOM/SVG representation and
uses a text/list alternative for keyboard access; adding a graph library would require a measured
proposal. Build badges/chips read compact compiled summaries, omit zero counts and never run a graph
layout or whole-form validation during rendering. They remain present before Logic/map downloads.
Rule editing does not mutate runtime state or a definition directly: every accepted edit passes
through builder-core, with one JSON Patch/history entry. Test this rule uses an isolated session and
cannot mutate the builder's answers or contact providers without explicit host configuration.

### Compiler and runtime design

- Keep legacy `visibleWhen`, `disabledWhen` and `calculate` source JSON intact. Compile them into
  their existing legacy path; do not rewrite old definitions into root rules or require the opt-in
  entry for legacy forms. Root rules compose with that path through the registered execution hook.
  Optional root logic is additive to format 1.0; migration preserves absent logic and is idempotent.
- Compile each expression once. Record reads from `when`, action values/calculations and arguments,
  explicit trigger refs and object-scope paths. Build stable rule-id/component-id edges and reverse
  indexes once; precompute execution rank and ordered writers for each target property.
- State dependencies and edge triggers are distinct: a change to any state expression dependency
  invalidates its cached contribution even if that ref is not an explicit value/effect trigger.
  Evaluate affected conditions only, then fold contributions in definition order. Later matching
  writers win; legacy conditions are implicit position zero. No user-visible precedence change is
  permitted as an optimization. Disabling/removing a contribution reveals the preceding writer or
  stored static state rather than leaving stale state behind.
- Keep normalization, calculations, ordered/cascading rules, visibility, clear-on-hide, validation
  and publication in the session transaction. Topological scheduling accounts for interleaved
  calculations/rule writes. One synchronous change emits one StatePatch; existing asynchronous
  validation completion patches retain their current lifecycle. No unrelated control is replaced.
- Value/effect actions run once per applicable trigger edge. Track the last rule-written value and
  subsequent user-edit revision for revert; do not clear a later user answer. Recheck downstream
  dependencies on actual writes, skip equal writes and stop cascading with a diagnostic at depth 10.
  Compile strongly connected write/read cycles with every involved rule/component named. Report
  potentially overlapping property writers conservatively as warnings, without claiming to solve
  arbitrary expression satisfiability.
- Static/inherited protection and host read-only mode remain stronger than a rule's request to
  enable or make a field writable. Internal rule writes are trusted transaction writes:
  they normalize, become dirty and revalidate like edits, but are not rejected as attempted UI writes
  to a protected control. External user/API write contracts remain unchanged (ADR-0012/0017).
- Effects are headless requests, not DOM operations or package-owned network calls. Accepted API:
  optional typed effect data on StatePatch plus a session `triggerLogicEvent(name, payload?)` method
  for trusted host/Button events. The renderer/adapters deliver focus and host emit requests;
  refreshOptions reaches an explicitly configured provider/control hook. Node skips focus/emit,
  and trusted call functions execute only when `availableInNode` permits. Add README/spec/changeset
  and all-host tests when the API is implemented. No function comes from JSON.
- Customer Node runs the shared pipeline, derives load-rule state from final data and applies submit
  assignments. It rejects forged non-overridable calculations/submit results. Load value assignments
  are one-time editable initializers, never replayed in Node. All state actions remain enforced.
  Change/event writes and allowOverride:true values are editable; validation cannot infer client history.
- Rule creation/reorder/enable/delete/actions use commands. Check rule ids, target refs, type/property
  compatibility and locks before committing. Property metadata must explicitly permit logic writes;
  reject structural/key/type/slot/prototype writes. Existing definitions and answers are immutable.

### Accepted owner contract decisions — 2026-11-10

1. **Replay, corrected by owner 2026-11-11:** non-overridable continuous calculations and submit
   assignments are authoritative. Always recompute show/hide, enable/disable, required/optional,
   readOnly and permitted setProperty state from final data in Node, including load-rule state.
   Load setValue/clear are one-time editable initializers and MUST NOT be replayed/enforced in Node;
   this explicitly supersedes the 2026-11-10 load-authority decision. Change/event writes remain
   editable too. Browser submit already runs submit rules before payload capture: no additional
   canonicalization or effect replay. Reject setValue/clear to a non-overridable calculated field
   at compile with logic-calculation-conflict naming rule and field, exposed in Issues/Logic.
   Omitted allowOverride means false; allowOverride:true accepts ordinary editable writes. Root
   continuous calculate targets are protected unless the field explicitly allows overrides. validateSubmission selects the opt-in program's
   replay() capability in a private session, preserving the original program and requiring no new
   host option or environment probe. Replay policy stays in core/logic; no-logic legacy sessions
   retain their existing behavior.
   Regression evidence must cover retained A after source B, load state enforced on final data,
   compile refusal of change-rule 99 into calculated 2, and validation of editable override values.
2. **Effects:** typed StatePatch effects and `session.triggerLogicEvent` are accepted. Invoke each
   effect once after its transaction. Async call does not hold up that patch, cannot mutate its frozen
   snapshot and cannot silently write data on completion. Node awaits permitted calls during submit/
   validation, with a host-configurable timeout **default 5,000 ms** producing a diagnostic. Cancel
   pending work on dispose/destroy and prevent stale results/effects. Explicit subsequent session
   writes are separate transactions. Browser-only focus/emit are skipped by Node; call requires
   `availableInNode`. Packages do not make unconfigured network calls.
3. **Import:** all Form.io import, including the previously proposed narrow logic converter, is
   **out of M09c**. Move it to the **post-1.0 importer backlog**. Existing expression conversion APIs
   keep their current behavior; no new Form.io conversion helper ships in M09c. Never execute
   imported JavaScript or custom actions.

The registration shape is specified in spec 02. Public APIs get typed exports, README/spec/changeset
and Node/browser tests with implementation. These decisions close the original plan questions.

## Accepted size allowances and prototype review gate

All numbers are **Brotli bytes** under the established production consumer method, counting shared
chunks once. They are allowances, not measured implementation PASS results. Keep the original
M09b+ measurement artifacts/failed probes and disclose any moved code on both sides.

| Scope                                       | M09b+ baseline / prior gate                      | Accepted M09c ceiling or next gate                                                                    |
| ------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Builder UI initial (excludes builder-core)  | 31,769 / 31,800                                  | **32,600 maximum**                                                                                    |
| Builder-core marginal consumer contribution | 7,120 / 7,300                                    | **8,300 maximum**                                                                                     |
| No-logic consumer full initial closure      | Historical full baseline 67,674 / prior 67,700   | **68,500**, at most **+826** against that historical full baseline                                    |
| Logic-enabled consumer full initial closure | Prototype 71,036; final review before completion | **76,200 enabled full** (final runtime envelope 2026-11-12); matched form opt-in increment **≤7,000** |
| Matched no-logic form                       | Immutable main 28,232                            | **29,200** (final remaining-runtime envelope)                                                         |

A no-logic consumer imports/registers **no root-rule runtime**; absence of root rules in its current
JSON is insufficient if the runtime is still bundled. A builder always registers root logic, so its
actual closure is logic-enabled and must be reported as such. Measure genuine matched form consumers
with/without registration, and the actual canonical builder/host closures separately. Keep the
historical 67,674-byte builder artifact as history, not a relabeled new no-logic measurement. Never
externalize a required module and call the result a complete running consumer. Report emitted assets,
shared attribution and both comparable deltas; do not compare mismatched host/framework entries as
though their difference were the entry's cost. The prototype report must make all fixtures explicit
so the owner can approve the new logic-enabled gate for the actual consumers before shipping.

Only registration/diagnostic hooks and shared format support may affect consumers that do not opt in;
edge actions, otherwise/revert, cascade, effects/events and provenance stay entirely in the subpath.
The original proposed **75,700** full ceiling and unconditional core execution are superseded, not
approved. No automatic budget increase is authorized. Stop at the prototype report with measured
logic-enabled closure/ceiling, initial gate deltas, entry assets and work/performance evidence.

| Runtime/package scope             |           Merged package measurement | Existing ceiling | Proposal                                                                                 |
| --------------------------------- | -----------------------------------: | ---------------: | ---------------------------------------------------------------------------------------- |
| core                              | 12.13 kB (rounded size-limit output) |           30,000 | Keep root package ceiling; report separate logic entry/consumer bytes and no-logic delta |
| schema                            |                    5.66 kB (rounded) |           30,000 | Keep ceiling; report rule types/validation/meta-schema delta                             |
| validation                        |                    1.16 kB (rounded) |           30,000 | Keep ceiling; report shared-pipeline/forgery delta                                       |
| sdk / components / renderer-dom   |      4.79 / 3.23 / 9.42 kB (rounded) |      30,000 each | Keep ceilings; report metadata/effect-delivery delta                                     |
| standalone builder / builder-core |            30.19 / 9.73 kB (rounded) |  31,600 / 30,000 | Keep ceilings; these do not replace consumer gates                                       |

Package measurements above are historical rounded output from the final merged pinned verify,
not exact consumer attribution. Implementation reports include exact package values plus all three
consumer gates. Root-rule runtime code counts in every logic-enabled initial closure even while Logic UI is closed.
No-logic apps must not import/request it. Publish the root and opt-in entry assets separately; the
new logic entry's consumer ceiling remains subject to prototype review, not inherited from the root
package's 30,000-byte limit.

| Lazy closure / union                        | Merged builder-owned measurement | Existing ADR-0018 ceiling | Accepted M09c rule                                                         |
| ------------------------------------------- | -------------------------------: | ------------------------: | -------------------------------------------------------------------------- |
| Logic mode                                  |                        37 (stub) |                    10,000 | Keep ≤10,000; includes editor/test UI, CSS and owned shared dependencies   |
| Dependency map                              |                        37 (stub) |                    10,000 | Keep ≤10,000; includes layout/rendering, CSS and owned shared dependencies |
| JSON editor                                 |                              671 |                     8,000 | Unchanged                                                                  |
| Logic/JSON/map union                        |                              745 |                    28,000 | Unchanged; shared files counted once                                       |
| Settings, including its component Logic tab |                            7,704 |                     8,000 | Unchanged; measure tab integration before shipping                         |
| Logic/JSON/map/Settings union               |                            8,449 |                    36,000 | Unchanged; shared files counted once                                       |

Measure the established builder-owned lazy closures for their existing gates, and separately publish
actual full consumer first-open transfer closures and incremental files not already loaded initially.
Neither a naked entry-file size nor a closure that omits shared dependencies is sufficient. Include
Retry routes and the all-deferred union; do not double-count shared files or hide independent Retry
copies. Command bar/quick-add/bulk/planning/Data retain their existing limits. History/diff remains
unbudgeted and unshipped. No new feature chunk has an unlimited allowance.

Repeat consumer production measurements for vanilla, Vite/React, Angular CLI and script-tag per-theme
bundles/all-themes demo. Publish per-host/per-theme initial and first-open files, CSS/assets, registered
themes and shared attribution. Do not compare a full framework playground with the minimal consumer
as though they were the same gate. Keep all five themes, custom themes, host registries and form JSON
outside theme configuration changes. Existing M09b+ ceilings are not retrospectively changed.

## Loading contract and initial behavior

Initial Build imports neither Logic nor map **UI bodies/styles**; builder runtime registration is
separate and initial. Build badges/chips, selection, keyboard navigation, PointerDrag, context menu,
clipboard, Delete/Required and command-bar activation stay initial. Logic activation shows its frame
immediately and mounts an interactive editor first. **Right after Logic mounts, automatically request
the separate map entry**; show an accessible loading state in the right pane, then render the approved
screen-3 split view. Map download/failure never blocks Logic editing; show reason/Retry in that pane.
Do not steal focus. Navigation/destroy cancels pending pane activation; reopening reuses loaded code.
This replaces the originally proposed manual Open dependency map gate.

Keep `preload: 'none' | 'idle'`, default `none`: none makes no Logic/JSON requests; idle fetches only
Logic/JSON bodies, not map, command bar or History. Preloading an imported Logic module must not
mount it or trigger its map request; only actual interactive Logic mounting starts that request. Existing Settings/planning/Data idle policies
remain separate. Publish initial versus idle versus first-open/reopen requests independently.

Use the existing frame/focus/loading/reason/Retry lifecycle, clear only the completed loading
announcement, preserve schema/drafts/selection/history, and prevent stale mounts after navigation,
cancellation or destroy. Two builders remain isolated. Test failure/retry and local/offline assets,
custom `assetBase` and strict CSP in every supported host and Chromium/Firefox/WebKit. No extra CDN,
eval, unsafe-eval, injected executable JSON or external fonts/assets are required.

## Runtime performance and deterministic gates

The reference is immutable merged main `cd6d0b679027da328da9f5e4f63480437d6c765b`, not a moving
branch or the older pre-M09b+ runtime. Preserve the prior CSP-write negative control and failed-run
records. M09c acceptance requires **median paired form-runtime edit ratio ≤1.10** at each of
**100 / 500 / 1,000 fields** for **both no-logic and legacy-condition/calculation fixtures**, with
absolute main/candidate milliseconds and workload disclosed.
This is form-runtime edit latency, not builder command latency. Keep both no-root-rule fixtures and
semantically equivalent legacy visibility/calculation fixtures runnable on main and the candidate.
New root-rule-only features have no honest main equivalent; report their absolute timing and indexed
work separately rather than comparing a no-op main run to meaningful candidate work.

Use immutable production artifacts, the same Linux runner/pinned Playwright image, warm-up, identical
edit batches/values/settled validation and alternating main/candidate samples for at least five pairs.
Run timings in their own job with nothing else executing there; preserve ADR-0010's advisory CI
status. The ≤10% requirement is a delivery acceptance condition: a breached or unavailable comparison
prevents a GO recommendation until the cause/evidence is resolved, without introducing a flaky timing
assertion into correctness verify. No retries to manufacture green or cross-platform comparison.

Hard gates extend the existing processor/DOM/patch/render instrumentation with actual operations:

| Work fixture at each size (plus onboarding)         | Required deterministic assertion                                                                                     |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| No root rules, edit one independent field           | Zero root-rule condition/action/effect work; legacy processor/DOM/render counts unchanged                            |
| Many unrelated rules, edit a field they do not read | Zero unrelated condition evaluations/writer folds/effects; no scan of the full rule list                             |
| One changed source with known fan-out               | Exactly the affected condition/action-expression evaluations and affected target-property folds; no unrelated visits |
| Chained/colliding state writers                     | Deterministic order, equality skips, exact visited edges/writers/cascade steps, one final synchronous patch          |
| Edge actions and otherwise/revert                   | Exact actual writes/effects; once per edge; user provenance preserved                                                |
| Container visibility/read-only and hidden clearing  | Exactly the affected subtree work, no unrelated subtree processors or replaced controls                              |

Specify fixture-derived integers in committed baselines once the reviewed semantics are implemented;
do not invent PASS counts at plan time. Count index entries/visited edges, rule conditions, action
expressions, writer contributions, writes, effects, cascade depth, processors and StatePatch/render/DOM
work in the real execution path. Include same-work fixtures with 100/500/1,000 rules so field count
alone cannot conceal an O(all rules) scan. Exact counts fail on increase; decreases require the same
PR's reviewed baseline update. Extend baseline evolution checks without changing any old expectation.
Initialization/compile and steady-state edit counts are reported separately.

## Delivery sequence and review gates

1. Apply the owner's accepted amendments to ADR/specs 01/02/03/04/07/11, full pinned verify, then
   merge the amended plan PR only after first-attempt green CI on its final head. No runtime code
   or test/threshold changes belong in the plan PR; old-head success does not approve a new head.
2. Build the opt-in schema/runtime prototype and minimal hooks, preserving the legacy root path.
   Measure no-logic/logic-enabled/builder closures, package/lazy sizes, deterministic work and paired
   edit timing. **Stop for owner approval of the measured logic-enabled ceiling before shipping.**
3. Complete indexed rules, state/value/revert/cascade/authoritative replay, async calls with timeout/
   destroy cancellation, and Node/browser parity. Add typed SDK/adapter effects, READMEs, changesets
   and conformance; core/validation retain ≥90% line coverage and no DOM types.
4. Atomic commands/locks/history, initial Build badges/chips, lazy Logic/test panel and automatic
   separately requested map after interactivity. No Form.io import. Keep all old conditions and
   owner-protected initial interactions. Stop at any unmet ceiling/contract/correctness gate.
5. All consumer hosts/themes/CSP/offline/assetBase and lazy lifecycles, exact counts and ≤1.10 edit
   acceptance, five-theme axe/keyboard/visuals, onboarding map and fresh guide-only author trial.
   Preserve the prompt/report verbatim, fix gaps separately, full verify and first-attempt CI.
6. **Owner screenshot/delivery review gate**, then stop. No M09d implementation until authorized.

## Consequences

Legacy forms pay for their existing runtime plus bounded registration/format hooks, not root-rule
execution. Root-rule forms and the builder explicitly pay for the shared headless entry. Authoring
and map visualization remain separate lazy bodies. There is no second Node interpreter, no skipped
server state enforcement and no inferred client event history. The owner's accepted maximums do not
approve an unmeasured logic-enabled ceiling or mark implementation/performance/screenshots PASS.

## Amendment record

Owner approval on **2026-11-10** supersedes the original unconditional runtime/75,700 full proposal,
manual map activation and narrow Form.io converter. Accepted instead: pay-for-use core/logic,
missing-logic, builder registration, 68,500 no-logic full, 32,600 UI/8,300 builder-core maximums,
measured logic-enabled budget review (expected ≤6,000 incremental), automatic map after Logic
interactivity, authoritative versus editable-edge replay, typed effects/events, Node timeout 5 s
and destroy cancellation, post-1.0 importer backlog, and unchanged lazy/runtime-package limits.
Original proposal remains available in PR #18's earlier commit `c85e67a`; failed runs/baselines remain.

### Owner expression correction — 2026-11-10

The owner confirmed spec 11's literal `['US','CA']` list was a drafting error. Correct its example to
OR-of-eq and compile the Logic editor's **is one of** picker to OR-of-eq for now. Expr format,
evaluator and existing in semantics remain unchanged. Literal-list syntax (`list`, `literal` or
another representation) requires a separate explicitly approved spec 03 decision; it is outside M09c.

### Prototype measurement checkpoint — 2026-11-10, enabled gate proposed

The unpublished prototype measures **31,780 builder UI / 7,212 builder-core / 71,036 actual
logic-enabled builder full initial**. Matched real form consumers measure **29,395 no-logic /
31,306 enabled**, an opt-in increment of **1,911**; immutable main's same no-logic form is 28,232.
The root execution body is absent from no-logic consumers. The actual builder always registers it;
no externalized or relabelled builder is presented as a complete no-logic build.

**Request owner approval of a 74,500-byte enabled full closure**, retaining accepted 68,500
no-logic, 32,600 UI, 8,300 builder-core and every package/lazy limit. This proposed ceiling leaves
3,464 bytes above the partial prototype for unmeasured remaining runtime and integration. It is
not accepted by this checkpoint, not a forecast that completion fits, and not permission to raise
the gate automatically. Existing gate code still uses historical limits. Stop before shipping.

[Prototype evidence](../reviews/m09c-runtime-prototype.md) records exact bytes, five alternating
main/draft timing pairs (all six median ratios ≤1.10), actual indexed work, verification and API
additions. Effects/property overlays, complete interleaved scheduling and submission annotations
remain explicit gaps, alongside all authoring/map and final delivery work. No M09c completion or
full pinned verification of the draft is claimed.

## Owner amendment — calculation precedence, 2026-11-11

Accept the existing field calculate as position zero; active root calculate actions fold over it in
rule order, later active rule winning. When no root contribution is active, the field formula applies
again. Revert never clears to null while a preceding writer exists. The owner's reported browser null
and Node rejection are both bugs; do not reject the competing calculation at compile or add client
canonicalization. The field's allowOverride governs the combined result: false is authoritative and
forged results are rejected; true permits user override and Node validates that submitted value without
enforcing the derived formula. With no own formula, otherwise/revert retains its existing behavior.

Use the existing affected-node processor for combined derived expressions, with per-session opt-in
calculation contributions and immutable provenance. Small typed calculate/finalize hooks reuse the
existing LogicState lookup; they do not move rule execution into root core. Compiled graph traversal
and writer grouping stay opt-in. Test active=3, inactive=2, allowed user override accepted in Node and
non-overridable forgery rejected, including browser checks. Existing budgets, legacy no-logic behavior,
canonical validation and all correctness thresholds remain unchanged.

### Effects implementation checkpoint — 2026-11-12 (unreleased)

Implement the accepted typed optional StatePatch.effects and session event bridge through the
opt-in program. A session-local outbox publishes frozen requests first; host calls start in a
microtask afterwards. Optional HostFunction.effect receives cancellable typed context; existing
pure/legacy run arguments do not change. Node waits only availableInNode calls, with default
5,000 ms/configured timeout and diagnostics. Reset/dispose cancels queued/running calls and prevents
late publication; interrupted Node submission fails rather than reporting stale success.

The shared renderer exposes onLogicEffect and applies focus after the state update. The Element
adapter owns of-effect DOM events, React forwards the latest callback and Angular exposes a typed
logicEffect output. Keeping DOM event construction in Element avoids charging every form host for
that adapter. No root execution or rule meta-schema enters the no-logic consumer. Remaining property
overlays, authoring/map, full host/performance/size/visual/author evidence are still open. Accepted
ceilings remain unchanged; a failing draft measurement cannot be pushed or treated as delivery.
