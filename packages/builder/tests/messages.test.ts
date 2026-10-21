import { test, expect } from "vitest";
import { createMessages } from "../src/messages";
test("builder chrome uses English defaults, explicit overrides and host translations with parameters", () => {
  const t = createMessages({ "ofb.edit": "Configure" }, (key) =>
    key === "ofb.delete" ? "Eliminar" : key,
  );
  expect(t("ofb.edit")).toBe("Configure");
  expect(t("ofb.delete")).toBe("Eliminar");
  expect(t("ofb.controls", { count: 3 })).toBe("Controls 3 fields");
  expect(t("of.builder.undo")).toBe("Undo");
  expect(t("Unknown literal caption")).toBe("Unknown literal caption");
  expect(t("ofb.controls")).toBe("Controls {count} fields");
});
