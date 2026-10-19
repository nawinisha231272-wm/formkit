import { expect, test } from "vitest";
import { registerElementField } from "@ourform/element";
test("element package imports in Node without defining custom elements or needing HTMLElement", () => {
  expect(typeof globalThis.HTMLElement).toBe("undefined");
  expect(
    registerElementField("employee", "employee-lookup").views.native?.element
      ?.component,
  ).toBe("employee-lookup");
});
