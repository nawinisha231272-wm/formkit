import { test, expect, vi } from "vitest";
import { createEngine } from "@ourform/core";
import { builtinComponents } from "@ourform/components";
import {
  createBuilder,
  UpdateComponent,
  UpdateProperty,
  MoveComponent,
  AddComponent,
} from "@ourform/builder-core";
import type { FormDefinition } from "@ourform/schema";
const schema = (): FormDefinition => ({
  $formVersion: "1.0",
  id: "editing",
  display: "form",
  components: [
    { id: "city", key: "city", type: "text", label: "City" },
    {
      id: "address",
      key: "address",
      type: "container",
      components: [
        {
          id: "nested-city",
          key: "city",
          type: "text",
          label: "Existing city",
        },
      ],
    },
  ],
});
function make() {
  const engine = createEngine();
  for (const field of builtinComponents) engine.register(field.model);
  return createBuilder(engine, schema());
}
test("a dialog draft commits label, key, validation and config in one atomic patch/undo step", () => {
  const b = make(),
    before = JSON.stringify(b.getState().definition);
  const node = {
    ...b.getState().definition.components[0]!,
    label: "Your city",
    key: "yourCity",
    validation: { required: true },
    placeholder: "City",
  };
  let events = 0;
  b.subscribe((_state, patch) => {
    if (patch.length) events++;
  });
  expect(b.dispatch(new UpdateComponent("city", node))).toEqual([]);
  const after = JSON.stringify(b.getState().definition);
  expect(b.getState().history.past).toHaveLength(1);
  expect(events).toBe(1);
  expect(b.getState().selection).toBe("city");
  b.undo();
  expect(JSON.stringify(b.getState().definition)).toBe(before);
  b.redo();
  expect(JSON.stringify(b.getState().definition)).toBe(after);
  const state = JSON.stringify(b.getState());
  expect(
    b.dispatch(new UpdateComponent("city", { ...node, id: "changed" }))[0]
      ?.code,
  ).toBe("builder-command");
  expect(
    b.dispatch(new UpdateComponent("city", { ...node, type: "missing" }))[0]
      ?.code,
  ).toBe("unknown-type");
  expect(JSON.stringify(b.getState())).toBe(state);
});
test("drawer edits publish immediately but coalesce only the same field session within 500ms", () => {
  vi.useFakeTimers();
  try {
    vi.setSystemTime(1000);
    const b = make(),
      original = JSON.stringify(b.getState().definition);
    let events = 0;
    b.subscribe((_state, patch) => {
      if (patch.length) events++;
    });
    const edit = (value: string, group = "city:label") =>
      b.dispatch(new UpdateProperty("city", "label", value), {
        historyGroup: group,
      });
    edit("C");
    vi.advanceTimersByTime(100);
    edit("Ci");
    vi.advanceTimersByTime(499);
    edit("City edited");
    expect(events).toBe(3);
    expect(b.getState().history.past).toHaveLength(1);
    const edited = JSON.stringify(b.getState().definition);
    b.undo();
    expect(JSON.stringify(b.getState().definition)).toBe(original);
    b.redo();
    expect(JSON.stringify(b.getState().definition)).toBe(edited);
    edit("New edit after redo");
    expect(b.getState().history.past).toHaveLength(2);
    vi.advanceTimersByTime(500);
    edit("New session");
    expect(b.getState().history.past).toHaveLength(3);
    edit("Different field", "city:description");
    expect(b.getState().history.past).toHaveLength(4);
    expect(() =>
      b.dispatch(new AddComponent("text"), { historyGroup: "invalid" }),
    ).toThrow("grouping");
  } finally {
    vi.useRealTimers();
  }
});
test("opt-in cross-scope moves rename conflicts with diagnostics, preserving the strict default and undo", () => {
  const b = make(),
    before = JSON.stringify(b.getState().definition);
  expect(
    b
      .dispatch(new MoveComponent("city", { parentId: "address" }))
      .some((d) => d.code === "duplicate-key"),
  ).toBe(true);
  expect(JSON.stringify(b.getState().definition)).toBe(before);
  expect(
    b.dispatch(
      new MoveComponent("city", { parentId: "address", renameConflicts: true }),
    ),
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: "key-renamed", severity: "warning" }),
    ]),
  );
  expect(
    b.getState().definition.components[0]!.components?.map((node) => node.key),
  ).toEqual(["city", "city2"]);
  const after = JSON.stringify(b.getState().definition);
  b.undo();
  expect(JSON.stringify(b.getState().definition)).toBe(before);
  b.redo();
  expect(JSON.stringify(b.getState().definition)).toBe(after);
});

