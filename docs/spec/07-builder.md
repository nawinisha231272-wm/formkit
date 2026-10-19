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
    | "WrapInLayout";
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
