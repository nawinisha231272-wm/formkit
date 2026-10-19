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
