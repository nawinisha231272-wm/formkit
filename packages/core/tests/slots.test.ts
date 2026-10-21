import { expect, test } from "vitest";
import { createEngine, resolveSlots } from "@ourform/core";
import type { ComponentModel, ComponentSlot } from "@ourform/core";
import type { FormDefinition } from "@ourform/schema";

const text: ComponentModel = {
  type: "text",
  title: "Text",
  value: { empty: () => "", normalize: String, isEmpty: (v) => !v },
};
const slot = { name: "body", label: "Body", accepts: ["field"], max: 1 };
const box: ComponentModel = {
  type: "box",
  title: "Box",
  kind: "layout",
  slots: [slot],
};
const form = (components: FormDefinition["components"]): FormDefinition => ({
  $formVersion: "1.0",
  id: "slots",
  display: "form",
  components,
});
test("headless static slots are snapshotted; default legacy slots do not alter JSON", () => {
  const engine = createEngine()
    .register(text)
    .register(box)
    .register({ type: "legacy", title: "Legacy", kind: "layout" });
  slot.accepts.push("never");
  expect(
    resolveSlots(engine.getField("box")!, { id: "box", type: "box" })[0]
      ?.accepts,
  ).toEqual(["field"]);
  slot.accepts.pop();
  expect(
    Object.isFrozen(resolveSlots(box, { id: "box", type: "box" })[0]?.accepts),
  ).toBe(true);
  const input = form([
    {
      id: "legacy",
      type: "legacy",
      components: [{ id: "name", type: "text", key: "name" }],
    },
  ]);
  const result = engine.compile(input);
  expect(result.ok).toBe(true);
  if (result.ok)
    expect(JSON.stringify(result.form.definition)).toBe(JSON.stringify(input));
  expect(resolveSlots(text, { id: "text", type: "text" })).toEqual([]);
});
test("compile validates accepts, capacity, missing slots, root placement and children of fields", () => {
  const page: ComponentModel = {
    type: "page",
    title: "Page",
    kind: "layout",
    builder: { title: "Page", group: "Layouts", rootOnly: true },
  };
  const engine = createEngine().register(text).register(box).register(page);
  const cases: [FormDefinition, string][] = [
    [
      form([{ id: "root", type: "text", key: "root", slot: "body" }]),
      "invalid-slot",
    ],
    [
      form([
        {
          id: "outer",
          type: "box",
          components: [{ id: "inner", type: "box" }],
        },
      ]),
      "slot-accepts",
    ],
    [
      form([
        {
          id: "outer",
          type: "box",
          components: [
            { id: "a", type: "text", key: "a" },
            { id: "b", type: "text", key: "b" },
          ],
        },
      ]),
      "slot-capacity",
    ],
    [
      form([
        {
          id: "outer",
          type: "box",
          components: [{ id: "a", type: "text", key: "a", slot: "missing" }],
        },
      ]),
      "invalid-slot",
    ],
    [
      form([
        { id: "outer", type: "box", components: [{ id: "p", type: "page" }] },
      ]),
      "root-only",
    ],
    [
      form([
        {
          id: "outer",
          type: "text",
          key: "outer",
          components: [{ id: "a", type: "text", key: "a" }],
        },
      ]),
      "invalid-slot",
    ],
  ];
  for (const [input, code] of cases) {
    const result = engine.compile(input);
    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((d) => d.code)).toContain(code);
  }
  expect(engine.compile(form([{ id: "p", type: "page" }])).ok).toBe(true);
  const exact = {
    ...box,
    slots: [{ name: "exact", label: "Text only", accepts: ["text"] }],
  };
  expect(
    createEngine()
      .register(text)
      .register(exact)
      .compile(
        form([
          {
            id: "box",
            type: "box",
            components: [{ id: "t", type: "text", key: "t", slot: "exact" }],
          },
        ]),
      ).ok,
  ).toBe(true);
});
test("derived slots validate instance metadata and report resolver failures as diagnostics", () => {
  const dynamic: ComponentModel = {
    ...box,
    slots: (node) =>
      node.label === "throw"
        ? (() => {
            throw new Error("Resolver rejected config");
          })()
        : node.label === "invalid"
          ? [{ ...slot, max: -1 }]
          : [slot],
  };
  const engine = createEngine().register(dynamic).register(text);
  expect(engine.compile(form([{ id: "b", type: "box" }])).ok).toBe(true);
  for (const label of ["throw", "invalid"])
    expect(
      engine.compile(form([{ id: "b", type: "box", label }])).diagnostics,
    ).toContainEqual(
      expect.objectContaining({ code: "invalid-slot", componentId: "b" }),
    );
  const malformed: unknown[] = [
    null,
    new Array(65).fill(slot),
    [{ ...slot, name: "__proto__" }],
    [slot, slot],
    [{ ...slot, name: 3 }],
    [{ ...slot, label: "" }],
    [{ ...slot, labelKey: 3 }],
    [{ ...slot, labelKey: "" }],
    [{ ...slot, accepts: "field" }],
    [{ ...slot, accepts: [null] }],
    [{ ...slot, max: 0.5 }],
    [{ ...slot, max: Infinity }],
  ];
  for (const slots of malformed)
    expect(() =>
      resolveSlots(
        { ...box, slots: slots as ComponentSlot[] },
        { id: "b", type: "box" },
      ),
    ).toThrow();
  expect(() =>
    createEngine().register({ ...box, slots: [slot, slot] }),
  ).toThrow("unique");
});

