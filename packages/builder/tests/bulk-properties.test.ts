import { expect, test } from "vitest";
import { createEngine } from "@ourform/core";
import { createBuilder } from "@ourform/builder-core";
import { textField, numberField, panelLayout } from "@ourform/components";
import { sharedPropertyPanel } from "../src/features/bulk-editor";

test("bulk metadata includes only shared visible properties, marks mixed values and respects hidden properties", () => {
  const engine = createEngine()
    .register(textField.model)
    .register(numberField.model)
    .register(panelLayout.model);
  const builder = createBuilder(engine, {
    $formVersion: "1.0",
    id: "bulk",
    display: "form",
    components: [
      {
        id: "panel",
        type: "panel",
        label: "Group",
        components: [
          { id: "text", type: "text", key: "text", label: "Text" },
          { id: "number", type: "number", key: "number", label: "Number" },
        ],
      },
    ],
  });
  const { panel, mixed } = sharedPropertyPanel(
    builder,
    ["text", "number"],
    new Set(["description"]),
  );
  const properties = panel.groups.flatMap((group) => group.properties);
  expect(properties.some((property) => property.key === "label")).toBe(true);
  expect(properties.some((property) => property.key === "description")).toBe(
    false,
  );
  expect(properties.some((property) => property.key === "properties.min")).toBe(
    false,
  );
  expect(mixed.has("label")).toBe(true);
  expect(
    properties.find((property) => property.key === "label")?.value,
  ).toBeUndefined();
  expect(
    sharedPropertyPanel(builder, ["panel", "text"])
      .panel.groups.flatMap((group) => group.properties)
      .some((property) => property.key === "label"),
  ).toBe(true);
  expect(sharedPropertyPanel(builder, []).panel.groups).toEqual([]);
});
