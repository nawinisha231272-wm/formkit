# ADR-0018 — Builder feature loading and size budgets

Status: accepted by the owner with amendments on 2026-10-22. Implement at the start of M09b+, after M09b approval.

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
| Builder-owned initial code/styles, after consumer build                 | ≤29 kB                                                                      | Import/create builder, including Neutral chrome and registered builder recipes |
| Entire initial transitive closure, including runtime/shared code/styles | ≤64,613 bytes; no growth                                                    | Initial builder load; deferred chunks excluded only while not requested        |
| Shared form-runtime dependencies                                        | Existing package budgets, unchanged; reported fully, each shared chunk once | As required by the initial/first-open route                                    |
| Logic mode                                                              | 10 kB                                                                       | First activation of root Logic mode                                            |
| JSON editor                                                             | 8 kB                                                                        | First JSON mode or component Edit JSON action                                  |
| Dependency map                                                          | 10 kB                                                                       | First request to open the dependency map                                       |

Command bar and History/diff must also have independent CI size budgets before their implementation
ships. Their numeric ceilings require a separate proposal; they do not inherit an unbounded allowance
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
all clipboard UI/handlers stay initial. Do not ship a secondary-tools chunk. The builder-owned initial
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

The pinned consumer probe measures **27,484** builder-owned initial bytes and **61,049** full minimal
initial bytes (Brotli). Settings is **7,391**; Logic/JSON/map is **745**; their union with Settings is
**8,136**; all currently emitted deferred entries total **8,524**. These pass every accepted ceiling.
Framework and per-theme script-distribution closures are recorded separately in
`docs/reviews/m09b-plus-loading-split.md`; they include host/framework/built-in code and do not replace
the canonical minimal-consumer gates. Browser coverage exercises Vite vanilla/React, Angular CLI and
script-tag hosts under strict CSP, local/offline assets and custom `assetBase`, with Settings lifecycle
and lazy-theme failure/retry in Chromium, Firefox and WebKit.

## Owner amendment — command bar and multi-select, 2026-10-27

The command-bar consumer closure has an approved **4,500 Brotli-byte** ceiling with lazy indexing.
Builder-owned initial remains ≤29,000 bytes (target ≤28,800); the full initial closure remains
≤64,613 bytes. Preserve all owner-protected initial behavior and defer nothing else without approval.
Before shipping either the command bar or multi-select, measure their combined initial builder-owned
and full-closure sizes, and measure the separately lazy bulk editor with a proposed ceiling. If the
combined initial exceeds 29,000, present measured compaction or shared headless selection alternatives.

On first Ctrl/Cmd+K the accessible frame appears immediately. Indexing the 500-field fixture is
advisory ≤50 ms and has a deterministic index-work count gate; typing is never blocked by results.
Reopening uses the cached index, rebuilt only on schema changes. History/diff remains unbudgeted
and unshipped.
