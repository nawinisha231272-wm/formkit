import { test, expect } from "vitest";
import Ajv2020 from "ajv/dist/2020.js";
import { createEngine } from "@ourform/core";
import { builtinComponents } from "@ourform/components";
import { migrate, toSubmissionSchema } from "@ourform/schema";
import type { FormDefinition } from "@ourform/schema";
import {
  createBuilder,
  AddComponent,
  MoveComponent,
  DuplicateComponent,
  WrapInLayout,
  Unwrap,
  RemoveComponent,
  ReplaceDefinition,
} from "../src/index";
const empty: FormDefinition = {
  $formVersion: "1.0",
  id: "columns",
  display: "form",
  components: [],
};
function engine() {
  const e = createEngine();
  for (const field of builtinComponents) e.register(field.model);
  return e;
}
test("column drops and cross-column moves patch actual collections and undo/redo every byte", () => {
  const e = engine(),
    b = createBuilder(e, empty);
  expect(b.dispatch(new AddComponent("columns"))).toEqual([]);
  const grid = b.getState().selection!;
  const snapshots = [JSON.stringify(b.getState().definition)];
  expect(
    b.dispatch(new AddComponent("text", { parentId: grid, slot: "column_1" })),
  ).toEqual([]);
  const id = b.getState().selection!;
  const col = b.getState().definition.components[0]!;
  expect(col.components).toBeUndefined();
  expect(col.columns![0]!.components).toEqual([]);
  expect(col.columns![1]!.components[0]!.id).toBe(id);
  expect(col.columns![1]!.components[0]!.slot).toBeUndefined();
  snapshots.push(JSON.stringify(b.getState().definition));
  const patches: unknown[] = [];
  b.subscribe((_, patch) => patches.push(patch));
  expect(
    b.dispatch(new MoveComponent(id, { parentId: grid, slot: "column_0" })),
  ).toEqual([]);
  expect(patches[0]).toEqual([
    { op: "remove", path: "/components/0/columns/1/components/0" },
    {
      op: "add",
      path: "/components/0/columns/0/components/0",
      value: b.getState().definition.components[0]!.columns![0]!.components[0],
    },
  ]);
  snapshots.push(JSON.stringify(b.getState().definition));
  const compiled = e.compile(b.getState().definition);
  if (!compiled.ok) throw Error(JSON.stringify(compiled.diagnostics));
  expect(compiled.form.byId[id]!.parentSlot).toBe("column_0");
  expect(compiled.form.byId[id]!.path).toEqual(["text"]);
  const before = b.getState();
  expect(
    b.dispatch(new MoveComponent(id, { parentId: grid, slot: "column_9" }))[0]
      ?.code,
  ).toBe("invalid-slot");
  expect(b.getState()).toBe(before);
  for (let i = snapshots.length - 2; i >= 0; i--) {
    b.undo();
    expect(JSON.stringify(b.getState().definition)).toBe(snapshots[i]);
  }
  for (let i = 1; i < snapshots.length; i++) {
    b.redo();
    expect(JSON.stringify(b.getState().definition)).toBe(snapshots[i]);
  }
});
test("column subtrees participate in duplicate, wrap, unwrap, removal, scope validation and import", () => {
  const e = engine(),
    b = createBuilder(e, empty);
  b.dispatch(new AddComponent("columns"));
  const grid = b.getState().selection!;
  b.dispatch(new AddComponent("text", { parentId: grid, slot: "column_1" }));
  const id = b.getState().selection!;
  expect(b.dispatch(new DuplicateComponent(id))).toEqual([]);
  expect(
    b
      .getState()
      .definition.components[0]!.columns![1]!.components.map((c) => c.key),
  ).toEqual(["text", "text_2"]);
  expect(b.dispatch(new WrapInLayout(id, "panel"))).toEqual([]);
  const wrap = b.getState().selection!;
  expect(b.dispatch(new Unwrap(wrap))).toEqual([]);
  expect(b.dispatch(new RemoveComponent(id))).toEqual([]);
  b.undo();
  expect(b.dispatch(new MoveComponent(grid, { parentId: id }))[0]?.code).toBe(
    "drop-cycle",
  );
  const old: FormDefinition = {
    ...empty,
    components: [
      {
        id: "grid",
        type: "columns",
        components: [
          { id: "a", type: "text", key: "a", layout: { width: 12 } },
        ],
      },
    ],
  };
  const migrated = migrate(old).definition;
  expect(createBuilder(e, old).getState().definition).toEqual(migrated);
  expect(b.dispatch(new ReplaceDefinition(old))).toEqual([]);
  expect(b.getState().definition).toEqual(migrated);
  const duplicateKeys = {
    ...empty,
    components: [
      {
        id: "c",
        type: "columns",
        columns: [
          {
            width: 6 as const,
            components: [{ id: "a", type: "text", key: "same" }],
          },
          {
            width: 6 as const,
            components: [{ id: "b", type: "text", key: "same" }],
          },
        ],
      },
    ],
  };
  const invalid = e.compile(duplicateKeys);
  expect(invalid.ok).toBe(false);
  expect(invalid.diagnostics.some((d) => d.code === "duplicate-key")).toBe(
    true,
  );
});
test("submission JSON Schema is transparent across columns including nested object scopes", () => {
  const e = engine();
  const compiled = e.compile({
    ...empty,
    components: [
      {
        id: "g",
        type: "columns",
        columns: [
          {
            width: 4,
            components: [
              {
                id: "name",
                type: "text",
                key: "name",
                validation: { required: true },
              },
            ],
          },
          {
            width: 8,
            components: [
              {
                id: "c",
                type: "container",
                key: "profile",
                components: [{ id: "n", type: "number", key: "age" }],
              },
            ],
          },
        ],
      },
    ],
  });
  if (!compiled.ok) throw Error(JSON.stringify(compiled.diagnostics));
  const schema = toSubmissionSchema(compiled.form),
    validate = new Ajv2020({ strict: false }).compile(schema);
  expect(Object.keys(schema.properties as object)).toEqual(["name", "profile"]);
  expect(validate({ name: "Ada", profile: { age: 42 } })).toBe(true);
  expect(validate({ profile: { age: 42 } })).toBe(false);
  expect(validate({ name: "Ada", profile: { age: "wrong" } })).toBe(false);
});
test("palette requires an explicit nonblank builder title independently of renderer title", () => {
  const e = engine();
  e.register({ type: "acme-no-palette", title: "Hidden", kind: "layout" });
  e.register({
    type: "blank",
    title: "Blank",
    kind: "layout",
    builder: { title: "  ", group: "Tests" },
  });
  e.register({
    type: "visible",
    title: "Renderer title",
    kind: "layout",
    builder: { title: "Author title", group: "Tests" },
  });
  const names = createBuilder(e, empty)
    .palette()
    .flatMap((g) => g.components.map((c) => [c.type, c.title]));
  expect(names).not.toContainEqual(["acme-no-palette", "Hidden"]);
  expect(names.some(([type]) => type === "blank")).toBe(false);
  expect(names).toContainEqual(["visible", "Author title"]);
});
