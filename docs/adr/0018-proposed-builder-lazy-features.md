# ADR-0018 — Builder feature loading and size budgets

Status: accepted by the owner with amendments on 2026-10-22. Implement at the start of M09c, after M09b approval.

The M09b builder is close to its unchanged 30 kB compressed budget (last focused measurement:
29.92 kB). Additional Logic functionality should not increase the initial builder payload. M09b
ships no loading split; this ADR describes the M09c implementation and its acceptance checks.

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

| Entry          | Compressed limit  | What triggers its first load                  |
| -------------- | ----------------- | --------------------------------------------- |
| Core builder   | 26 kB after split | Import/create builder                         |
| Logic mode     | 10 kB             | First activation of root Logic mode           |
| JSON editor    | 8 kB              | First JSON mode or component Edit JSON action |
| Dependency map | 10 kB             | First request to open the dependency map      |

Command bar and History/diff must also have independent CI size budgets before their implementation
ships. Their numeric ceilings require a separate proposal; they do not inherit an unbounded allowance
or silently consume the existing 28 kB Logic/JSON/map allowance. The core target is **≤26 kB** after
the split, leaving room for M09b+. M09b retains its current 30 kB check until this split lands.

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
and each first-open route in the M09c performance report, using both cold and warm sessions.
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
existing correctness, accessibility and deterministic count gates. This work begins M09c only after
M09b approval. M09b+ remains a separate proposal awaiting owner review.
