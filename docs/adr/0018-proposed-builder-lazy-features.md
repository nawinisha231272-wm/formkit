# ADR-0018 — Builder feature loading and size budgets

Current enforcement: the owner-approved 2026-10-28 reset below supersedes earlier size tables:
**UI 31,600 / builder-core 7,300 / full initial 67,400 / standalone builder 31,600 bytes.**
Earlier measurements, ceilings and rejected probes remain historical evidence.
Status: accepted by the owner, including the explicit 2026-10-28 size reset and lazy-body amendments. Implementation is M09b+; earlier decisions remain recorded below.

The M09b builder is close to its unchanged 30 kB compressed budget (last focused measurement:
29.92 kB). Additional Logic functionality should not increase the initial builder payload. M09b
ships no loading split; this ADR describes the M09b+ implementation and its acceptance checks.

## Accepted boundaries

Keep `@ourform/builder` as the public entry point and controller. Retain palette, canvas, outline,
selection, commands, generated component settings, compact Conditional/calculated expressions,
themes, Data/Preview and host events in the core builder. Dynamic imports load internal feature
entries on first activation: root Logic mode, JSON editor, dependency map, History/diff view,
and the Ctrl/Cmd+K command bar when M09b+ adds it. These feature views and their feature-only
search, rendering and diff dependencies move out of core. The headless command history and undo/redo
remain in core; loading the History view must not be necessary to undo an edit. Imports are cached
per module; feature state, subscriptions and DOM belong to each builder instance. Dependencies
continue to follow the architecture; headless packages acquire no browser or feature dependencies.

| Entry / accounting scope                                                | Compressed limit                                                            | What triggers its first load                                                   |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Builder UI initial (excludes builder-core), after consumer build        | ≤29 kB                                                                      | Import/create builder, including Neutral chrome and registered builder recipes |
| Entire initial transitive closure, including runtime/shared code/styles | ≤64,613 bytes; no growth                                                    | Initial builder load; deferred chunks excluded only while not requested        |
| Builder-core initial contribution (marginal consumer build)             | ≤7,050 bytes                                                                | Initial builder load                                                           |
| Shared form-runtime dependencies                                        | Existing package budgets, unchanged; reported fully, each shared chunk once | As required by the initial/first-open route                                    |
| Logic mode                                                              | 10 kB                                                                       | First activation of root Logic mode                                            |
| JSON editor                                                             | 8 kB                                                                        | First JSON mode or component Edit JSON action                                  |
| Dependency map                                                          | 10 kB                                                                       | First request to open the dependency map                                       |

Command bar and History/diff must also have independent CI size budgets before their implementation
ships. The command-bar ceiling is now approved below; History/diff still requires a separate proposal.
They do not inherit an unbounded allowance
or silently consume the existing 28 kB Logic/JSON/map allowance. The core target is **≤29 kB** after
the split, including approximately 1 kB headroom for M09b+.

Owner accounting amendment (2026-10-23), accepted in ADR-0020: the builder-owned ceiling is
initial code/styles on top of the existing form runtime, not a substitute for reporting the whole
initial closure. Also gate that full initial transitive closure at **64,613 Brotli bytes, no growth**.
A later increase requires a measured proposal and explicit owner approval. Shared runtime remains
under its existing budgets and appears fully in every report, with each shared chunk attributed once.
Lazy Logic/JSON/map/command-bar/History chunks stay outside the initial closure only while deferred
and remain under their own budgets. Do not conceal an initial request as deferred bytes.

Size each entry **after a consumer production build**, as consumers receive it, including runtime
loader code and CSS/assets required by the route. Cover Vite/React, Angular CLI, vanilla and the
script-tag distribution. Publish emitted entry/chunk sizes and the union of shared chunks counted
once, rather than summing duplicated dependency closures. Keep per-route transfer accounting as well.
Use the existing size-limit compression method and pinned build tooling for every entry. Account
for shared lazy dependencies exactly once in an additional aggregate deferred budget of 28 kB;
report the actual transfer closure of each first-open route, including shared chunks. Do not omit
shared chunks or move core code into unbudgeted files. Exceeding an accepted ceiling requires an explicit owner decision, never an automatic baseline increase.

## First-open behavior and evidence

