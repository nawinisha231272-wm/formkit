# ADR-0022 — Logic engine placement, lazy authoring and M09c allowances

Status: **proposed — owner review required before implementation**
Date: 2026-11-09
Milestone: M09c (plan only)

## Context

The owner approved M09b+ at `a9899587bd9369589e2cc9729dbc73238c33e7df`.
PR #16 merged as `cd6d0b679027da328da9f5e4f63480437d6c765b` after both Verify
runs succeeded on attempt 1. This merge is the immutable M09c comparison baseline.
Spec 11 defines root rules, browser/customer-Node parity, Logic authoring and a dependency map.
M09b+ already provides reserved Logic/map entries, accessible feature loading, compact expression
editors, command history, Build condition chips and all five themes. The reserved entries are stubs,
not an implemented rule engine or usable Logic screen.

The final consumer build measures **31,769 UI / 7,120 builder-core / 67,674 full initial** Brotli
bytes. Current ceilings are **31,800 / 7,300 / 67,700**, leaving **31 / 180 / 26 bytes**.
Adding a headless engine cannot honestly be called a zero-initial-byte UI feature. The owner requires
an allowance proposal for each milestone starting with M09c. Nothing in this ADR changes the size
scripts, adopts a proposed ceiling automatically or starts implementation.

Baseline evidence: [final consumer measurement](../reviews/m09b-plus-followup-evidence/final-consumer-size.json),
[full proof and performance diagnosis](../reviews/m09b-plus-owner-followup.md),
[PR #16](https://github.com/nawinisha231272-wm/formkit/pull/16).

## Options considered

1. Put execution in builder or a lazy Logic view. Rejected: runtime forms and customer Node must
   enforce the same rules without loading a builder or DOM package.
2. Duplicate rules in validation. Rejected: it would create different ordering, hidden-field and
   forged-value behavior between browser and Node.
3. Extend the existing core compiler/session graph; keep authoring and graph visualization lazy.
   Proposed: one execution pipeline, no browser dependency in headless packages and indexed edits.
4. Rescan every rule on every edit. Rejected: derived state can be recomputed from cached ordered
   contributions without re-evaluating unrelated expressions or regressing sparse updates.

## Proposed placement

| Layer                  | Responsibility                                                                                                                                                 | Loading                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| schema                 | Root `logic` wire types, structural validation/meta-schema, safe migration and submission-schema annotations                                                   | Initial when schema/core is used                                  |
| core                   | Compile expressions/rules, read/write/trigger indexes, graph/cycle/conflict diagnostics, scheduling, state contributions, value provenance and effect requests | Initial runtime; no builder or DOM                                |
| validation             | Reuse the same core session for load/submit processing and canonical/forged-value checks                                                                       | Existing validation entry, no second interpreter                  |
| sdk/components         | Typed `logicSettable` property metadata and trusted registrations; controls keep consuming ordinary state/config                                               | Existing descriptors; no Logic UI import                          |
| builder-core           | Atomic rule commands, lock checks, patches/history and reference diagnostics                                                                                   | Initial headless commands, within its own consumer gate           |
| builder initial UI     | Build badges/info chips and navigation into Logic; existing immediate frames/focus/loading/Retry and dispatch hooks                                            | Initial; no graph-layout or rule-editor code                      |
| Logic feature          | Rule list/editor, sentence pickers, nested All/Any, synchronized expression view, sample-input test panel and feature CSS                                      | Lazy on Logic activation; optional existing idle policy           |
| dependency-map feature | Graph layout/rendering, pan/navigation, selection and diagnostic presentation                                                                                  | Separate lazy entry, only when the map is opened                  |
| generated Settings     | Component Logic tab, read/target rule lists and Add logic affordance                                                                                           | Existing lazy Settings entry; still within its 8,000-byte ceiling |

No new runtime dependency is planned. The map starts with an accessible DOM/SVG representation and
uses a text/list alternative for keyboard access; adding a graph library would require a measured
proposal. Build badges/chips read compact compiled summaries, omit zero counts and never run a graph
layout or whole-form validation during rendering. They remain present before Logic/map downloads.
Rule editing does not mutate runtime state or a definition directly: every accepted edit passes
through builder-core, with one JSON Patch/history entry. Test this rule uses an isolated session and
cannot mutate the builder's answers or contact providers without explicit host configuration.

### Compiler and runtime design

- Keep legacy `visibleWhen`, `disabledWhen` and `calculate` source JSON intact. Compile them into
  the common execution representation; do not rewrite old definitions into root rules. Optional
  root logic is additive to format 1.0; migration preserves absent logic and is idempotent. This
  versioning treatment is a proposal for review, not a code change.
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
  enable or make a field writable. Proposed internal rule writes are trusted transaction writes:
  they normalize, become dirty and revalidate like edits, but are not rejected as attempted UI writes
  to a protected control. External user/API write contracts remain unchanged (ADR-0012/0017).
- Effects are headless requests, not DOM operations or package-owned network calls. Proposed API:
  optional typed effect data on StatePatch plus a session `triggerLogicEvent(name, payload?)` method
  for trusted host/Button events. The renderer/adapters deliver focus and host emit requests;
  refreshOptions reaches an explicitly configured provider/control hook. Node skips focus/emit,
  and trusted call functions execute only when `availableInNode` permits. Add README/spec/changeset
  and all-host tests before any approved API is implemented. No function comes from JSON.
- Customer Node runs the shared pipeline, including load and submit phases, canonicalizes values and
  rejects forged non-overridable calculations/rule-set results. Test required/visibility/revert and
  user-overridable edge assignments separately: a legitimate later user edit is not automatically
  a forged rule output. The exact canonical replay policy needs the decision below before coding.
- Rule creation/reorder/enable/delete/actions use commands. Check rule ids, target refs, type/property
  compatibility and locks before committing. Property metadata must explicitly permit logic writes;
  reject structural/key/type/slot/prototype writes. Existing definitions and answers are immutable.

### Proposed contract decisions still requiring owner review

Spec 11 supplies the actions and ordering; it does not settle these interaction boundaries. Record
and resolve them before implementation rather than inventing behavior in code:

1. **Submission replay versus editable edge values.** `setValue` may be overwritten by a user, while
   parity says disagreeing rule-set submissions are rejected. Proposed split: replay load/submit
   assignments and continuous calculations as authoritative; change/event assignments remain editable
   unless the same assignment is enforced again by load/submit. A customer-Node validator cannot
   infer a client's event history from submission JSON. Confirm this distinction and its error cases.
2. **Trusted effects and asynchronous calls.** Approve the optional effect/event API above and define
   how an asynchronous `call` reports failure/cancellation. Proposal: invocation occurs once after
   the originating transaction; a returned Promise is lifecycle-tracked, does not delay its patch,
   cannot mutate the frozen invocation snapshot, and yields diagnostics rather than a late implicit
   data write. Node awaits allowed calls during submit/validation. Explicit later session writes
   start a separate transaction. Unknown names or unavailable required functions are diagnostics.
3. **Import boundary.** Spec 11 mentions `fromFormio`, while architecture 00 defers a general Form.io
   importer. Proposed M09c scope is a narrowly documented logic-conversion helper for the specified
   simple/JSON-logic/property/static-value subset, using existing expression conversion. Unsupported
   JS/custom actions yield diagnostics without execution. A general schema/layout importer stays out.

These are plan-review questions, not implemented exceptions to spec 11. Owner acceptance must be
reflected in specs 01/02/03/04/07/11 and this ADR before the first implementation commit.

## Proposed size allowance (unmeasured implementation)

All numbers are **Brotli bytes**, using the existing production consumer method. The measured
baseline comes from the merged build; proposed growth is an engineering allowance, not a predicted
measurement or a PASS. The current gate scripts remain unchanged in the plan PR.

| Initial gate                                | M09b+ measured | Current ceiling | Proposed M09c maximum growth from baseline | Proposed M09c ceiling |
| ------------------------------------------- | -------------: | --------------: | -----------------------------------------: | --------------------: |
| Builder UI initial (excludes builder-core)  |         31,769 |          31,800 |                                       +800 |                32,600 |
| Builder-core marginal consumer contribution |          7,120 |           7,300 |                                     +1,000 |                 8,300 |
| Full initial consumer closure               |         67,674 |          67,700 |                                     +8,000 |                75,700 |

The proposal therefore asks for ceiling changes of **+800 UI / +1,000 builder-core / +8,000 full**.
Enforce both the reviewed maximum growth and absolute ceilings during implementation; unused
allowance is not permission to add other milestones. The full allowance includes shared core/schema
runtime and all initial glue. A preliminary allocation is up to 6,000 for core execution, 1,000 for
headless authoring and 800 for Build summaries/activation, leaving 200 for other shared changes.
Compressed marginal measurements are non-additive; the actual joint consumer build is authoritative.
No code is relabeled to escape a gate. Moving any existing code requires a before/after ledger.
If the prototype does not fit, stop with measured options; do not raise ceilings automatically.

| Runtime/package scope             |           Merged package measurement | Existing ceiling | Proposal                                                                                  |
| --------------------------------- | -----------------------------------: | ---------------: | ----------------------------------------------------------------------------------------- |
| core                              | 12.13 kB (rounded size-limit output) |           30,000 | Keep ceiling; target rule-engine delta ≤6,000, report exact production bytes before/after |
| schema                            |                    5.66 kB (rounded) |           30,000 | Keep ceiling; report rule types/validation/meta-schema delta                              |
| validation                        |                    1.16 kB (rounded) |           30,000 | Keep ceiling; report shared-pipeline/forgery delta                                        |
| sdk / components / renderer-dom   |      4.79 / 3.23 / 9.42 kB (rounded) |      30,000 each | Keep ceilings; report metadata/effect-delivery delta                                      |
| standalone builder / builder-core |            30.19 / 9.73 kB (rounded) |  31,600 / 30,000 | Keep ceilings; these do not replace consumer gates                                        |

Package measurements above are historical rounded output from the final merged pinned verify,
not exact consumer attribution. Implementation reports include exact package values plus all three
consumer gates. Runtime code is counted in the full initial closure even when UI is closed, because
ordinary forms/Node must enforce logic without downloading a builder feature.

| Lazy closure / union                        | Merged builder-owned measurement | Existing ADR-0018 ceiling | M09c proposal                                                              |
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

Initial Build imports neither Logic nor map bodies/styles. Build badges/chips, selection, keyboard
navigation, PointerDrag, context menu, clipboard, Delete/Required and command-bar activation remain
initial. Opening Logic immediately shows the existing accessible frame and lazy loading state; opening
the map loads its independent body only. The Logic screen initially offers an Open dependency map
control/placeholder; it does not fetch the right-hand visualization merely by selecting Logic. After
activation, its split view matches approved screen 3. This explicit map activation preserves ADR-0018's
separate first-open boundary and is part of the proposal for owner review.

Keep `preload: 'none' | 'idle'`, default `none`: none makes no Logic/JSON requests; idle fetches only
Logic/JSON bodies, not map, command bar or History. Existing Settings/planning/Data idle policies
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
**100 / 500 / 1,000 fields**, with absolute main/candidate milliseconds and workload disclosed.
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

1. Owner reviews this ADR, size allowance and the contract questions. Merge the plan PR only after
   explicit plan approval and first-attempt green CI. Do not begin implementation in that PR.
2. Approve/update precise wire/runtime/effect/import contracts and fixtures. Implement schema and
   indexed compiler/session execution with Node/browser parity before any authoring screen.
3. Add effect delivery and model metadata through public SDK/adapters; typed APIs, package READMEs,
   changesets and conformance accompany API additions. Keep no-DOM coverage ≥90% in core/validation.
4. Add rule commands/locks/history, then lazy Logic editors/test panel and separate lazy map. Maintain
   every existing conditional/calculation behavior and all owner-protected initial interactions.
5. Measure all three initial gates, each package/lazy closure/union, consumer-host route loading and
   edit A/B/count evidence. Any unmet allowance or unresolved semantic question stops shipping.
6. Five-theme axe/keyboard/native-host/visual checks, onboarding map and fresh no-context author trial.
   Preserve the prompt/report verbatim, fix every gap separately, full pinned verify, first-attempt
   green current-head CI and owner screenshot/delivery review. Stop; no M09d work.

## Consequences

Execution is shared and unavoidable for runtime correctness; only authoring and visualization are
lazy. The graph and diagnostic metadata have one source of truth. The proposed initial allowance is
explicit, bounded and not yet approved; runtime package and lazy ceilings do not silently grow.
Plan status is not a GO decision for rule behavior, screenshots, performance or implementation.
