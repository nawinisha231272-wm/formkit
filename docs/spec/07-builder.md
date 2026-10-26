# 07 — Builder

Status: normative. Packages: `@ourform/builder-core` (headless), `@ourform/builder` (UI).

## builder-core

```ts
export interface BuilderState {
  definition: FormDefinition;
  selection: string | null; // component id
  history: { past: Command[]; future: Command[] };
}

export interface Command {
  type:
    | "AddComponent"
    | "RemoveComponent"
    | "MoveComponent"
    | "UpdateProperty"
    | "DuplicateComponent"
    | "ChangeKey"
    | "WrapInLayout"
    | "Unwrap"
    | "ReplaceDefinition";
  apply(
    state: BuilderState,
    ctx: BuilderContext,
  ): { state: BuilderState; patch: JsonPatchOp[]; diagnostics: Diagnostic[] };
  invert(before: BuilderState): Command;
}

export function createBuilder(
  engine: Engine,
  definition: FormDefinition,
): Builder;
export interface Builder {
  getState(): BuilderState;
  dispatch(cmd: Command): Diagnostic[];
  undo(): void;
  redo(): void;
  palette(): PaletteGroup[]; // registered models with a nonblank builder title
  propertyPanel(componentId: string): PropertyPanelModel; // base groups + model properties
  subscribe(l: (s: BuilderState, patch: JsonPatchOp[]) => void): () => void;
}
```

Rules:

- The definition changes only through commands. Each produces RFC 6902 JSON Patch.
- New components get ids `cmp_<random 8>` and keys derived from the title, made unique in scope.
- `ChangeKey` rejects duplicates in the same data scope; warns (`stale-path`) about `{ path }`
  expressions that used the old key. `{ ref }` expressions are unaffected.
- `RemoveComponent` warns (`dangling-ref`) when other components reference the removed id.
- Undo/redo must restore byte-identical JSON (property-based test with random command sequences).

## Property panel model

Base groups, in order: Display (label, description, placeholder, hidden), Data (key, defaultValue,
clearOnHide), Validation (required + rules valid for the value type), Conditional (visibleWhen,
disabledWhen), Layout (width), Accessibility (aria label override). Then the model's own
`properties` merged into their declared groups, in declaration order. Each entry: `{ key, kind,
label, group, value, options?, min?, max?, editor?, visible }`.

## Builder UI (`@ourform/builder`, `<our-form-builder>`)

- Palette: only registrations with a nonblank builder.title; groups from `builder.group`, ordered by `builder.order`; search by title/type.
- Canvas: the real renderer in `design` mode, drop zones between and inside containers,
  selection outline, keyboard: arrows to select, Alt+Up/Down to move, Enter to edit, Delete to remove.
- Property panel: generated editors per kind; expression editor for `expr` kind that builds the
  compact array format from rows like "Field · operator · value" (raw JSON view available).
- JSON view (read/write with diagnostics), preview (live session with sample data), diagnostics list.
- Events: `of-schema-change` with `{ definition, patch }`.
- The builder chrome has fixed styles of its own and never inherits the edited form's theme.

## M09 nested builder amendment (ADR-0014)

ComponentModel declares `slots: [{name,label,accepts,max?}]`, optionally derived by a trusted per-node
resolver for instance-configured Tabs. Resolve slots through the shared headless contract (spec 04),
never by recognizing built-in container types. Ordinary layouts keep ordered components; optional child slot names
select a parent's destination, with omission selecting the first slot. Existing single-slot layouts
remain compatible. The root is an implicit destination accepting ordinary registered components.

Insertion/move destinations are `{parentId?,slot?,index?}`. Index is within the selected slot, after
removing the source for a move; omitted index appends. Refuse self/descendant moves, unknown parents/
slots, unacceptable kinds/types, exceeded direct-child capacity and nested root-only components.
Failed operations leave definition, selection, history and redo unchanged and show an accessible
reason. Re-check destination scope keys, including transparent descendants. Moving into Container
changes compiled data paths; conflicts are errors. Path-changing commands warn stale-path on runtime
expressions using affected old paths, even if another field now occupies that path. Stable ref ids
are preserved. Remove warns dangling-ref for removed subtree ids.