test("approved UI naming and suggested label keys are scoped and unique without changing legacy naming", () => {
  const b = make();
  expect(b.suggestKey("city", "Customer city")).toBe("customerCity");
  expect(b.suggestKey("city", "__proto__")).toBe("field");
  expect(b.suggestKey("city", "123")).toBe("field");
  expect(() => b.suggestKey("missing", "Label")).toThrow("Unknown");
  b.dispatch(new AddComponent("text", { naming: "camel" }));
  b.dispatch(new AddComponent("text", { naming: "camel" }));
  expect(
    b
      .getState()
      .definition.components.slice(-2)
      .map((n) => [n.label, n.key]),
  ).toEqual([
    ["Text", "text"],
    ["Text 2", "text2"],
  ]);
});

test("prepared additions snapshot settings, commit as AddComponent and undo/redo atomically", () => {
  const b = make();
  b.select("city");
  const before = JSON.stringify(b.getState().definition);
  const node = {
    id: "new-email",
    type: "email",
    key: "workEmail",
    label: "Work email",
    validation: { required: true },
  };
  const command = new AddComponent("email", { node });
  node.label = "Changed outside command";
  expect(b.dispatch(command)).toEqual([]);
  expect(b.getState().history.past.map((c) => c.type)).toEqual([
    "AddComponent",
  ]);
  expect(b.getState().definition.components.at(-1)?.label).toBe("Work email");
  const after = JSON.stringify(b.getState().definition);
  b.undo();
  expect(JSON.stringify(b.getState().definition)).toBe(before);
  expect(b.getState().selection).toBe("city");
  b.redo();
  expect(JSON.stringify(b.getState().definition)).toBe(after);
  expect(b.dispatch(new AddComponent("text", { node }))[0]?.code).toBe(
    "builder-command",
  );
  expect(JSON.stringify(b.getState().definition)).toBe(after);
});

test("generated Logic properties use compact expressions and clearing a calculation removes its override atomically", () => {
  const b = make();
  expect(
    b
      .propertyPanel("city")
      .groups.find((g) => g.name === "Logic")
      ?.properties.map((p) => p.key),
  ).toEqual(["calculate.expr", "calculate.allowOverride"]);
  expect(
    b.propertyPanel("city").groups.find((g) => g.name === "Logic")
      ?.properties[1]?.visible,
  ).toBe(false);
  expect(
    b.dispatch(
      new UpdateProperty("city", "calculate.expr", [
        "concat",
        "Hello ",
        { ref: "nested-city" },
      ]),
    ),
  ).toEqual([]);
  expect(
    b.propertyPanel("city").groups.find((g) => g.name === "Logic")
      ?.properties[1]?.visible,
  ).toBe(true);
  expect(
    b.dispatch(new UpdateProperty("city", "calculate.allowOverride", true)),
  ).toEqual([]);
  const before = JSON.stringify(b.getState().definition);
  expect(
    b.dispatch(new UpdateProperty("city", "calculate.expr", undefined)),
  ).toEqual([]);
  expect(b.getState().definition.components[0]?.calculate).toBeUndefined();
  b.undo();
  expect(JSON.stringify(b.getState().definition)).toBe(before);
});
