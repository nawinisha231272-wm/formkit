# @ourform/builder-core

Headless Phase 0 authoring; no DOM, framework or external runtime dependencies.

```ts
const builder = createBuilder(engine, definition);
builder.dispatch(new AddComponent("rating", { parentId: "details", index: 0 }));
const id = builder.getState().selection!;
builder.dispatch(new UpdateProperty(id, "properties.max", 7));
builder.dispatch(new UpdateProperty(id, "validation.required", true));
builder.subscribe((state, patch) => console.log(state.definition, patch));
builder.undo();
builder.redo();
builder.dispatch(new RemoveComponent(id));
```

Register models first. palette() discovers every model and optional builder group/title/order/icon.
propertyPanel(id) generates ordered groups/entries from base and model metadata; model property keys
are namespaced properties.<name>. select(id | null) publishes an empty patch without adding history.
getState() returns frozen definition/selection/history. subscribe returns an unsubscribe function.

Dispatch returns diagnostics. Errors leave state/history unchanged; no-op edits add no history.
Remove can leave unresolved references with warnings; these drafts cannot preview until repaired/undone.
Key edits reject duplicates and warn about stale data paths. undefined removes a property. Unsafe or
non-JSON constructor values are programmer errors. Unknown selection/panel ids and invalid initial
schemas throw; invalid command targets return diagnostics. Metadata determines accepted properties.

Commands expose apply(state, { engine }) and invert(before). RFC 6902 patches address the definition:
add/remove component pointers, replace a component on edits, root replacement on undo/redo. Inverses
use an internal RestoreSnapshot command. Before/after snapshots restore exact JSON property order and
generated ids; history is unbounded, so M05 is a proof rather than a production builder for large forms.
Consumers should normally use dispatch rather than applying commands directly.

Hidden aliases visibleWhen: false; clearing it removes the expression. ariaLabel overrides accessible
label text. clearOnHide defaults true. Expression/options/JSON kinds use generic JSON editors in the demo.
Custom editor ids are metadata only in M05. Layout width is stored for later layout support.
The mini preview preserves data across schema edits but rebuilds its session; themes preserve all state.

Legacy getEditorProperties, applyEditorProperty and EditorProperty remain unchanged for the original
playground. Public types: Builder, BuilderState, BuilderContext, Command, CommandResult, JsonPatchOp,
PaletteGroup, PanelProperty and PropertyPanelModel.

Build: pnpm --filter @ourform/builder-core build. See ADR-0007 and docs/spec/07-builder.md.

## M09 nested editing (supersedes the M05 limitations above)

```ts
import {
  createBuilder,
  AddComponent,
  MoveComponent,
  DuplicateComponent,
  ChangeKey,
  WrapInLayout,
  Unwrap,
  ReplaceDefinition,
} from "@ourform/builder-core";
const builder = createBuilder(engine, definition, { historyLimit: 100 });
builder.dispatch(new AddComponent("tabs"));
const tabs = builder.getState().selection!;
builder.dispatch(
  new MoveComponent("name", { parentId: tabs, slot: "second", index: 0 }),
);
builder.dispatch(
  new DuplicateComponent("name", { parentId: tabs, slot: "first" }),
);
builder.dispatch(new ChangeKey("name", "fullName"));
builder.dispatch(new WrapInLayout("name", "panel"));
builder.dispatch(new Unwrap(builder.getState().selection!));
builder.dispatch(new ReplaceDefinition(importedJson));
const diagnostics = builder.canDrop("text", { parentId: tabs, slot: "first" });
```

DropTarget is `{parentId?,slot?,index?}`. Omitted parent is root, omitted slot is the parent's first,
omitted index appends; move indices are interpreted **after** removing the source, within one slot.
`canDrop(type,target,movingId?)` checks the same structural rules as commands without mutation.
All commands reject unknown parents/slots, cycles, accepts/capacity/root-only violations and destination
scope key conflicts atomically. Fixed composites are not editable. `resolveSlots` is shared by compile,
commands and renderer. Changing paths warns on runtime path references while stable IDs remain stable.
Duplicate copies the entire subtree with new IDs, unique keys and rebased internal runtime references;
opaque config/meta and external refs remain unchanged. WrapInLayout retains the child ID, Unwrap
retains children and validates the replacement destination. JSON import is one validated command.

History is now bounded: default100, configurable integer1..1000. Failed/no-op edits retain redo.
Before/after snapshots preserve byte order and generated IDs; JSON Patch is independently replayable.
Tests include 50 deterministic random sequences with nested moves, wrapping/duplication and exact
undo/redo plus explicit capacity/cycle/scope/path/history checks. Public additions: BuilderOptions,
DropTarget, MoveComponent, DuplicateComponent, ChangeKey, WrapInLayout, Unwrap, ReplaceDefinition.
The full UI lives in `@ourform/builder`; no DOM types enter this package.

M09a (ADR-0015): Columns uses `columns: [{width,components}]` (integer widths 1..12 totaling 12), with
positional column_0/column_1 slots and no redundant child.slot. Legacy flat Columns/layout.width inputs
migrate without mutation; multi-row spans retain order through nested transparent rows. Ordinary layout
components/slot semantics and submission scopes remain. Builder palette eligibility requires an explicit
nonblank builder title. The current UI is a harness; spec 10/M09b replaces its interactions.
