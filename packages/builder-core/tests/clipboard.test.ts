import { test, expect } from "vitest";
import { createEngine } from "@ourform/core";
import { builtinComponents } from "@ourform/components";
import {
  createBuilder,
  PasteComponent,
  RemoveComponent,
  UpdateProperty,
} from "@ourform/builder-core";
import type { FormDefinition } from "@ourform/schema";
const form: FormDefinition = {
  $formVersion: "1.0",
  id: "clipboard",
  display: "form",
  components: [
    {
      id: "source",
      type: "panel",
      label: "Contact",
      components: [
        { id: "a", type: "text", key: "city", label: "City" },
        {
          id: "b",
          type: "email",
          key: "email",
          visibleWhen: ["eq", { ref: "a" }, "Boston"],
        },
      ],
    },
    {
      id: "columns",
      type: "columns",
      columns: [
        { width: 6, components: [] },
        { width: 6, components: [] },
      ],
    },
  ],
};
function make() {
  const engine = createEngine();
  for (const field of builtinComponents) engine.register(field.model);
  return createBuilder(engine, form);
}
test("clipboard snapshots survive source edits/deletion, remap internal refs and paste into column slots with atomic replay", () => {
  const b = make();
  const source = structuredClone(b.getState().definition.components[0]!);
  const command = new PasteComponent(source, {
    parentId: "columns",
    slot: "column_1",
  });
  source.label = "Mutated clipboard input";
  b.dispatch(new UpdateProperty("a", "label", "Changed later"));
  b.dispatch(new RemoveComponent("source"));
  const before = JSON.stringify(b.getState().definition);
  expect(b.dispatch(command)).toEqual([]);
  const inserted =
    b.getState().definition.components[0]!.columns![1]!.components[0]!;
  expect(inserted.label).toBe("Contact");
  expect(inserted.id).not.toBe("source");
  expect(inserted.components?.[0]?.label).toBe("City");
  expect(inserted.components?.[1]?.visibleWhen).toEqual([
    "eq",
    { ref: inserted.components?.[0]?.id },
    "Boston",
  ]);
  const after = JSON.stringify(b.getState().definition);
  expect(b.getState().history.past.at(-1)?.type).toBe("PasteComponent");
  b.undo();
  expect(JSON.stringify(b.getState().definition)).toBe(before);
  b.redo();
  expect(JSON.stringify(b.getState().definition)).toBe(after);
});
test("pasting rechecks scope uniqueness and invalid slots without mutating history on refusal", () => {
  const b = make();
  const source = b.getState().definition.components[0]!;
  expect(b.dispatch(new PasteComponent(source))).toEqual([]);
  const pasted = b.getState().definition.components.at(-1)!;
  expect(pasted.components?.map((n) => n.key)).toEqual(["city_2", "email_2"]);
  const before = JSON.stringify(b.getState());
  expect(
    b
      .dispatch(new PasteComponent(source, { parentId: "missing" }))
      .some((d) => d.severity === "error"),
  ).toBe(true);
  expect(JSON.stringify(b.getState())).toBe(before);
});

test("clipboard refuses locked destination changes and duplicate ids cannot escape snapshot validation", () => {
  const engine = createEngine();
  for (const field of builtinComponents) engine.register(field.model);
  const builder = createBuilder(engine, form, { locked: { columns: "all" } });
  const before = JSON.stringify(builder.getState());
  expect(
    builder
      .dispatch(
        new PasteComponent(form.components[0]!, {
          parentId: "columns",
          slot: "column_0",
        }),
      )
      .some((d) => d.code === "locked-component"),
  ).toBe(true);
  expect(JSON.stringify(builder.getState())).toBe(before);
});
