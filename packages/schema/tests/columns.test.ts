import { test, expect } from "vitest";
import Ajv2020 from "ajv/dist/2020.js";
import {
  migrate,
  validateDefinition,
  formDefinitionSchema,
  componentChildren,
  childCollections,
  childSlot,
} from "../src/index";
import type { ComponentNode, FormDefinition } from "../src/index";
const form = (node: ComponentNode): FormDefinition => ({
  $formVersion: "1.0",
  id: "columns-test",
  display: "form",
  components: [node],
});
const field = (id: string, width: 4 | 6 | 8 | 12 = 6): ComponentNode => ({
  id,
  type: "text",
  key: id,
  layout: { width },
});
test("legacy Columns migration consumes widths without mutation and is byte-idempotent", () => {
  const input = form({
    id: "grid",
    type: "columns",
    components: [field("a"), field("b")],
  });
  const before = JSON.stringify(input);
  const result = migrate(input);
  expect(result.diagnostics).toEqual([]);
  expect(result.applied).toEqual(["columns-per-column-v1"]);
  expect(JSON.stringify(input)).toBe(before);
  expect(result.definition.components[0]).toEqual({
    id: "grid",
    type: "columns",
    columns: [
      { width: 6, components: [{ id: "a", type: "text", key: "a" }] },
      { width: 6, components: [{ id: "b", type: "text", key: "b" }] },
    ],
  });
  expect(validateDefinition(result.definition)).toEqual([]);
  expect(
    new Ajv2020({ strict: false }).compile(formDefinitionSchema)(
      result.definition,
    ),
  ).toBe(true);
  const again = migrate(result.definition);
  expect(again.applied).toEqual([]);
  expect(JSON.stringify(again.definition)).toBe(
    JSON.stringify(result.definition),
  );
});
test("legacy multi-row widths preserve reading order, trailing gaps and collision-free row ids", () => {
  const input = form({
    id: "grid",
    type: "columns",
    components: [field("a", 8), field("b", 8), field("c", 4), field("d", 12)],
  });
  input.components.push({ id: "grid_row_1", type: "content" });
  const result = migrate(input);
  expect(result.diagnostics).toEqual([]);
  const rows = result.definition.components[0]!.columns![0]!.components;
  expect(rows.map((row) => row.id)).toEqual([
    "grid_row_1_2",
    "grid_row_2",
    "grid_row_3",
  ]);
  expect(rows.map((row) => row.columns!.map((c) => c.width))).toEqual([
    [8, 4],
    [8, 4],
    [12],
  ]);
  expect(rows[0]!.columns![1]!.components).toEqual([]);
  expect(
    rows.flatMap((row) => componentChildren(row)).map((node) => node.id),
  ).toEqual(["a", "b", "c", "d"]);
  expect(migrate(result.definition).applied).toEqual([]);
  const full = migrate(
    form({
      id: "full",
      type: "columns",
      components: [field("x", 12), field("y", 12)],
    }),
  );
  expect(full.definition.components[0]!.columns).toHaveLength(1);
  expect(
    componentChildren(full.definition.components[0]!).map((n) => n.id),
  ).toEqual(["x", "y"]);
  expect(
    migrate(
      form({ id: "empty", type: "columns" }),
    ).definition.components[0]!.columns?.map((c) => c.width),
  ).toEqual([6, 6]);
});
test("column wire validation refuses mixed storage, malformed widths and redundant placement", () => {
  const valid = form({
    id: "grid",
    type: "columns",
    columns: [
      { width: 6, components: [] },
      { width: 6, components: [] },
    ],
  });
  const ajv = new Ajv2020({ strict: false }).compile(formDefinitionSchema);
  expect(ajv(valid)).toBe(true);
  for (const columns of [
    [],
    [{ width: 13, components: [] }],
    [{ width: 6.5, components: [] }],
    [{ width: 12 }],
    Array.from({ length: 13 }, () => ({ width: 1, components: [] })),
  ]) {
    const bad = {
      ...valid,
      components: [{ id: "grid", type: "columns", columns }],
    };
    expect(ajv(bad)).toBe(false);
    expect(migrate(bad).diagnostics.length).toBeGreaterThan(0);
  }
  expect(
    validateDefinition(
      form({
        id: "bad",
        type: "columns",
        columns: [{ width: 6, components: [] }],
      }),
    )[0]?.code,
  ).toBe("invalid-columns");
  const mixed = {
    ...valid,
    components: [{ ...valid.components[0], components: [] }],
  };
  expect(ajv(mixed)).toBe(false);
  expect(migrate(mixed).diagnostics.length).toBeGreaterThan(0);
  const redundant = form({
    id: "grid",
    type: "columns",
    columns: [
      { width: 12, components: [{ id: "a", type: "text", slot: "column_0" }] },
    ],
  });
  expect(validateDefinition(redundant)[0]?.code).toBe("invalid-slot");
  expect(
    migrate(
      form({
        id: "grid",
        type: "columns",
        components: [{ id: "a", type: "text", slot: "invented" }],
      }),
    ).diagnostics.length,
  ).toBeGreaterThan(0);
});
test("shared child collections expose actual column paths and effective slots without mutation", () => {
  const child: ComponentNode = { id: "a", type: "text" };
  const node: ComponentNode = {
    id: "grid",
    type: "columns",
    columns: [
      { width: 6, components: [] },
      { width: 6, components: [child] },
    ],
  };
  expect(childCollections(node).map((g) => [g.path, g.slot])).toEqual([
    ["columns/0/components", "column_0"],
    ["columns/1/components", "column_1"],
  ]);
  expect(componentChildren(node)).toEqual([child]);
  expect(childSlot(node, child)).toBe("column_1");
  expect(childSlot(node, { id: "missing", type: "text" })).toBeUndefined();
  expect(child.slot).toBeUndefined();
  expect(childCollections({ id: "empty", type: "panel" })).toEqual([]);
  expect(
    childCollections({ id: "p", type: "panel", components: [child] })[0]?.path,
  ).toBe("components");
  expect(
    childSlot({ id: "p", type: "tabs" }, { ...child, slot: "second" }),
  ).toBe("second");
});
