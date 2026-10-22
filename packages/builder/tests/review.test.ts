import { test, expect } from "vitest";
import { createEngine } from "@ourform/core";
import { builtinComponents } from "@ourform/components";
import {
  AddComponent,
  createBuilder,
  UpdateProperty,
} from "@ourform/builder-core";
import type { FormDefinition } from "@ourform/schema";
import { builderIssues } from "../src/issues";
import { createMessages } from "../src/messages";
import { componentTitle } from "../src/types";

const engine = () => {
  const result = createEngine();
  for (const field of builtinComponents) result.register(field.model);
  return result;
};
const empty = (): FormDefinition => ({
  $formVersion: "1.0",
  id: "review",
  display: "form",
  components: [],
});

test("Select Add defaults are editable and empty choice warnings identify their components", () => {
  const e = engine(),
    builder = createBuilder(e, empty());
  expect(builder.dispatch(new AddComponent("select"))).toEqual([]);
  const node = builder.getState().definition.components[0]!;
  expect(node.properties?.options).toEqual([
    { value: "option1", label: "Option 1" },
    { value: "option2", label: "Option 2" },
  ]);
  const ui = { engine: e, t: createMessages() };
  expect(builderIssues(ui, builder.getState().definition)).toEqual([]);
  expect(
    builder.dispatch(new UpdateProperty(node.id, "properties.options", [])),
  ).toEqual([]);
  expect(builder.dispatch(new AddComponent("radio"))).toEqual([]);
  const diagnostics = builderIssues(ui, builder.getState().definition);
  expect(diagnostics.map((d) => d.code)).toEqual([
    "empty-options",
    "empty-options",
  ]);
  expect(diagnostics.map((d) => d.componentId)).toEqual(
    builder.getState().definition.components.map((n) => n.id),
  );
  builder.undo();
  builder.undo();
  expect(builder.getState().definition.components).toEqual([node]);
});

test("generated Display properties use the public schema and unnamed layouts use registered titles", () => {
  const e = engine();
  const form = empty();
  form.components = [
    { id: "x", type: "text", key: "x" },
    {
      id: "cols",
      type: "columns",
      label: "",
      columns: [{ width: 12, components: [] }],
    },
  ];
  const builder = createBuilder(e, form);
  const properties = builder
    .propertyPanel("x")
    .groups.find((g) => g.name === "Display")!.properties;
  for (const key of ["tooltip", "prefix", "suffix", "disabled", "readOnly"])
    expect(properties.some((p) => p.key === key)).toBe(true);
  expect(
    builder.dispatch(new UpdateProperty("x", "disabled", "yes")),
  ).not.toEqual([]);
  expect(builder.dispatch(new UpdateProperty("x", "readOnly", true))).toEqual(
    [],
  );
  expect(builder.getState().definition.components[0]!.readOnly).toBe(true);
  expect(
    componentTitle({ engine: e, t: createMessages() }, form.components[1]!),
  ).toBe("Columns");
});
