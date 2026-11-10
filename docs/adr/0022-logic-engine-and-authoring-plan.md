# ADR-0022 — Logic engine placement, lazy authoring and M09c allowances

Status: **accepted by the owner on 2026-11-10, with the amendments below**
Date: 2026-11-09
Milestone: M09c (accepted plan; implementation evidence remains pending)

## Context

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
- Customer Node runs the shared pipeline, including load and submit phases, canonicalizes values and
  rejects forged non-overridable calculations/rule-set results. Test required/visibility/revert and
  user-overridable edge assignments separately. Calculations and load/submit assignments are
  authoritative; state actions are always enforced server-side. Change/event setValue/clear remain
  user-editable and their submitted values are not rejected as forgery merely for differing from a
  past edge result. Validation cannot infer a client's event history.
- Rule creation/reorder/enable/delete/actions use commands. Check rule ids, target refs, type/property
  compatibility and locks before committing. Property metadata must explicitly permit logic writes;
  reject structural/key/type/slot/prototype writes. Existing definitions and answers are immutable.

### Accepted owner contract decisions — 2026-11-10

1. **Replay:** calculations and load/submit-triggered assignments are authoritative. Always recompute
   show/hide, enable/disable, required/optional, readOnly and permitted setProperty state in Node.
   Change/event setValue/clear are user-editable and are not forgery; a later authoritative assignment
   is still enforced. Use the shared registered runtime, not client state or claimed event history.
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

| Scope                                       | M09b+ baseline / prior gate                    | Accepted M09c ceiling or next gate                                                                                                                 |
| ------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Builder UI initial (excludes builder-core)  | 31,769 / 31,800                                | **32,600 maximum**                                                                                                                                 |
| Builder-core marginal consumer contribution | 7,120 / 7,300                                  | **8,300 maximum**                                                                                                                                  |
| No-logic consumer full initial closure      | Historical full baseline 67,674 / prior 67,700 | **68,500**, at most **+826** against that historical full baseline                                                                                 |
| Logic-enabled consumer full initial closure | New gate; no prototype measurement yet         | **Measure and propose a numeric ceiling; owner approval before shipping**. Expected opt-in increment **≤6,000 over the matched no-logic consumer** |

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