Ship AddComponent, RemoveComponent, MoveComponent, UpdateProperty, DuplicateComponent (whole subtree),
ChangeKey, WrapInLayout and Unwrap. Duplicates get fresh ids/unique scope keys and rebase internal
runtime refs, preserving external refs/opaque properties. Wrapping/unwrapping retains existing child
ids. ReplaceDefinition supplies safe atomic JSON import with diagnostics. All commands emit replayable
RFC 6902 patches; snapshot inverses and forward snapshots retain exact bytes/ids on undo/redo. Bound
history (default 100; finite configurable limit). Invalid and no-op edits never add history.

The canvas uses the real renderer in design mode. Show empty/occupied slots and insertion indicators
inside Panel, Fieldset, Container, Columns and Tabs; design mode exposes all tab panels. Registering
any SDK layout with slots makes it a target without new builder code. Provide mouse drag/drop, an
outline tree, keyboard cut/paste into the selected slot and Alt+arrows to reorder/reparent. Keep the
existing keyboard selection/edit/delete behavior. Palette/native/property metadata remain generic.

Generated editors include expression rows plus raw JSON. Editable definition JSON is validated before
commit, with errors retaining the current draft/history. Live preview and diagnostics remain usable.
The reusable @ourform/builder UI and custom-element/React/Angular wrappers publish of-schema-change
with `{definition,patch}`; selection-only changes emit no schema patch. Chrome is independent of
Base/Bootstrap 4/Bootstrap 5/Tailwind/Material form appearance. Wrappers dispose listeners/controllers/native
bridges when removed.

Acceptance includes mouse and keyboard builds of Tabs > Panel > Columns > field, visible refusal of
illegal drops, a third-party declared slot with zero builder code, scope/path conflict tests, and
independent patch replay plus byte-identical undo/redo over 50 random nested command sequences.
Tabs conformance/visuals cover all five themes (including Material from M09b) and supported hosts; axe has no serious/critical issues.
M10a structures extend the same slot contract without special builder integration.

## M05 implemented boundary (ADR-0007)

M05 ships createBuilder plus AddComponent(type, { parentId?, index? }),
UpdateProperty(componentId, key, value) and RemoveComponent(componentId). The other command types
and reusable builder UI remain M09. select(id | null) publishes an empty patch without history.
State and history arrays are immutable. dispatch returns diagnostics and rejects errors atomically.
Remove allows an unresolved-reference draft with dangling-ref warnings; it cannot render until repaired.
Key edits warn stale-path for unresolved data paths. Ordinary invalid references are rejected.

JsonPatchOp supports add/replace/remove against the definition. Updates replace the component;
undo/redo use internal RestoreSnapshot commands with a root replace operation. Redo restores the
successful after-snapshot, including generated ids. This is intentionally unbounded snapshot history
for Phase 0; optimize/bound it in M09. Command invert(before) restores the exact definition and selection.

PaletteGroup is { name, components: [{ type, title, order, icon? }] }; missing/blank builder.title is excluded (M09a supersedes the M05 fallback). PropertyPanelModel is { componentId, groups: [{ name, properties }] }.
PanelProperty is the entry shape above. Model keys are properties.<name>; base keys match wire paths.
hidden aliases visibleWhen: false (clearing removes it), accessibility uses optional ariaLabel, and
clearOnHide defaults true. Validation editors use the value adapter's empty/type hints. Model visibleWhen
evaluates against config (property refs or data.<property> paths). Custom editor identifiers are retained;
the mini UI uses generic kind editors, including JSON text for expressions/options/JSON. Layout width is
stored for later layout support. The original starter property helpers remain compatible.

The playground builder is a list canvas with generated panels, read-only JSON/patch views and native
preview. Schema edits retain data but recreate the preview session, resetting transient state. Theme
changes retain the same session/DOM. No drag/drop, moves, duplicate or expression-row UI ships in M05.

## M09 implemented lifecycle

`createBuilder(engine,definition,{historyLimit?})` adds `canDrop(type,target,movingId?)`; limit defaults100
and must be an integer1..1000. `select` remains selection-only. New commands and shared checkDrop are
public. `@ourform/builder.createBuilderController` adds the DOM implementation described above. Two
views share one session; schema edits preserve surviving stable field IDs' answers but recreate transient
state. Removed answers are not history. Theme/mode changes preserve preview and authoring controls.
Wrapper APIs are in spec06; package READMEs give commands/examples. M05 limitations above are historical.

