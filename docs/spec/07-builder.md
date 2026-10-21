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
  palette(): PaletteGroup[]; // from registry models' builder metadata
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

- Palette: groups from `builder.group`, ordered by `builder.order`; search by title/type.
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
never by recognizing built-in container types. Keep ordered components; optional child slot names
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
Base/Bootstrap 4/Bootstrap 5/Tailwind form appearance. Wrappers dispose listeners/controllers/native
bridges when removed.

Acceptance includes mouse and keyboard builds of Tabs > Panel > Columns > field, visible refusal of
illegal drops, a third-party declared slot with zero builder code, scope/path conflict tests, and
independent patch replay plus byte-identical undo/redo over 50 random nested command sequences.
Tabs conformance/visuals cover all four themes and supported hosts; axe has no serious/critical issues.
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

PaletteGroup is { name, components: [{ type, title, order, icon? }] }; missing builder metadata falls
back to model title and Fields group. PropertyPanelModel is { componentId, groups: [{ name, properties }] }.
PanelProperty is the entry shape above. Model keys are properties.<name>; base keys match wire paths.
hidden aliases visibleWhen: false (clearing removes it), accessibility uses optional ariaLabel, and
clearOnHide defaults true. Validation editors use the value adapter's empty/type hints. Model visibleWhen
evaluates against config (property refs or data.<property> paths). Custom editor identifiers are retained;
the mini UI uses generic kind editors, including JSON text for expressions/options/JSON. Layout width is
stored for later layout support. The original starter property helpers remain compatible.

The playground builder is a list canvas with generated panels, read-only JSON/patch views and native
preview. Schema edits retain data but recreate the preview session, resetting transient state. Theme
changes retain the same session/DOM. No drag/drop, moves, duplicate or expression-row UI ships in M05.
