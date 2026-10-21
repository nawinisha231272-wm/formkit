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

## Host component locks (M09b)

`createBuilder(engine, definition, {locked, readOnlyKeys})` snapshots host-owned locks. `locked` is
an id/key-to-level map, or a list (structure by default). readOnlyKeys is a list shorthand. If both
id and key match, or shorthand and explicit config overlap, the stronger level wins: all > structure > key.
`builder.lockLevel(id)` exposes the effective level to chrome. Unknown ids have no lock.

`key` protects a surviving component's key; deleting it or editing other properties remains allowed.
`structure` also protects deletion/type and data-scope identity. Transparent layouts/columns remain
inside their existing scope, so moves among them are allowed; moves into/out of keyed Containers are
refused. An ancestor command/import cannot bypass a descendant's scope/deletion protection.
`all` freezes the component subtree and placement, including ancestor moves. Unrelated insertions or
removals do not count as moving a frozen component; changing its order among surviving siblings does.
JSON can inspect it read-only. `canDrop` returns lock refusals; dispatch centrally compares before/after
and returns `locked-component` without changing definition, selection, events or history.
Locks never enter wire JSON. They constrain the host's builder instance; they do not protect against
trusted application code replacing the instance or its own configuration.

`UpdateComponent(id,node)` validates a dialog/JSON draft atomically, preserving its id and replacing
that component in one patch/history step. `dispatch(edit,{historyGroup})` publishes each edit immediately
and coalesces same-session UpdateProperty/UpdateComponent edits less than 500 ms apart; another group,
selection change or undo/redo ends the group. Undo/redo return diagnostics and also respect locks.
`AddComponent(type,{naming:"camel"})` opts into unique numbered labels/camel-case keys for the new UI;
the default preserves legacy naming. `suggestKey(id,label)` suggests a valid unique key in the current
scope, excluding the component itself. UI stops following labels once a key is manually edited.
`MoveComponent(id,{...,renameConflicts:true})` opts into scoped city→city2 collision resolution with
key-renamed warnings. The existing strict default still rejects conflicting moves. Locks take precedence
and stable id references survive. JSON Patch and byte-identical undo/redo cover these operations.

`new AddComponent(type, {node, ...target})` commits a prepared component in one Add step. The command
snapshots safe JSON on construction, requires the same component type, and validates normal schema,
slot, uniqueness and lock constraints before publishing. Undo restores the previous schema and selection;
redo restores the prepared settings exactly. This supports a private modal draft without temporary edits.

`PasteComponent(node, target)` snapshots a copied subtree, generates fresh stable ids, remaps internal
references and checks keys in the destination data scope. Copy itself does not enter history; Paste
commits once and remains usable after the source is edited or removed. Invalid drops publish nothing.
Generated Logic metadata exposes `calculate.expr` and `calculate.allowOverride`; clearing the expression
removes the whole calculation (including its override), with one reversible patch.