## M09a — Column targets and harness boundary (ADR-0015)

Columns now stores `columns: [{width,components}]`, with widths totaling 12. A destination's slot name
column_0/column_1 selects the corresponding child array. Insertion/move patches point to the real
`/columns/<index>/components/<index>` path. No redundant child.slot is stored. Compile, lookup, cycle
checks, scope uniqueness, duplicates, wrap/unwrap, outline traversal, cut/paste and history traverse all
column collections. Cross-column moves retain IDs/keys/data paths; undo/redo restores exact bytes.
Initial builder input and ReplaceDefinition imports normalize legacy columns before storing state.
Default AddComponent(columns) creates two width-6 columns. Column width editing remains schema/API
configuration in this follow-up; the old field layout.width control is legacy harness metadata and
has no effect on canonical column widths. The replacement edit dialog belongs to M09b.

The current UI is a **harness**, not the final builder interaction design. Spec 10 (M09b) replaces it
with Pointer Events dragging, drop indicators only while dragging, selection by click, only the active
tab shown on the canvas, and a tabbed edit dialog. M09a only adapts existing harness routing to column
storage and hides demo palette registrations by default. It includes no UI polish or M09b behavior.

## M09b host locks (owner decision, 2026-10-21)

Headless builder options include locked (id/key-to-key/structure/all map, or a selector list) and
readOnlyKeys (structure shorthand). The strongest matching restriction wins. Configuration is
snapshotted per instance, never stored in the definition. lockLevel(id) informs presentation.
Key locks protect surviving keys; structure also protects deletion/type/data-scope identity; all
protects the whole subtree and placement. Compare before/after centrally so equivalent JSON imports,
ancestor removals and scope-changing moves cannot bypass a lock. Return locked-component and retain
state/history on refusal. canDrop includes lock diagnostics. Same-scope structure moves remain valid.
The builder UI follows spec 10; lock checks in the UI do not replace command enforcement.

M09b dialog drafts use UpdateComponent to commit one id-preserving component replacement. Explicit
historyGroup property/component edits coalesce within 500 ms while publishing every patch; unrelated
commands, selection changes, undo/redo and inactivity end an edit session. Undo/redo return diagnostics
and enforce host locks. The approved UI opts into camel-case naming and MoveOptions.renameConflicts;
legacy command defaults remain compatible. suggestKey computes scoped uniqueness in builder-core.

M09b editor history: prepared `AddComponent(type, {node, ...target})` snapshots and validates a private
modal draft, committing settings and addition together. `PasteComponent(node, target)` snapshots copied
subtrees independently of the original; ids/internal references are remapped and destination keys
rechecked, using the same implementation as Duplicate. Generated Logic properties edit existing
`calculate.expr` and `calculate.allowOverride`; clearing the expression removes the calculation atomically.
There is no new root logic-rule format in M09b.

The 2026-10-22 owner review in spec 10 supersedes the initial expression-editor harness: synchronized
sentence-first rows, searchable pickers, focus-following selection, static Display metadata, default
Select choices/empty-choice warnings and host-confirmed save status. See ADR-0017.

Successful commands expose `builder.commandLabel(command)` with the stable action type and captured
component label/title. History, Undo and Redo use that same metadata even after deletion or selection
changes. The browser host localizes action text. Empty-history keyboard actions announce their own
result without altering history. See spec 10 for focus-preserving header actions and toast behavior.

Successful no-op commands also capture `commandLabel` subject metadata, without publishing a patch
or adding history. Whole-definition commands fall back to the original form title. Browser hosts use
this metadata for completion feedback as well as undo/redo, so unchanged settings Save replaces stale
live text. Failed commands do not acquire a successful captured subject.

## M09d — Extension and kit configuration (accepted plan; ADR-0019)

**Plan accepted with owner amendments on 2026-10-23; not current builder behavior.**
Implement only after M09c; M10a/M10b consume it. PR #15 approval remains separate.
SDK definitions, JSON format, limits and engine/view ownership are planned in spec 04.

### One generated property dialog

