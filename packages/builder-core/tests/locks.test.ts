import { test, expect } from "vitest";
import { createEngine } from "@ourform/core";
import { builtinComponents } from "@ourform/components";
import {
  createBuilder,
  RemoveComponent,
  ChangeKey,
  MoveComponent,
  UpdateProperty,
  ReplaceDefinition,
  AddComponent,
} from "@ourform/builder-core";
import type { FormDefinition } from "@ourform/schema";
import type { Command, LockLevel } from "@ourform/builder-core";
const schema = (): FormDefinition => ({
  $formVersion: "1.0",
  id: "locks",
  display: "form",
  components: [
    { id: "a", key: "customerId", type: "text", label: "Customer" },
    { id: "b", key: "other", type: "text", label: "Other" },
    { id: "panel", type: "panel", components: [] },
    { id: "container", key: "address", type: "container", components: [] },
  ],
});
function make(level: LockLevel, selector = "customerId") {
  const engine = createEngine();
  for (const field of builtinComponents) engine.register(field.model);
  return createBuilder(engine, schema(), { locked: { [selector]: level } });
}
function refused(builder: ReturnType<typeof make>, command: Command) {
  const before = JSON.stringify(builder.getState());
  expect(builder.dispatch(command)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: "locked-component", componentId: "a" }),
    ]),
  );
  expect(JSON.stringify(builder.getState())).toBe(before);
}
test("key locks match id or key, reject ChangeKey and JSON renames, and allow all other edits", () => {
  for (const selector of ["a", "customerId"]) {
    const b = make("key", selector);
    expect(b.lockLevel("a")).toBe("key");
    refused(b, new ChangeKey("a", "newKey"));
    const json = structuredClone(b.getState().definition);
    json.components[0]!.key = "renamed";
    refused(b, new ReplaceDefinition(json));
    expect(b.dispatch(new UpdateProperty("a", "label", "Edited"))).toEqual([]);
    expect(
      b.dispatch(new MoveComponent("a", { parentId: "container" })),
    ).toEqual([]);
    expect(b.dispatch(new RemoveComponent("a"))).toEqual([]);
  }
});
test("structure locks reject delete, type/key edits and cross-scope moves, including JSON/ancestor bypasses", () => {
  const b = make("structure");
  refused(b, new RemoveComponent("a"));
  refused(b, new ChangeKey("a", "newKey"));
  refused(b, new MoveComponent("a", { parentId: "container" }));
  expect(b.canDrop("text", { parentId: "container" }, "a")).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: "locked-component" }),
    ]),
  );
  const json = structuredClone(b.getState().definition);
  json.components[0]!.type = "email";
  refused(b, new ReplaceDefinition(json));
  expect(b.dispatch(new MoveComponent("a", { parentId: "panel" }))).toEqual([]);
  expect(b.dispatch(new UpdateProperty("a", "description", "Allowed"))).toEqual(
    [],
  );
  expect(
    b.dispatch(new UpdateProperty("a", "validation.required", true)),
  ).toEqual([]);
  expect(b.dispatch(new UpdateProperty("a", "disabledWhen", true))).toEqual([]);
  expect(b.dispatch(new UpdateProperty("a", "layout.width", 6))).toEqual([]);
  refused(b, new MoveComponent("panel", { parentId: "container" }));
  refused(b, new RemoveComponent("panel"));
  expect(b.canDrop("panel", { parentId: "container" }, "panel")).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: "locked-component" }),
    ]),
  );
  const snapshot = JSON.stringify(b.getState().definition);
  b.undo();
  b.redo();
  expect(JSON.stringify(b.getState().definition)).toBe(snapshot);
});
test("all locks freeze properties, placement and JSON but allow inspecting selection and editing unrelated nodes", () => {
  const b = make("all", "a");
  refused(b, new UpdateProperty("a", "label", "Forbidden"));
  refused(b, new MoveComponent("a", { index: 1 }));
  refused(b, new RemoveComponent("a"));
  const json = structuredClone(b.getState().definition);
  json.components[0]!.validation = { required: true };
  refused(b, new ReplaceDefinition(json));
  expect(b.dispatch(new UpdateProperty("b", "label", "Allowed"))).toEqual([]);
  expect(b.dispatch(new AddComponent("text", { index: 0 }))).toEqual([]);
  b.select("a");
  expect(b.getState().selection).toBe("a");
  expect(b.lockLevel("missing")).toBeUndefined();
});
test("all-lock containers protect their child collections against Add, Move and imported descendants", () => {
  const engine = createEngine();
  for (const field of builtinComponents) engine.register(field.model);
  const b = createBuilder(engine, schema(), { locked: { panel: "all" } });
  const before = JSON.stringify(b.getState());
  expect(
    b.dispatch(new AddComponent("text", { parentId: "panel" }))[0]?.code,
  ).toBe("locked-component");
  expect(b.canDrop("text", { parentId: "panel" })[0]?.code).toBe(
    "locked-component",
  );
  expect(
    b.dispatch(new MoveComponent("b", { parentId: "panel" }))[0]?.code,
  ).toBe("locked-component");
  expect(JSON.stringify(b.getState())).toBe(before);
});
test("listed locks and readOnlyKeys default to structure; collisions use the stronger level and config is snapshotted", () => {
  const engine = createEngine();
  for (const field of builtinComponents) engine.register(field.model);
  for (const options of [
    { locked: ["customerId"] },
    { readOnlyKeys: ["customerId"] },
  ]) {
    const b = createBuilder(engine, schema(), options);
    expect(b.lockLevel("a")).toBe("structure");
    refused(b, new RemoveComponent("a"));
  }
  const locked: Record<string, LockLevel> = { a: "key", customerId: "all" };
  const b = createBuilder(engine, schema(), { locked });
  locked.customerId = "key";
  expect(b.lockLevel("a")).toBe("all");
  refused(b, new UpdateProperty("a", "label", "Still protected"));
  expect(() =>
    createBuilder(engine, schema(), { locked: { a: "invalid" as LockLevel } }),
  ).toThrow("Invalid");
  expect(() =>
    createBuilder(engine, schema(), { locked: { " ": "key" } }),
  ).toThrow("Invalid");
});