Initial Build must request none of the deferred feature entries. Opening Logic loads only Logic and
its declared shared dependencies; it must not preload the map or JSON editor. Opening JSON loads
only its editor closure; opening the dependency map loads its closure (including Logic only if the
implementation actually requires it). Reopening an already loaded feature makes no new module
request. Record emitted filenames, compressed bytes and observed network requests for initial Build
and each first-open route in the M09b+ loading report, using both cold and warm sessions.
The exact emitted chunk names and measured route bytes are pending implementation, not claims about
M09b.

Host option `preload: 'none' | 'idle'` defaults to `'none'`. With `none`, creating an idle builder
makes no deferred-feature requests; test this explicitly. With `idle`, fetch Logic and JSON after
the builder is idle, without mounting either view. Do not preload the dependency map, command bar or
History/diff. Record idle requests separately from initial and first-open requests; cleanup must
cancel pending idle scheduling when the builder is destroyed.

The script-tag/CDN distribution exposes configurable `assetBase` for resolving deferred assets.
The CDN is a distribution option, not a required network service: all chunks/assets can be mirrored
and served locally. Every example must work offline from locally served assets under a strict CSP,
without eval, unsafe-eval, unsafe-inline requirements or third-party asset requests. Test lazy routes,
assetBase resolution and both preload modes in Vite (React), Angular CLI, vanilla and script-tag cases.
Record the CSP and offline serving setup with the consumer-build evidence.

Show an accessible loading state with focus retained at the activating control. Loading failures
show a retry action and preserve schema, selection, history and unsaved edits. A cancelled or stale
activation cannot mount a feature after navigation or destroy. Lock checks and validated JSON apply
remain in builder-core; lazy UI modules cannot bypass them. Multiple builders must remain isolated.

Acceptance: separate unchanged-budget checks in CI; network assertions for every route; first-open,
reopen, failure/retry, cancellation/destroy and host isolation checks; all supported browsers and
existing correctness, accessibility and deterministic count gates. This split begins M09b+, after
M09b approval, before the approved authoring shortcuts are implemented.

## Owner amendment — M09b+ interaction contracts

The split is the first M09b+ task, with command-bar loading deferred from its first release and core
≤29 kB. Inline label editing opens the dialog for translation-key labels. Quick-add lists only
components accepted by the destination slot. Outline multi-selection uses Shift+arrows. Bulk editing
shows shared properties only. Cross-scope moves are refused atomically, with a visible reason.

## Owner amendment — generated Settings boundary (2026-10-25)

Generated Settings UI and its styles are a separate lazy entry. The modal/drawer frame, focus and
accessible loading/error state, command dispatch, locks, schema state, validation, and private Add
draft semantics remain initial. PointerDrag and its first-pointerdown response remain initial.
Settings preloads after first render at idle by default; hosts can set `settingsPreload: 'none'`.
This is separate from `preload`, whose accepted default remains `none` for Logic/JSON.

Add/Edit opens its frame immediately with `aria-busy` and an announcement. Failure displays the
reason and Retry; Add also offers “Add with defaults”, exactly matching `openOnAdd:false`. Cancel
discards the private Add with no history entry. Slow, failed, retried and cancelled loading preserves
focus, schema, selection, draft and history. Cover strict CSP, offline/custom `assetBase`, and all
three browsers. Settings receives an independent measured budget outside the 28 kB Logic/JSON/map
aggregate; its ceiling and the revised deferred-union ceiling require owner approval before shipping.

The full-initial ceiling remains 64,613 bytes. The later opt-in-theme amendment below supersedes the
26,000-byte builder-owned ceiling and the candidate-deferral instruction.

## Owner amendment — opt-in themes and final initial boundary (2026-10-26)

Themes are explicit per builder instance. `@ourform/builder` imports Neutral chrome only; form themes
come from `@ourform/themes/<name>` and matching builder recipes from
`@ourform/builder/themes/<name>`. The picker lists only registered themes. A host may register a lazy
theme loader under the same accessible loading/retry/focus, offline, strict-CSP and `assetBase`
principles as other lazy features. Material registers Base as its dependency. Custom
`defineBuilderTheme` recipes use the same instance registry. Generated script-tag bundles provide one
entry per theme plus an all-themes playground entry. Compatibility entries remain during migration;
form JSON does not change.

