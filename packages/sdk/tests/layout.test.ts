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