test("empty accepts/zero capacity are enforced and legacy nonvalue nodes cannot invent named slots", () => {
  const legacy: ComponentModel = { type: "legacy-untyped", title: "Legacy" };
  const e = createEngine()
    .register(text)
    .register(legacy)
    .register({
      ...box,
      slots: [{ name: "none", label: "No children", accepts: [], max: 0 }],
    });
  const child = { id: "t", type: "text", key: "t" };
  expect(
    e.compile(form([{ id: "l", type: legacy.type, components: [child] }])).ok,
  ).toBe(true);
  expect(
    e.compile(
      form([
        {
          id: "l",
          type: legacy.type,
          components: [{ ...child, slot: "invented" }],
        },
      ]),
    ).diagnostics,
  ).toContainEqual(expect.objectContaining({ code: "invalid-slot" }));
  expect(
    e
      .compile(form([{ id: "b", type: "box", components: [child] }]))
      .diagnostics.map((d) => d.code),
  ).toEqual(expect.arrayContaining(["slot-accepts", "slot-capacity"]));
});

test("column collections derive effective slots without changing child JSON and reject non-layout owners", () => {
  const columns: ComponentModel = {
    type: "columns",
    title: "Columns",
    kind: "layout",
  };
  const input = form([
    {
      id: "g",
      type: "columns",
      columns: [
        { width: 4, components: [] },
        { width: 8, components: [{ id: "a", type: "text", key: "answer" }] },
      ],
    },
  ]);
  const before = JSON.stringify(input);
  const slots = resolveSlots(columns, input.components[0]!);
  expect(slots.map((s) => s.name)).toEqual(["column_0", "column_1"]);
  expect(Object.isFrozen(slots[1])).toBe(true);
  const e = createEngine().register(columns).register(text);
  const result = e.compile(input);
  if (!result.ok) throw Error(JSON.stringify(result.diagnostics));
  expect(result.form.byId.a!.parentSlot).toBe("column_1");
  expect(result.form.byId.a!.path).toEqual(["answer"]);
  expect(result.form.byId.a!.node.slot).toBeUndefined();
  expect(JSON.stringify(input)).toBe(before);
  expect(
    createEngine()
      .register({ ...columns, slots: [slot] })
      .register(text)
      .compile(input).diagnostics,
  ).toContainEqual(expect.objectContaining({ code: "invalid-slot" }));
  const bad = e.compile(
    form([
      {
        id: "a",
        type: "text",
        key: "a",
        columns: [{ width: 12, components: [] }],
      },
    ]),
  );
  expect(bad.ok).toBe(false);
  expect(bad.diagnostics).toContainEqual(
    expect.objectContaining({ code: "invalid-columns" }),
  );
});
