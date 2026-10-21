import { expect, test } from "vitest";
import { createEngine, resolveSlots } from "@ourform/core";
import { builtinComponents } from "@ourform/components";
import { defineLayout, defineComposite, stringValue } from "@ourform/sdk";
import type { ComponentNode, FormDefinition } from "@ourform/schema";
import {
  createBuilder,
  AddComponent,
  RemoveComponent,
  UpdateProperty,
  MoveComponent,
  DuplicateComponent,
  ChangeKey,
  WrapInLayout,
  Unwrap,
  ReplaceDefinition,
} from "@ourform/builder-core";
import type { Command, JsonPatchOp } from "@ourform/builder-core";
const empty = (): FormDefinition => ({
  $formVersion: "1.0",
  id: "nested",
  display: "form",
  components: [],
});
function engine() {
  const e = createEngine();
  for (const field of builtinComponents) e.register(field.model);
  return e;
}
function nodes(definition: FormDefinition): ComponentNode[] {
  return definition.components.flatMap(function visit(node): ComponentNode[] {
    return [node, ...(node.components ?? []).flatMap(visit)];
  });
}
// Independent RFC 6902 interpreter: no production tree/history helpers are used.
function replay(input: FormDefinition, patch: JsonPatchOp[]): FormDefinition {
  let result: unknown = structuredClone(input);
  for (const op of patch) {
    if (op.path === "") {
      result = structuredClone("value" in op ? op.value : null);
      continue;
    }
    const parts = op.path
      .slice(1)
      .split("/")
      .map((s) => s.replaceAll("~1", "/").replaceAll("~0", "~"));
    let parent = result as Record<string, unknown>;
    for (const part of parts.slice(0, -1))
      parent = parent[part] as Record<string, unknown>;
    const key = parts.at(-1)!;
    if (Array.isArray(parent)) {
      if (op.op === "remove") parent.splice(Number(key), 1);
      else if (op.op === "add")
        parent.splice(Number(key), 0, structuredClone(op.value));
      else parent[Number(key)] = structuredClone(op.value);
    } else if (op.op === "remove") delete parent[key];
    else parent[key] = structuredClone(op.value);
  }
  return result as FormDefinition;
}
test("declarative named slots build four levels; refused cycles/kinds/capacity/root-only drops preserve redo", () => {
  const e = engine()
    .register(
      defineLayout({
        type: "acme-box",
        title: "SDK box",
        slots: [{ name: "body", label: "Fields", accepts: ["field"], max: 1 }],
      }).model,
    )
    .register({
      type: "page",
      title: "Page",
      kind: "layout",
      builder: { title: "Page", group: "Layouts", rootOnly: true },
    });
  const b = createBuilder(e, empty());
  const add = (type: string, parentId?: string, slot?: string) => {
    expect(
      b.dispatch(
        new AddComponent(type, {
          ...(parentId ? { parentId } : {}),
          ...(slot ? { slot } : {}),
        }),
      ),
    ).toEqual([]);
    return b.getState().selection!;
  };
  const tabs = add("tabs"),
    panel = add("panel", tabs, "second"),
    columns = add("columns", panel),
    field = add("text", columns);
  expect(
    b.getState().definition.components[0]?.components?.[0]?.components?.[0]
      ?.components?.[0]?.id,
  ).toBe(field);
  expect(b.getState().definition.components[0]?.components?.[0]?.slot).toBe(
    "second",
  );
  const box = add("acme-box");
  add("text", box);
  b.dispatch(new UpdateProperty(field, "label", "Changed"));
  b.undo();
  const before = b.getState();
  for (const command of [
    new MoveComponent(tabs, { parentId: field }),
    new MoveComponent(panel, { parentId: panel }),
    new AddComponent("panel", { parentId: box }),
    new AddComponent("text", { parentId: box }),
    new MoveComponent(field, { parentId: tabs, slot: "missing" }),
    new AddComponent("page", { parentId: panel }),
    new MoveComponent("missing"),
    new AddComponent("text", { slot: "body" }),
    new MoveComponent(field, { index: 99 }),
  ]) {
    expect(b.dispatch(command).some((d) => d.severity === "error")).toBe(true);
    expect(b.getState()).toBe(before);
  }
  expect(b.canDrop("panel", { parentId: box })[0]?.code).toBe("slot-accepts");
  expect(b.canDrop("text", { parentId: box })[0]?.code).toBe("slot-capacity");
  expect(b.getState()).toBe(before);
  b.redo();
  expect(
    nodes(b.getState().definition).find((n) => n.id === field)?.label,
  ).toBe("Changed");
});
test("cross-scope moves and ChangeKey re-check conflicts, warn stale paths and preserve ref ids", () => {
  const e = engine(),
    d = empty();
  d.components = [
    { id: "name", type: "text", key: "name" },
    {
      id: "person",
      type: "container",
      key: "person",
      components: [{ id: "conflict", type: "text", key: "name" }],
    },
    {
      id: "path",
      type: "text",
      key: "path",
      visibleWhen: ["empty", { path: "data.name" }],
    },
    {
      id: "ref",
      type: "text",
      key: "ref",
      visibleWhen: ["empty", { ref: "name" }],
    },
  ];
  const b = createBuilder(e, d),
    before = b.getState();
  expect(
    b.dispatch(new MoveComponent("name", { parentId: "person" })),
  ).toContainEqual(
    expect.objectContaining({ code: "duplicate-key", severity: "error" }),
  );
  expect(b.getState()).toBe(before);
  b.dispatch(new RemoveComponent("conflict"));
  expect(
    b.dispatch(new MoveComponent("name", { parentId: "person" })),
  ).toContainEqual(
    expect.objectContaining({
      code: "stale-path",
      componentId: "path",
      severity: "warning",
    }),
  );
  expect(
    nodes(b.getState().definition).find((n) => n.id === "ref")?.visibleWhen,
  ).toEqual(["empty", { ref: "name" }]);
  b.dispatch(
    new UpdateProperty("path", "visibleWhen", [
      "empty",
      { path: "data.person.name" },
    ]),
  );
  let compiled = e.compile(b.getState().definition);
  expect(compiled.ok).toBe(true);
  if (compiled.ok)
    expect(compiled.form.byId.name?.path).toEqual(["person", "name"]);
  expect(b.dispatch(new ChangeKey("name", "full_name"))).toContainEqual(
    expect.objectContaining({ code: "stale-path", componentId: "path" }),
  );
  b.dispatch(
    new UpdateProperty("path", "visibleWhen", [
      "empty",
      { path: "data.person.full_name" },
    ]),
  );
  compiled = e.compile(b.getState().definition);
  expect(compiled.ok).toBe(true);
  const renamed = b.getState();
  expect(
    b
      .dispatch(new ChangeKey("path", "ref"))
      .some((d) => d.severity === "error"),
  ).toBe(true);
  expect(b.getState()).toBe(renamed);
});
test("duplicate rebases whole-subtree and composite refs, makes scoped keys unique, and preserves external/opaque refs", () => {
  const address = defineComposite({
    type: "address",
    title: "Address",
    dataScope: "object",
    components: [{ id: "street", type: "text", key: "street" }],
  });
  const e = engine()
      .register(address.model)
      .register({ type: "external", title: "External", value: stringValue() }),
    d = empty();
  d.components = [
    { id: "outside", type: "text", key: "outside" },
    { id: "address/not-a-child", type: "external", key: "external" },
    {
      id: "panel",
      type: "panel",
      components: [
        { id: "a", type: "text", key: "a", meta: { ref: "a" } },
        {
          id: "b",
          type: "number",
          key: "b",
          calculate: { expr: ["len", { ref: "a" }] },
        },
        { id: "address", type: "address", key: "address" },
        {
          id: "c",
          type: "text",
          key: "c",
          visibleWhen: [
            "and",
            ["empty", { ref: "address/street" }],
            ["empty", { ref: "outside" }],
            ["empty", { ref: "address/not-a-child" }],
          ],
        },
      ],
    },
  ];
  const b = createBuilder(e, d);
  expect(b.dispatch(new DuplicateComponent("panel"))).toEqual([]);
  const duplicate = b.getState().definition.components.at(-1)!;
  const [a, numeric, composite, c] = duplicate.components!;
  expect(a?.key).toBe("a_2");
  expect(numeric?.key).toBe("b_2");
  expect(composite?.key).toBe("address_2");
  expect(a?.meta).toEqual({ ref: "a" });
  expect(numeric?.calculate?.expr).toEqual(["len", { ref: a!.id }]);
  expect(c?.visibleWhen).toEqual([
    "and",
    ["empty", { ref: `${composite!.id}/street` }],
    ["empty", { ref: "outside" }],
    ["empty", { ref: "address/not-a-child" }],
  ]);
  expect(e.compile(b.getState().definition).ok).toBe(true);
  const bytes = JSON.stringify(b.getState().definition);
  b.undo();
  b.redo();
  expect(JSON.stringify(b.getState().definition)).toBe(bytes);
});
test("slot-local indexes and wrap/unwrap patches replay independently and preserve field identity", () => {
  const e = engine(),
    d = empty();
  d.components = [
    {
      id: "tabs",
      type: "tabs",
      components: [
        { id: "a", type: "text", key: "a" },
        { id: "b", type: "text", key: "b", slot: "second" },
        { id: "c", type: "text", key: "c" },
      ],
    },
  ];
  const b = createBuilder(e, d);
  let applied = d;
  b.subscribe((state, patch) => {
    applied = replay(applied, patch);
    expect(JSON.stringify(applied)).toBe(JSON.stringify(state.definition));
  });
  expect(
    b.dispatch(
      new MoveComponent("c", { parentId: "tabs", slot: "first", index: 0 }),
    ),
  ).toEqual([]);
  expect(
    b.getState().definition.components[0]?.components?.map((n) => n.id),
  ).toEqual(["c", "a", "b"]);
  expect(
    b.dispatch(
      new MoveComponent("a", { parentId: "tabs", slot: "second", index: 0 }),
    ),
  ).toEqual([]);
  const beforeWrap = JSON.stringify(b.getState().definition);
  expect(b.dispatch(new WrapInLayout("a", "panel"))).toEqual([]);
  const wrapper = b.getState().selection!;
  expect(
    nodes(b.getState().definition).find((n) => n.id === "a")?.slot,
  ).toBeUndefined();
  expect(
    nodes(b.getState().definition).find((n) => n.id === wrapper)?.slot,
  ).toBe("second");
  expect(b.dispatch(new Unwrap(wrapper))).toEqual([]);
  expect(JSON.stringify(b.getState().definition)).toBe(beforeWrap);
  b.undo();
  b.redo();
  expect(JSON.stringify(b.getState().definition)).toBe(beforeWrap);
  const before = b.getState();
  expect(
    b.dispatch(
      new MoveComponent("a", { parentId: "tabs", slot: "second", index: 0 }),
    ),
  ).toEqual([]);
  expect(b.getState()).toBe(before);
});
test("bounded history and atomic JSON import retain exact snapshots and reject malformed drafts", () => {
  const e = engine(),
    b = createBuilder(e, empty(), { historyLimit: 3 });
  for (let i = 0; i < 5; i++) b.dispatch(new AddComponent("text"));
  expect(b.getState().history.past).toHaveLength(3);
  const bytes = JSON.stringify(b.getState().definition);
  for (let i = 0; i < 5; i++) b.undo();
  expect(b.getState().definition.components).toHaveLength(2);
  for (let i = 0; i < 3; i++) b.redo();
  expect(JSON.stringify(b.getState().definition)).toBe(bytes);
  const before = b.getState();
  expect(
    b
      .dispatch(new ReplaceDefinition({ id: "invalid" }))
      .some((d) => d.severity === "error"),
  ).toBe(true);
  expect(b.getState()).toBe(before);
  expect(() => new ReplaceDefinition({ unsafe: Infinity })).toThrow("safe");
  expect(b.dispatch(new ReplaceDefinition(empty()))).toEqual([]);
  expect(b.getState().definition.components).toEqual([]);
  b.undo();
  expect(JSON.stringify(b.getState().definition)).toBe(bytes);
  for (const historyLimit of [0, -1, 1.5, Infinity, 1001])
    expect(() => createBuilder(e, empty(), { historyLimit })).toThrow(
      "historyLimit",
    );
});
test.each(Array.from({ length: 50 }, (_, index) => index + 1))(
  "seed %i: nested commands replay patches and undo/redo every JSON byte",
  (seed) => {
    let random = seed;
    const next = () =>
      (random = (Math.imul(random, 1664525) + 1013904223) >>> 0) / 2 ** 32;
    const e = engine(),
      b = createBuilder(e, empty()),
      snapshots = [JSON.stringify(b.getState().definition)];
    let applied = empty();
    b.subscribe((state, patch) => {
      applied = replay(applied, patch);
      expect(JSON.stringify(applied)).toBe(JSON.stringify(state.definition));
    });
    const ids: string[] = [];
    for (let step = 0; step < 50; step++) {
      const all = nodes(b.getState().definition),
        pick = all[Math.floor(next() * all.length)];
      const layouts = all.filter((n) => e.getField(n.type)?.kind === "layout");
      const parent =
        next() < 0.7 ? layouts[Math.floor(next() * layouts.length)] : undefined;
      const slots = parent
        ? resolveSlots(e.getField(parent.type)!, parent)
        : [];
      const target = parent
        ? {
            parentId: parent.id,
            slot: slots[Math.floor(next() * slots.length)]!.name,
          }
        : {};
      const initial: (() => Command)[] = [
        () => new AddComponent("tabs"),
        () => new AddComponent("panel", { parentId: ids[0]! }),
        () => new AddComponent("columns", { parentId: ids[1]! }),
        () => new AddComponent("text", { parentId: ids[2]! }),
        () => new MoveComponent(ids[3]!, { parentId: ids[0]!, slot: "second" }),
        () => new DuplicateComponent(ids[1]!),
        () => new WrapInLayout(ids[3]!, "panel"),
        () => new Unwrap(ids[6]!),
        () => new ChangeKey(ids[3]!, "answer"),
        () => new UpdateProperty(ids[3]!, "label", "Answer"),
      ];
      const choices: (() => Command)[] = [
        () => new AddComponent(next() < 0.5 ? "text" : "container", target),
        () => new MoveComponent(pick!.id, target),
        () => new DuplicateComponent(pick!.id, target),
        () => new WrapInLayout(pick!.id, "panel"),
        () => new Unwrap(pick!.id),
        () => new ChangeKey(pick!.id, `key_${seed}_${step}`),
        () => new UpdateProperty(pick!.id, "label", `Label ${seed} ${step}`),
        () => new RemoveComponent(pick!.id),
      ];
      const command =
        step < initial.length
          ? initial[step]!()
          : !pick
            ? new AddComponent("text")
            : choices[Math.floor(next() * choices.length)]!();
      const before = b.getState(),
        diagnostics = b.dispatch(command);
      if (step < 10) expect(diagnostics).toEqual([]);
      ids.push(b.getState().selection ?? "");
      if (diagnostics.some((d) => d.severity === "error"))
        expect(b.getState()).toBe(before);
      if (b.getState() !== before) {
        expect(e.compile(b.getState().definition).ok).toBe(true);
        snapshots.push(JSON.stringify(b.getState().definition));
      }
    }
    for (let i = snapshots.length - 2; i >= 0; i--) {
      b.undo();
      expect(JSON.stringify(b.getState().definition)).toBe(snapshots[i]);
    }
    for (let i = 1; i < snapshots.length; i++) {
      b.redo();
      expect(JSON.stringify(b.getState().definition)).toBe(snapshots[i]);
    }
  },
);