Resolve inherited metadata root to leaf before building the panel. Keep the existing standard groups
and base node properties; merge overridden metadata at its original property position, then append
new properties into their declared groups in declaration order. Each property path gets one editor.
Render the same result in modal, drawer, bulk editing and the CLI mini builder; no Currency/Phone or
kit-specific edit forms. Base descriptors remain unchanged across builders and engine instances.
This includes kit-declared data-only string/number/boolean/select/options/json properties such as
US phone's `properties.reportColumn`. The host and expressions can read their resolved values;
the generic editor does not add control rendering or submission-validation behavior.

Apply `hideProperties` and effective kit/host rules to that metadata. `hide` removes an editor only;
it does not erase the value, omit it from export or skip runtime validation. `lock` leaves an editor
visible but read-only with an accessible reason. `relabel` changes only its caption. Literal captions
remain literal; an explicit `{label, labelKey}` caption may opt into translation with the literal
English fallback. Type/adapter/slot/storage contracts cannot be rewritten by editor configuration.

### JSON editor-policy shape

`editDialog` maps `"*"` and exact registered types to `{hide?, lock?, default?, relabel?}`.
`hide` accepts a canonical property-path-to-boolean map (`true` hides, explicit `false` reveals),
or an array of paths as the compatible hide-only shorthand. Omitted entries express no opinion.
`lock` remains a hide-independent array of protected paths, with no false/unlock form.
`default` and `relabel` are maps keyed by those paths.
Paths name standard editable node properties (`label`, `validation.required`, etc.) or declared
`properties.<name>` entries. Resolve through the generated property model, not a generic object
setter. Never permit identity/type/child-storage/prototype writes; keys retain the normal unique-key
workflow rather than a shared literal default. Unsupported exact-type paths are errors. Wildcard
paths must be supported by at least one installed type and apply only to types supporting that path.

Host `editor.rules` uses the same wildcard/type rule shape. Existing
`editor.properties[type].hide` remains a compatible exact-type hide shorthand. Plugin defaults,
captions and groups start in their registered descriptor metadata; there is no implicit global
plugin policy registry. Exact-type kit/host rules match only that registered type, not all descendants;
inherited descriptor metadata and `hideProperties` still propagate through extension composition.

Palette configuration supplies groups/order plus per-type group/order/hide/rename (spec 04's JSON
example). Rename is a palette/search caption, not a new type, a data-key rename or a rewrite of
existing instance labels. The registration still needs a nonblank builder title. Slot acceptance,
root-only constraints, locks and quick-add eligibility remain authoritative; effectively hidden items
cannot reappear through the command bar/quick-add. An explicit valid reveal updates all those palette
surfaces consistently. Valid imported existing types can still render.
Additive host `palette.types` can supply the per-type presentation map; existing `palette.hidden`
remains a hide shorthand and `palette.order` remains group order, not component order.

### Precedence and restrictive policies

Use this order; never treat the order of `plugins`/`kits` input arrays as precedence:

| Configuration                         | Resolution                                                                                                                                                                                                                                                                                     |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registration identity/model           | Unique trusted plugin registrations, then distinct kit-derived types. A kit cannot replace an existing type; duplicates fail.                                                                                                                                                                  |
| Metadata and runtime config defaults  | Base → extension/preset ancestry → derived `defaults` → explicit instance `properties`. Resolve and validate once in the shared compiler, including Node.                                                                                                                                      |
| Builder defaults/relabels/group/order | Inherited descriptor metadata → dependency kits → dependent kits → explicit host options. Within each layer, `*` precedes exact type. Explicit valid instance values win over defaults.                                                                                                        |
| Same-level kit writes                 | Disjoint cells merge; identical values coalesce; different writes by unrelated kits fail `kit-conflict`. A dependency declaration is required for an intentional override.                                                                                                                     |
| Hidden palette/editors                | Inherited presentation → dependency kits → dependent kits → explicit host `editor.rules` / `palette.types`. Explicit host false may reveal kit/inherited hides; kits may reveal another kit's hide only through a declared dependency. Host allowlists and structural eligibility still apply. |
| Property locks                        | Union of inherited/kit/host property locks; no `false`/unlock escape. Component `locked` levels and `readOnlyKeys` apply in addition, with the strongest restriction winning.                                                                                                                  |
| Views                                 | Exact host `overrideView` descriptor → native → renderer pack → portable, independently of palette/editor rules. No kit can supply a view implementation.                                                                                                                                      |