Ship measured option B: generated Settings remains lazy, while context menu, toolbar More, Issues and
all clipboard UI/handlers stay initial. Do not ship a secondary-tools chunk. The builder UI initial (excludes builder-core)
ceiling rises from 26,000 to **29,000 Brotli bytes** because Neutral plus the match-form/theme registry
(approximately 1.4 kB) move into builder-owned accounting and M09b+ retains about 1 kB headroom. The
full initial closure remains the primary no-growth gate at **64,613 bytes**. Settings stays ≤8,000;
Logic/JSON/map stays ≤28,000 combined; Logic/JSON/map/Settings stays ≤36,000. Every feature PR reports
builder-owned and full-closure deltas. New menus, panels and dialogs are lazy by default; crossing
either initial ceiling stops for an owner decision.

## M09b+ implementation evidence — 2026-10-26

The accepted option-B split and opt-in-theme design are implemented on the M09b+ branch. Generated
Settings is lazy and defaults to idle preload; its frame, focus, draft/history semantics, validation,
failure/Retry and Add-with-defaults behavior remain initial. Pointer drag, context/More menus, Issues
and every clipboard handler/buffer/system operation remain initial. No `secondary-tools` entry ships.

The pinned consumer probe measures **27,484** builder UI initial (excludes builder-core) bytes and **61,049** full minimal
initial bytes (Brotli). Settings is **7,391**; Logic/JSON/map is **745**; their union with Settings is
**8,136**; all currently emitted deferred entries total **8,524**. These pass every accepted ceiling.
Framework and per-theme script-distribution closures are recorded separately in
`docs/reviews/m09b-plus-loading-split.md`; they include host/framework/built-in code and do not replace
the canonical minimal-consumer gates. Browser coverage exercises Vite vanilla/React, Angular CLI and
script-tag hosts under strict CSP, local/offline assets and custom `assetBase`, with Settings lifecycle
and lazy-theme failure/retry in Chromium, Firefox and WebKit.

## Owner amendment — command bar and multi-select, 2026-10-27

The command-bar consumer closure has an approved **4,500 Brotli-byte** ceiling with lazy indexing.
Builder UI initial (excludes builder-core) remains ≤29,000 bytes (target ≤28,800); the full initial closure remains
≤64,613 bytes. Preserve all owner-protected initial behavior and defer nothing else without approval.
Before shipping either the command bar or multi-select, measure their combined initial builder-owned
and full-closure sizes, and measure the separately lazy bulk editor with a proposed ceiling. If the
combined initial exceeds 29,000, present measured compaction or shared headless selection alternatives.

On first Ctrl/Cmd+K the accessible frame appears immediately. Indexing the 500-field fixture is
advisory ≤50 ms and has a deterministic index-work count gate; typing is never blocked by results.
Reopening uses the cached index, rebuilt only on schema changes. History/diff remains unbudgeted
and unshipped.

## Owner amendment — quick-add budget, 2026-10-27

| Consumer-built lazy closure         | Brotli ceiling |
| ----------------------------------- | -------------: |
| Quick-add (including Retry closure) |    3,750 bytes |
| Command bar (lazy indexing)         |    4,500 bytes |

Every future lazy chunk requires an owner-approved ceiling before shipping. Quick-add measured
3,403 bytes including shared chunks; the size gate enforces its main and Retry closures.

## Owner decision — builder-core consumer accounting

Keep the established builder UI boundary, now named **builder UI initial (excludes builder-core)**,
and the full initial closure boundary. Report builder-core separately as the marginal Brotli difference
between the full consumer build and the otherwise identical build with `@ourform/builder-core`
externalized; static shared output is counted once in each closure. Compression and chunk changes
mean this is a marginal contribution, not a sum of independently compressed source files. At the
the baseline measures **6,675 bytes**. The owner confirmed the **7,050-byte** ceiling (105%,
rounded up to 50), and the third gate is enforced. Every combined-feature
report must show all three measurements and moved-code attribution. Headless selection may move to
builder-core only within the confirmed ceiling; full closure remains at most 64,613 bytes. Compact
first, then measure headless placement, then propose at most a one-time 29,500 UI ceiling if needed.

## Owner work-mode amendment — 2026-10-27

