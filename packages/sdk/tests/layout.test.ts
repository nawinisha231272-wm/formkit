import { test, expect } from "vitest";
import { defineLayout, stringProperty } from "../src/index";
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