Dependency layers precede selector specificity: a dependent kit's wildcard can override a dependency's
presentation/default/hide, but never its lock. Inherited `hideProperties` is a presentation default,
not an irreversible restriction. A kit may reveal another kit's hide only if that kit is in its
declared dependency closure; opposite hide writes by unrelated kits fail `kit-conflict`, independently
of input order. Resolve kit conflicts before host rules; a host reveal cannot mask an invalid kit graph.

For example, host `editor.rules["acme.usPhone"].hide = {"properties.reportColumn": false}`
reveals that editor even if metadata/a kit hid it; host `palette.types.password.hide = false`
reveals the hidden palette item. Existing host hide-only shorthands remain compatible and contribute
to the host presentation layer; an explicit matching `editor.rules` / `palette.types` entry wins
over its shorthand. A reveal changes presentation only: a revealed locked editor remains read-only,
and host component locks, allowlists and slot eligibility cannot be bypassed.

Test inherited-hide → host reveal, kit-hide → host reveal, dependency-qualified kit reveal,
unrelated-kit conflict and wildcard/exact specificity. For each reveal, assert that property locks
still block generated editors, Edit JSON, bulk commands and history routes.
Display provenance in the property model (base/plugin/kit id and version, wildcard/exact,
host override), and explain refusals with localized text such as “Locked by your app” or “Locked by
kit acme.contacts”. Host component locks cannot be loosened by any plugin, kit, node or view override.
Policy configuration is supplied by the host/active kits, never accepted from form `meta` as a way
to unlock a field.

Builder `default` writes initial schema settings into a **new Add draft**, then normal validation
runs before locks are anchored. It never rewrites existing components, submissions, history or
response values. Modal Save still commits Add/settings once; Cancel discards both. Drawer additions
use the existing live-edit rules. Runtime omission uses model/preset defaults, not editor defaults.
This distinction is identical in Node and browser: builder-only policies do not alter validation.
If a policy configures response `defaultValue`, it must be a valid safe JSON value under that model.

### Commands, import and ownership

Enforce property locks centrally in builder-core against before/after definitions. Cover generated
editors, Edit JSON/ReplaceDefinition, updates, change-type workflows, paste/duplicate, bulk changes,
undo/redo and M09c rules that author a protected schema-property write. Refuse atomically with
`locked-property` (component-level refusals retain `locked-component`); keep selection/history/redo
and show the reason. Hidden-but-unlocked properties remain editable through valid JSON/API commands.
These are authoring constraints, not runtime data permissions; runtime rule state still follows M09c.

Initial imports must pass schema/model/default checks, then anchor the applicable property locks to
their valid stored values. A locked property need not equal a kit's editor default on an existing
form. Paste/duplicate preserve valid copied settings, recheck destination policy, ids and keys, and
never silently reset copied settings to defaults. App-controlled engine/kit replacement creates a
new builder with an explicit compatibility check; it cannot rewrite a live instance/history silently.
An invalid replacement kit leaves the existing engine/builder untouched; the host handles unsaved
edits before mounting a separately validated replacement.

The builder uses its engine's installed kit manifest and compile diagnostics. Save records caret kit
requirements derived from installed versions plus dependency closure (spec 04), preserving plugin
requirements: installed `1.0.0` produces `^1.0.0`. Compatible patch/minor 1.x kit upgrades keep forms
valid; canonical-value/validation/composite-structure changes require a major kit release. Missing or incompatible
kits block authoring/preview with `missing-kit`; no network fallback. Native preview resolves the
same host view overrides as runtime, so React Select replacement requires no schema edits. All paths
retain the existing patch/history/focus/save-acknowledgement contracts, all five themes and axe checks.

Kit JSON loading/validation is opt-in through the separate entry in spec 04, outside the core builder
payload. No-kit builders include/request none of it; kit-aware builders consume the resolved manifest
or explicitly opt into the loader. Preserve ADR-0018's ≤29 kB builder-owned initial ceiling and account for the kit
entry under its own owner-approved consumer-build budget, with shared chunks counted once.

The future **Save as reusable component** action writes kit presets using this published format.
It is not an M09d UI task and remains deferred with reusable sections/templates until after M10a.
