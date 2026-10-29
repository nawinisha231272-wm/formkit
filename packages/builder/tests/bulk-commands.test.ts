import { expect, test } from "vitest";
import { createEngine } from "@ourform/core";
import { createBuilder, AtomicCommand } from "@ourform/builder-core";
import type { DropTarget } from "@ourform/builder-core";
import type { FormDefinition, ComponentNode } from "@ourform/schema";
import { componentChildren } from "@ourform/schema";
import { builtinComponents } from "@ourform/components";
import { selectionCommand } from "../src/bulk-commands";

const messages = {
  scope: "Cross-scope move refused",
  wrap: "Adjacent siblings required",
  missing: "Invalid component",
};
const engine = () => {
  const value = createEngine();
  for (const field of builtinComponents) value.register(field.model);
  return value;
};
const text = (id: string): ComponentNode => ({
  id,
  type: "text",
  key: id,
  label: id.toUpperCase(),
});
const definition = (components: ComponentNode[]): FormDefinition => ({
  $formVersion: "1.0",
  id: "bulk-commands",
  display: "form",
  components,
});
const nodes = (definition: FormDefinition): ComponentNode[] =>
  definition.components.flatMap((node) => [
    node,
    ...nodes({ ...definition, components: componentChildren(node) }),
  ]);
for (const [index, expected] of [
  [5, ["a", "c", "e", "b", "d"]],
  [2, ["a", "b", "d", "c", "e"]],
  [0, ["b", "d", "a", "c", "e"]],
] as const)
  test(`atomic selected move before anchor ${index} preserves document order and exact undo/redo`, () => {
    const builder = createBuilder(
      engine(),
      definition(["a", "b", "c", "d", "e"].map(text)),
    );
    const before = JSON.stringify(builder.getState().definition);
    const operation = selectionCommand("move", ["b", "d"], { index }, messages);
    let publications = 0;
    builder.subscribe(() => publications++);
    expect(
      builder.dispatch(
        new AtomicCommand("Move 2 components", [operation.command]),
      ),
    ).toEqual([]);
    expect(
      builder.getState().definition.components.map((node) => node.id),
    ).toEqual(expected);
    expect(operation.selected()).toEqual(["b", "d"]);
    expect(operation.runs()).toBe(2);
    expect(publications).toBe(1);
    expect(builder.getState().history.past).toHaveLength(1);
    const after = JSON.stringify(builder.getState().definition);
    builder.undo();
    expect(JSON.stringify(builder.getState().definition)).toBe(before);
    builder.redo();
    expect(JSON.stringify(builder.getState().definition)).toBe(after);
  });
test("multi-move uses a real column slot and cross-scope refusal retains all bytes/history", () => {
  const fixture = definition([
    {
      id: "columns",
      type: "columns",
      columns: [
        { width: 6, components: [text("a"), text("b")] },
        { width: 6, components: [text("c"), text("d")] },
      ],
    },
    { id: "object", type: "container", key: "object", components: [] },
  ]);
  const builder = createBuilder(engine(), fixture);
  const operation = selectionCommand(
    "move",
    ["a", "b"],
    { parentId: "columns", slot: "column_1", index: 1 },
    messages,
  );
  expect(
    builder.dispatch(new AtomicCommand("Move", [operation.command])),
  ).toEqual([]);
  expect(
    builder
      .getState()
      .definition.components[0]!.columns!.map((column) =>
        column.components.map((node) => node.id),
      ),
  ).toEqual([[], ["c", "a", "b", "d"]]);
  const before = builder.getState();
  const refused = selectionCommand(
    "move",
    ["a", "b"],
    { parentId: "object" },
    messages,
  );
  expect(
    builder.dispatch(new AtomicCommand("Move", [refused.command])),
  ).toEqual([expect.objectContaining({ code: "cross-scope-move" })]);
  expect(builder.getState()).toBe(before);
});
test("bulk wrap keeps adjacent members in order and refuses nonadjacent or data-scope wrappers", () => {
  for (const [ids, layout, passes] of [
    [["b", "c"], "panel", true],
    [["b", "d"], "panel", false],
    [["b", "c"], "container", false],
  ] as const) {
    const builder = createBuilder(
      engine(),
      definition(["a", "b", "c", "d"].map(text)),
    );
    const before = builder.getState();
    const operation = selectionCommand("wrap", ids, {}, messages, { layout });
    const diagnostics = builder.dispatch(
      new AtomicCommand("Wrap", [operation.command]),
    );
    expect(diagnostics.some((d) => d.severity === "error")).toBe(!passes);
    if (passes) {
      const wrapper = builder.getState().definition.components[1]!;
      expect(wrapper.type).toBe("panel");
      expect(componentChildren(wrapper).map((node) => node.id)).toEqual(ids);
      expect(operation.selected()).toEqual([wrapper.id]);
      builder.undo();
      expect(builder.getState().definition).toEqual(before.definition);
    } else expect(builder.getState()).toBe(before);
  }
});
for (const action of ["duplicate", "paste"] as const)
  test(`multi-${action} remaps cross-root references and commits one replayable undo step`, () => {
    const originals: ComponentNode[] = [
      {
        id: "a",
        type: "number",
        key: "a",
        label: "A",
        calculate: { expr: ["add", { ref: "b" }, 1] },
      },
      { id: "b", type: "number", key: "b", label: "B", defaultValue: 2 },
    ];
    const builder = createBuilder(engine(), definition(originals));
    const before = JSON.stringify(builder.getState().definition);
    const operation = selectionCommand(action, ["a", "b"], {}, messages, {
      clipboard: originals,
    });
    expect(
      builder.dispatch(new AtomicCommand(action, [operation.command])),
    ).toEqual([]);
    const copied = operation
      .selected()
      .map(
        (id) =>
          nodes(builder.getState().definition).find((node) => node.id === id)!,
      );
    expect(copied).toHaveLength(2);
    expect(copied.map((node) => node.label)).toEqual(["A", "B"]);
    expect(copied[0]!.calculate!.expr).toEqual([
      "add",
      { ref: copied[1]!.id },
      1,
    ]);
    expect(copied[0]!.key).not.toBe("a");
    expect(copied[1]!.key).not.toBe("b");
    expect(operation.runs()).toBe(3);
    expect(builder.getState().history.past).toHaveLength(1);
    const after = JSON.stringify(builder.getState().definition);
    builder.undo();
    expect(JSON.stringify(builder.getState().definition)).toBe(before);
    builder.redo();
    expect(JSON.stringify(builder.getState().definition)).toBe(after);
  });
test("a later clipboard error refuses the complete paste with no partial state/history", () => {
  const builder = createBuilder(engine(), definition([text("a")]));
  const before = builder.getState();
  const operation = selectionCommand("paste", [], {} as DropTarget, messages, {
    clipboard: [text("b"), { id: "bad", type: "not-registered" }],
  });
  expect(
    builder
      .dispatch(new AtomicCommand("Paste", [operation.command]))
      .some((d) => d.severity === "error"),
  ).toBe(true);
  expect(builder.getState()).toBe(before);
});
