import { test, expect } from "vitest";
import { createEngine } from "@ourform/core";
import {
  textField,
  numberField,
  checkboxField,
  ratingField,
} from "@ourform/components";
import { registerNativeField, stringValue } from "@ourform/sdk";
import {
  createBuilder,
  AddComponent,
  UpdateProperty,
  RemoveComponent,
} from "@ourform/builder-core";
import type { JsonPatchOp, Command } from "@ourform/builder-core";
import type { FormDefinition } from "@ourform/schema";

const empty = (): FormDefinition => ({
  $formVersion: "1.0",
  id: "builder",
  display: "form",
  components: [],
});
const engine = () =>
  createEngine()
    .register(textField.model)
    .register(numberField.model)
    .register(checkboxField.model)
    .register(ratingField.model)
    .register({
      type: "section",
      title: "Section",
      kind: "layout",
      dataScope: "none",
    })
    .register({
      type: "object",
      title: "Object",
      kind: "layout",
      dataScope: "object",
    });
// Independent RFC 6902 replay: paths address the definition, never the builder state.
function replay(input: FormDefinition, patch: JsonPatchOp[]): FormDefinition {
  let result: unknown = structuredClone(input);
  for (const op of patch) {
    if (op.path === "") {
      result = structuredClone("value" in op ? op.value : null);
      continue;
    }
    const path = op.path
      .slice(1)
      .split("/")
      .map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"));
    let target = result as Record<string, unknown>;
    for (const part of path.slice(0, -1))
      target = target[part] as Record<string, unknown>;
    const key = path.at(-1)!;
    if (Array.isArray(target)) {
      if (op.op === "remove") target.splice(Number(key), 1);
      else if (op.op === "add")
        target.splice(Number(key), 0, structuredClone(op.value));
      else target[Number(key)] = structuredClone(op.value);
    } else if (op.op === "remove") delete target[key];
    else target[key] = structuredClone(op.value);
  }
  return result as FormDefinition;
}
test("add/update/remove and inverses emit replayable patches; snapshots and ids are immutable", () => {
  const e = engine();
  const input = empty();
  const builder = createBuilder(e, input);
  let replayed = structuredClone(input);
  let calls = 0;
  const unsubscribe = builder.subscribe((state, patch) => {
    calls++;
    replayed = replay(replayed, patch);
    expect(JSON.stringify(replayed)).toBe(JSON.stringify(state.definition));
  });
  const before = builder.getState();
  const add = new AddComponent("rating");
  expect(builder.dispatch(add)).toEqual([]);
  const id = builder.getState().selection!;
  expect(id).toMatch(/^cmp_[a-z0-9]{8}$/);
  expect(builder.getState().definition.components[0]?.key).toBe("rating");
  expect(
    add.invert(before).apply(builder.getState(), { engine: e }).state
      .definition,
  ).toEqual(input);
  const update = new UpdateProperty(id, "properties.max", 7);
  const beforeUpdate = builder.getState();
  expect(builder.dispatch(update)).toEqual([]);
  expect(
    builder
      .propertyPanel(id)
      .groups.flatMap((g) => g.properties)
      .find((p) => p.key === "properties.max")?.value,
  ).toBe(7);
  expect(
    update.invert(beforeUpdate).apply(builder.getState(), { engine: e }).state
      .definition,
  ).toEqual(beforeUpdate.definition);
  const remove = new RemoveComponent(id);
  const beforeRemove = builder.getState();
  expect(builder.dispatch(remove)).toEqual([]);
  expect(
    remove.invert(beforeRemove).apply(builder.getState(), { engine: e }).state
      .definition,
  ).toEqual(beforeRemove.definition);
  expect(builder.getState().definition.components).toEqual([]);
  builder.undo();
  expect(builder.getState().selection).toBe(id);
  builder.undo();
  expect(
    builder.getState().definition.components[0]?.properties,
  ).toBeUndefined();
  builder.undo();
  expect(builder.getState().definition).toEqual(input);
  builder.redo();
  expect(builder.getState().selection).toBe(id);
  expect(Object.isFrozen(builder.getState().definition.components)).toBe(true);
  expect(input.components).toEqual([]);
  unsubscribe();
  const saved = calls;
  builder.redo();
  expect(calls).toBe(saved);
});
test("generated ids and keys are unique across transparent layouts and object scopes", () => {
  const builder = createBuilder(engine(), empty());
  builder.dispatch(new AddComponent("section"));
  const section = builder.getState().selection!;
  builder.dispatch(new AddComponent("text", { parentId: section }));
  builder.dispatch(new AddComponent("text"));
  expect(builder.getState().definition.components[1]?.key).toBe("text_2");
  builder.dispatch(new AddComponent("object"));
  const object = builder.getState().selection!;
  builder.dispatch(new AddComponent("text", { parentId: object, index: 0 }));
  const node = builder.getState().definition.components[2]?.components?.[0];
  expect(node?.key).toBe("text");
  const id = node!.id;
  builder.undo();
  builder.redo();
  expect(builder.getState().selection).toBe(id);
});
test("invalid edits, unknown targets and prototype paths leave state and redo unchanged", () => {
  const builder = createBuilder(engine(), empty());
  builder.dispatch(new AddComponent("text"));
  const id = builder.getState().selection!;
  builder.dispatch(new AddComponent("text"));
  const second = builder.getState().selection!;
  builder.dispatch(new UpdateProperty(second, "label", "Changed"));
  builder.undo();
  const before = builder.getState();
  for (const command of [
    new UpdateProperty(id, "key", "text_2"),
    new UpdateProperty(id, "key", "__proto__"),
    new UpdateProperty(id, "properties.__proto__.polluted", true),
    new UpdateProperty(id, "label", 5),
    new UpdateProperty(id, "visibleWhen", ["wat"]),
    new UpdateProperty(id, "visibleWhen", { ref: "missing" }),
    new UpdateProperty(id, "visibleWhen", { path: "malformed" }),
    new UpdateProperty(id, "layout.width", 13),
    new AddComponent("missing"),
    new RemoveComponent("missing"),
    new UpdateProperty("missing", "label", "x"),
    new AddComponent("text", { parentId: id }),
    new AddComponent("text", { parentId: "missing" }),
    new AddComponent("text", { index: -1 }),
  ]) {
    expect(builder.dispatch(command).some((d) => d.severity === "error")).toBe(
      true,
    );
    expect(builder.getState()).toBe(before);
  }
  expect(() => new UpdateProperty(id, "defaultValue", { value: NaN })).toThrow(
    "safe JSON",
  );
  expect(() =>
    createBuilder(engine(), {
      ...empty(),
      components: [{ id: "x", type: "missing" }],
    }),
  ).toThrow("initial");
  builder.redo();
  expect(builder.getState().definition.components[1]?.label).toBe("Changed");
  expect(({} as Record<string, unknown>).polluted).toBeUndefined();
});
test("remove warns about dangling references, leaves a repairable draft and undo restores compilation", () => {
  const e = engine();
  const definition = empty();
  definition.components = [
    { id: "a", type: "text", key: "a" },
    { id: "b", type: "text", key: "b", visibleWhen: ["empty", { ref: "a" }] },
  ];
  const builder = createBuilder(e, definition);
  expect(builder.dispatch(new RemoveComponent("a"))).toContainEqual(
    expect.objectContaining({
      severity: "warning",
      code: "dangling-ref",
      componentId: "b",
    }),
  );
  expect(e.compile(builder.getState().definition).ok).toBe(false);
  builder.undo();
  expect(e.compile(builder.getState().definition).ok).toBe(true);
  builder.redo();
  builder.dispatch(new UpdateProperty("b", "visibleWhen", undefined));
  expect(e.compile(builder.getState().definition).ok).toBe(true);
});
test("palette and property groups discover arbitrary native metadata, options and visibility without global registration", () => {
  const native = registerNativeField("element", "employee", "employee-lookup", {
    title: "Employee lookup",
    value: stringValue(),
    properties: {
      search: {
        kind: "boolean",
        label: "Search",
        group: "Display",
        default: false,
      },
      hint: {
        kind: "string",
        label: "Hint",
        group: "Display",
        default: "Find",
        visibleWhen: { ref: "search" },
      },
      format: {
        kind: "select",
        label: "Format",
        group: "Employee",
        default: "short",
        options: [{ value: "short", label: "Short" }],
        editor: "custom-format",
      },
    },
  });
  const e = engine().register(native.model);
  const builder = createBuilder(e, empty());
  expect(
    builder
      .palette()
      .flatMap((g) => g.components)
      .map((c) => c.type),
  ).toContain("employee");
  expect(
    createBuilder(engine(), empty())
      .palette()
      .flatMap((g) => g.components)
      .map((c) => c.type),
  ).not.toContain("employee");
  builder.dispatch(new AddComponent("employee"));
  const id = builder.getState().selection!;
  const panel = () =>
    builder.propertyPanel(id).groups.flatMap((g) => g.properties);
  expect(builder.propertyPanel(id).groups.map((g) => g.name)).toEqual([
    "Display",
    "Data",
    "Validation",
    "Conditional",
    "Logic",
    "Layout",
    "Accessibility",
    "Employee",
  ]);
  expect(panel().find((p) => p.key === "properties.hint")?.visible).toBe(false);
  builder.dispatch(new UpdateProperty(id, "properties.search", true));
  expect(panel().find((p) => p.key === "properties.hint")?.visible).toBe(true);
  expect(panel().find((p) => p.key === "properties.format")).toMatchObject({
    kind: "select",
    value: "short",
    options: [{ value: "short", label: "Short" }],
    editor: "custom-format",
  });
  expect(panel().some((p) => p.key === "validation.minLength")).toBe(true);
  builder.dispatch(new AddComponent("rating"));
  expect(
    builder
      .propertyPanel(builder.getState().selection!)
      .groups.flatMap((g) => g.properties)
      .map((p) => p.key),
  ).toContain("validation.min");
});
test("hidden, accessibility, clearing properties and selection use schema-compatible values", () => {
  const b = createBuilder(engine(), empty());
  b.undo();
  b.redo();
  b.select(null);
  expect(() => b.select("missing")).toThrow();
  expect(() => b.propertyPanel("missing")).toThrow();
  b.dispatch(new AddComponent("text"));
  const id = b.getState().selection!;
  b.dispatch(new UpdateProperty(id, "hidden", true));
  expect(b.getState().definition.components[0]?.visibleWhen).toBe(false);
  b.dispatch(new UpdateProperty(id, "hidden", false));
  expect(b.getState().definition.components[0]?.visibleWhen).toBeUndefined();
  b.dispatch(new UpdateProperty(id, "ariaLabel", "Full name"));
  expect(b.getState().definition.components[0]?.ariaLabel).toBe("Full name");
  const before = b.getState();
  b.dispatch(new UpdateProperty(id, "ariaLabel", "Full name"));
  expect(b.getState()).toBe(before);
  b.undo();
  b.dispatch(new UpdateProperty(id, "label", "New"));
  expect(b.getState().history.future).toHaveLength(0);
});
test("seeded random command sequences replay patches and undo/redo byte-identical JSON at every step", () => {
  for (let seed = 1; seed <= 25; seed++) {
    let random = seed;
    const next = () =>
      (random = (Math.imul(random, 1664525) + 1013904223) >>> 0) / 2 ** 32;
    const b = createBuilder(engine(), empty());
    const snapshots = [JSON.stringify(b.getState().definition)];
    let replayed = empty();
    b.subscribe((s, patch) => {
      replayed = replay(replayed, patch);
      expect(JSON.stringify(replayed)).toBe(JSON.stringify(s.definition));
    });
    for (let step = 0; step < 50; step++) {
      const nodes = b.getState().definition.components;
      const node = nodes[Math.floor(next() * nodes.length)];
      const choice = next();
      const command: Command =
        !node || choice < 0.4
          ? new AddComponent(next() > 0.5 ? "text" : "rating", {
              index: Math.floor(next() * (nodes.length + 1)),
            })
          : choice < 0.7
            ? new UpdateProperty(node.id, "label", `Label ${seed} ${step}`)
            : new RemoveComponent(node.id);
      expect(b.dispatch(command)).toEqual([]);
      snapshots.push(JSON.stringify(b.getState().definition));
    }
    for (let i = 49; i >= 0; i--) {
      b.undo();
      expect(JSON.stringify(b.getState().definition)).toBe(snapshots[i]);
    }
    for (let i = 1; i <= 50; i++) {
      b.redo();
      expect(JSON.stringify(b.getState().definition)).toBe(snapshots[i]);
    }
  }
});