Complete the combined command-bar/multi-select/bulk-editor prototype and work-count/timing probes before
compaction. Measure UI, builder-core and full initial against 28,857 / 6,675 / 63,623 bytes. Compact
first and discard growing variants, then allow headless selection placement only within the enforced
7,050-byte core contribution. If still needed, the owner pre-approved one final UI ceiling equal to the
measured value rounded up to 50, at most 29,500, while full initial remains at most 64,613. Record the
actual amendment only after measurement; the current UI ceiling remains 29,000 until then.

New lazy chunk ceilings are pre-approved by formula: measured closure plus 10%, rounded up to 50,
at most 5,000 bytes. This does not change existing command-bar, quick-add, Settings or aggregate
ceilings. Each new ceiling is recorded and enforced before shipping. Immediate command frame, selection
highlighting/Shift arrows, clipboard, context menu and PointerDrag stay initial. History/diff remains
unbudgeted and unshipped. Every push requires a passing full pinned verify; do not merge this milestone.

## M09b+ bulk-editor measurement — 2026-10-28

Under the owner's pre-approved work-mode rule 4, the new bulk editor's consumer-built closure
measures **4,266 Brotli bytes** (Retry 4,252). Its enforced ceiling is **4,700 bytes**:
`ceil(4266 × 1.10 / 50) × 50`. Shared generated editor and message chunks count once per closure;
this is not its entry file in isolation. The command bar retains its 4,500-byte ceiling. UI initial
remains 29,000, builder-core 7,050, and full initial 64,613. The combined prototype exceeds the
initial gates and remains unshipped; no one-time UI increase is applied while the full gate fails.
See [combined prototype measurement](../reviews/m09b-plus-combined-prototype-measurement.md).

## Owner size reset and two additional lazy bodies — 2026-10-28

The owner explicitly approved lazy bulk Move/Wrap/Duplicate/Paste planning and the Data inspector
body, with separate `planningPreload` and `dataPreload` policies, both defaulting to `idle` (`none`
opts out). Their accessible activation frame, focus, reason/Retry and cancellation remain initial.
Bulk Delete/Required, Delete key, clipboard handlers/buffer/system access, selection, Shift arrows,
Ctrl/Cmd+K frame, context menu and PointerDrag remain initial. Pending planning snapshots the source
schema; intervening schema changes refuse the operation without history. Cancel/destroy never applies
late mutations. Preloading imports bodies only; it never mounts or mutates them.

The completed boundary measurement uses the same consumer method and accounting as every earlier
report. Before: UI **31,951**, builder-core **7,173**, full initial **67,628**. After: **31,069 /
7,196 / 66,818**. UI drops 882, core marginal contribution rises 23 (no core source changes), full
drops 810. The owner authorized one ceiling reset using measured +500, rounded up to 100, subject
to UI 32,000/full 68,500 maxima; all measurements are within those maxima:

| Enforced consumer gate                     |               Measured | New ceiling | Previous ceiling |
| ------------------------------------------ | ---------------------: | ----------: | ---------------: |
| Builder UI initial (excludes builder-core) |                 31,069 |  **31,600** |           29,000 |
| Builder-core marginal initial contribution |                  7,196 |   **7,300** |            7,050 |
| Full initial closure                       |                 66,818 |  **67,400** |           64,613 |
| Standalone builder package                 | reported by size-limit |  **31,600** |           30,000 |
| Bulk planning / Retry closure              |             1,547 each |   **1,750** |              new |
| Data inspector / Retry closure             |               269 each |     **300** |              new |

New lazy ceilings follow rule 4: measured +10%, rounded up to 50, at most 5,000. All earlier lazy
and aggregate ceilings stay unchanged. Independent-entry duplication (deferred union 15,399 →
32,900) is explicitly accepted by the owner; the two additional approved bodies bring the union to
**36,532**, counting each shared output once. The complete measurement and every rejected probe
remain in `docs/reviews/m09b-plus-combined-evidence/`; the failed attempts are not overwritten.

No more byte-hunting probes for the rest of M09b+. Remaining polish must fit these ceilings; new
bodies are lazy by default. No History/diff ships. From M09c onward, each milestone must propose
initial/lazy allowances for explicit owner approval before implementation. This reset is not an
open-ended future budget increase and does not authorize correctness-test changes.
