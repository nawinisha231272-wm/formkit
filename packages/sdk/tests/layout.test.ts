import { test, expect } from "vitest";
import { defineLayout, stringProperty } from "../src/index";
import { resolveSlots } from "@ourform/core";
test("defineLayout composes frozen per-definition metadata without a value adapter", () => {
  const layout = defineLayout({
    type: "acme.section",
    title: "Section",
    tag: "section",
    dataScope: "object",
    properties: { note: stringProperty({ label: "custom.note", default: "" }) },
  });
  expect(layout.model.kind).toBe("layout");
  expect(layout.model.value).toBeUndefined();
  expect(layout.views.layout).toEqual({ tag: "section", columns: false });
  expect(layout.model.builder?.group).toBe("Layouts");
  expect(Object.isFrozen(layout.model.properties?.note)).toBe(true);
  expect(
    defineLayout({ type: "grid", title: "Grid", columns: true }).views.layout,
  ).toEqual({ tag: "div", columns: true });
});
test("layout author can declare or disable the inline caption", () => {
  expect(
    defineLayout({ type: "a", title: "A", caption: "label" }).model.builder
      ?.caption,
  ).toBe("label");
  expect(
    defineLayout({ type: "b", title: "B", caption: false }).model.builder
      ?.caption,
  ).toBe(false);
  expect(
    defineLayout({ type: "c", title: "C" }).model.builder?.caption,
  ).toBeUndefined();
});
test("declared SDK slots are frozen snapshots and discoverable without builder code", () => {
  const slots = [{ name: "body", label: "Body", accepts: ["field"], max: 2 }];
  const layout = defineLayout({
    type: "acme.card",
    title: "Card",
    slots,
    rootOnly: true,
  });
  slots[0]!.accepts.push("layout");
  expect(resolveSlots(layout.model, { id: "card", type: "acme.card" })).toEqual(
    [{ name: "body", label: "Body", accepts: ["field"], max: 2 }],
  );
  expect(Object.isFrozen(layout.model.slots)).toBe(true);
  expect(layout.model.builder?.rootOnly).toBe(true);
});

test("composite column templates migrate and namespace nested ids and references per instance", async () => {
  const { defineComposite } = await import("../src/index");
  const { createEngine } = await import("@ourform/core");
  const { builtinComponents } = await import("@ourform/components");
  const component = defineComposite({
    type: "acme.column-card",
    title: "Column card",
    components: [
      {
        id: "grid",
        type: "columns",
        components: [
          { id: "first", type: "text", key: "first", layout: { width: 6 } },
          {
            id: "second",
            type: "text",
            key: "second",
            layout: { width: 6 },
            visibleWhen: ["eq", { ref: "first" }, "show"],
          },
        ],
      },
    ],
  });
  const engine = createEngine();
  for (const field of builtinComponents) engine.register(field.model);
  engine.register(component.model);
  const result = engine.compile({
    $formVersion: "1.0",
    id: "cards",
    display: "form",
    components: [
      {
        id: "outer",
        type: "columns",
        columns: [
          {
            width: 12,
            components: [
              { id: "one", type: "acme.column-card", key: "one" },
              { id: "two", type: "acme.column-card", key: "two" },
            ],
          },
        ],
      },
    ],
  });
  if (!result.ok) throw Error(JSON.stringify(result.diagnostics));
  expect(result.form.byId["one/second"]!.node.visibleWhen).toEqual([
    "eq",
    { ref: "one/first" },
    "show",
  ]);
  expect(result.form.byId["two/second"]!.path).toEqual(["two", "second"]);
  expect(result.form.byId["one/second"]!.parentSlot).toBe("column_1");
  const session = engine.createSession(result.form);
  expect(session.getFieldState("one/second").visible).toBe(false);
  session.setValue(["one", "first"], "show");
  expect(session.getFieldState("one/second").visible).toBe(true);
  expect(session.getFieldState("two/second").visible).toBe(false);
});