test("key renames warn stale paths while preserving stable id references", () => {
  const e = engine();
  const d = empty();
  d.components = [
    { id: "a", type: "text", key: "a" },
    { id: "b", type: "text", key: "b", visibleWhen: ["empty", { ref: "a" }] },
    {
      id: "c",
      type: "text",
      key: "c",
      visibleWhen: ["empty", { path: "data.a" }],
    },
  ];
  const b = createBuilder(e, d);
  expect(b.dispatch(new UpdateProperty("a", "key", "renamed"))).toContainEqual(
    expect.objectContaining({
      severity: "warning",
      code: "stale-path",
      componentId: "c",
    }),
  );
  expect(b.getState().definition.components[1]?.visibleWhen).toEqual([
    "empty",
    { ref: "a" },
  ]);
  expect(
    b.dispatch(
      new UpdateProperty("c", "visibleWhen", [
        "empty",
        { path: "data.renamed" },
      ]),
    ),
  ).toEqual([]);
  expect(e.compile(b.getState().definition).ok).toBe(true);
});

test("draft key generation includes transparent descendants; clearing unset properties is a no-op", () => {
  const e = engine();
  const d = empty();
  d.components = [
    { id: "a", type: "text", key: "source" },
    {
      id: "layout",
      type: "section",
      components: [
        {
          id: "text",
          type: "text",
          key: "text",
          visibleWhen: ["empty", { ref: "a" }],
        },
      ],
    },
  ];
  const b = createBuilder(e, d);
  b.dispatch(new RemoveComponent("a"));
  expect(
    b.dispatch(new AddComponent("text")).every((d) => d.severity === "warning"),
  ).toBe(true);
  expect(b.getState().definition.components[1]?.key).toBe("text_2");
  const before = b.getState();
  const id = before.selection!;
  b.dispatch(new UpdateProperty(id, "validation.required", undefined));
  expect(b.getState()).toBe(before);
  b.dispatch(new UpdateProperty(id, "layout.width", undefined));
  expect(b.getState()).toBe(before);
});

test("generated JSON editors retain explicit null values rather than substituting defaults", () => {
  const e = engine().register({
    type: "custom",
    title: "Custom",
    value: stringValue(),
    properties: {
      settings: {
        kind: "json",
        label: "Settings",
        group: "Data",
        default: { enabled: true },
      },
    },
  });
  const b = createBuilder(e, empty());
  b.dispatch(new AddComponent("custom"));
  const id = b.getState().selection!;
  expect(
    b.dispatch(new UpdateProperty(id, "properties.settings", null)),
  ).toEqual([]);
  expect(
    b
      .propertyPanel(id)
      .groups.flatMap((g) => g.properties)
      .find((p) => p.key === "properties.settings")?.value,
  ).toBeNull();
});
