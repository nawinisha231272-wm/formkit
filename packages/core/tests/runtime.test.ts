import { test, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import {
  createEngine,
  Registry,
  parsePath,
  formatPath,
  type StatePatch,
  type ComponentModel,
} from "../src/index";
import { engine, field, form, session, text } from "./helpers";
const load = (name: string): unknown =>
  JSON.parse(
    readFileSync(
      new URL(`../../../fixtures/forms/${name}.json`, import.meta.url),
      "utf8",
    ),
  );
test("twenty shared fixtures compile or produce their expected diagnostics", async () => {
  const names = readdirSync(
    new URL("../../../fixtures/forms/", import.meta.url),
  ).filter((n) => n.endsWith(".json"));
  expect(names.length).toBeGreaterThanOrEqual(20);
  for (const name of names) {
    const e = engine();
    if (name === "feedback.json") continue;
    const result = e.compile(load(name.slice(0, -5)));
    expect(result.ok, name).toBe(!name.includes(".invalid"));
    if (result.ok) {
      const s = e.createSession(result.form);
      expect(s.getData()).toBeDefined();
      await s.validate();
      expect(s.getFieldState(result.form.nodes[0]!.node.id)).toBeDefined();
    }
  }
});
test("one change in the 200-field fixture processes only transitive dependents", () => {
  const s = session(engine(), load("200-fields"));
  const before = { ...s.debug.processorRuns };
  const patches: StatePatch[] = [];
  s.subscribe((p) => patches.push(p));
  s.setValue("f0", 4);
  expect(s.getValue("f1")).toBe(5);
  expect(s.getValue("f2")).toBe(10);
  expect(
    Object.keys(before).filter(
      (id) => s.debug.processorRuns[id] !== before[id],
    ),
  ).toEqual(["f0", "f1", "f2"]);
  expect(patches).toHaveLength(1);
  expect(patches[0]!.changedFields).toEqual(["f0", "f1", "f2"]);
  expect(patches[0]!.changedPaths).toEqual([["f0"], ["f1"], ["f2"]]);
});
test("calculation cycles name all and only actual cycle members", () => {
  const r = engine().compile(load("cycle.invalid"));
  expect(r.ok).toBe(false);
  expect(
    r.diagnostics
      .filter((d) => d.code === "cycle")
      .map((d) => d.componentId)
      .sort(),
  ).toEqual(["a", "b"]);
  expect(r.diagnostics.every((d) => d.message.includes("a, b"))).toBe(true);
  expect(
    engine().compile(
      form([field("self", { calculate: { expr: { ref: "self" } } })]),
    ),
  ).toMatchObject({ ok: false, diagnostics: [{ code: "cycle" }] });
});
test("hidden fields clear, skip validation and restore defaults; preserve opts out", async () => {
  const s = session(engine(), load("clear-on-hide"));
  s.setValue("name", "changed");
  s.setValue("show", 0);
  expect(s.getValue("name")).toBe("");
  expect(s.getFieldState("name")).toMatchObject({ visible: false, errors: [] });
  expect((await s.validate()).valid).toBe(true);
  s.setValue("show", 1);
  expect(s.getValue("name")).toBe("restored");
  const p = session(engine(), load("preserve-on-hide"));
  p.setValue("name", "edited");
  p.setValue("show", 0);
  p.setValue("show", 1);
  expect(p.getValue("name")).toBe("edited");
  const noDefault = session(
    engine(),
    form([
      field("show"),
      field("child", { visibleWhen: ["eq", { ref: "show" }, "yes"] }),
    ]),
  );
  noDefault.setValue("show", "yes");
  expect(noDefault.getValue("child")).toBe("");
});
test("nested object snapshots share untouched branches and isolate caller data", () => {
  const e = engine();
  const s = session(
    e,
    form([
      field("left", {
        type: "container",
        components: [field("city", { id: "leftCity" })],
      }),
      field("right", {
        type: "container",
        components: [field("city", { id: "rightCity" })],
      }),
    ]),
    { left: { city: "A" }, right: { city: "B" }, ignored: 1 },
  );
  const before = s.getData();
  expect(s.getValue(["left", "city"])).toBe("A");
  s.setValue("left.city", "C");
  const after = s.getData();
  expect(after).not.toBe(before);
  expect(after.right).toBe(before.right);
  expect(before.left).toEqual({ city: "A" });
  expect(Object.isFrozen(after)).toBe(true);
  expect(Object.isFrozen(after.left)).toBe(true);
  expect(after).not.toHaveProperty("ignored");
  expect(parsePath("left.city")).toEqual(["left", "city"]);
  expect(formatPath(["left", "city"])).toBe("left.city");
  for (const bad of [
    "__proto__.x",
    "a.constructor",
    "a[0].b",
    "a..b",
    "",
    "1bad",
  ])
    expect(() => parsePath(bad)).toThrow("unsafe");
  expect(() => parsePath([{ row: "a" }])).toThrow();
  expect(() => s.getFieldState("missing")).toThrow("Unknown");
});
test("object path and container reference dependencies update derived fields", () => {
  const e = engine();
  const s = session(
    e,
    form([
      field("customer", {
        type: "container",
        components: [field("city", { defaultValue: "Boston" })],
      }),
      field("summary", { calculate: { expr: { path: "data.customer.city" } } }),
      field("count", {
        type: "number",
        calculate: { expr: ["len", { ref: "customer" }] },
      }),
    ]),
  );
  expect(s.getValue("summary")).toBe("Boston");
  s.setValue("customer.city", "NYC");
  expect(s.getValue("summary")).toBe("NYC");
  expect(s.getValue("count")).toBe(1);
  expect(s.getFieldState("customer").value).toEqual({ city: "NYC" });
});
test("ancestor visibility/disabled state propagates and hidden descendants are not validated", async () => {
  const s = session(
    engine(),
    form([
      field("show"),
      field("lock"),
      field("box", {
        type: "container",
        visibleWhen: ["eq", { ref: "show" }, "yes"],
        disabledWhen: ["eq", { ref: "lock" }, "yes"],
        components: [
          field("child", {
            defaultValue: "default",
            validation: { required: true },
          }),
        ],
      }),
    ]),
  );
  expect(s.getFieldState("child").visible).toBe(false);
  s.setValue("show", "yes");
  expect(s.getValue("box.child")).toBe("default");
  s.setValue("lock", "yes");
  expect(s.getFieldState("child").disabled).toBe(true);
  s.setValue("box.child", "blocked", { source: "user" });
  expect(s.getValue("box.child")).toBe("default");
  s.setValue("show", "");
  expect(s.getValue("box.child")).toBe("");
  expect((await s.validate()).valid).toBe(true);
});
test.each(["change", "blur", "submit"] as const)(
  "validation timing %s, explicit validation and reset",
  async (timing) => {
    const s = session(
      engine(),
      form(
        [
          field("name", {
            validation: {
              required: true,
              minLength: 2,
              maxLength: 4,
              pattern: "^[A-Z]+$",
            },
          }),
        ],
        { validateOn: timing },
      ),
    );
    expect(s.getFieldState("name").errors.length).toBe(
      timing === "change" ? 1 : 0,
    );
    s.setValue("name", "x");
    expect(s.getFieldState("name").errors.length).toBe(
      timing === "change" ? 2 : 0,
    );
    s.touch("name");
    expect(s.getFieldState("name").errors.length).toBe(
      timing === "submit" ? 0 : 2,
    );
    const result = await s.validate({ paths: ["name"] });
    expect(result.errors.map((e) => e.error.code)).toEqual([
      "minLength",
      "pattern",
    ]);
    expect(await s.submit()).toMatchObject({ ok: false });
    s.setValue("name", "TOOLONG");
    expect((await s.validate()).errors[0]!.error).toMatchObject({
      code: "maxLength",
      messageKey: "of.validation.maxLength",
    });
    s.reset({ name: "OK" });
    expect(s.getFieldState("name")).toMatchObject({
      dirty: false,
      touched: false,
    });
    expect(await s.submit()).toEqual({ ok: true, data: { name: "OK" } });
  },
);
test("number bounds, empty optional values and min/max item rules", async () => {
  const array: ComponentModel = {
    type: "arrayValue",
    title: "Array value",
    value: {
      empty: () => [],
      normalize: (v) => (Array.isArray(v) ? v : []),
      isEmpty: (v) => Array.isArray(v) && !v.length,
    },
  };
  const s = session(
    engine().register(array),
    form([
      field("age", { type: "number", validation: { min: 2, max: 4 } }),
      field("list", {
        type: "arrayValue",
        validation: { minItems: 2, maxItems: 3 },
      }),
    ]),
  );
  expect((await s.validate()).valid).toBe(true);
  s.setValue("age", 1);
  s.setValue("list", [1]);
  expect((await s.validate()).errors.map((e) => e.error.code)).toEqual([
    "min",
    "minItems",
  ]);
  s.setValue("age", 5);
  s.setValue("list", [1, 2, 3, 4]);
  expect((await s.validate()).errors.map((e) => e.error.code)).toEqual([
    "max",
    "maxItems",
  ]);
});
test("allowed user overrides expire on dependency change; API cannot override calculations", () => {
  const s = session(
    engine(),
    form([
      field("a", { type: "number", defaultValue: 2 }),
      field("b", {
        type: "number",
        calculate: { expr: ["mul", { ref: "a" }, 2], allowOverride: true },
      }),
    ]),
  );
  s.setValue("b", 9, { source: "user" });
  expect(s.getValue("b")).toBe(9);
  s.touch("b");
  expect(s.getValue("b")).toBe(9);
  s.setValue("a", 3);
  expect(s.getValue("b")).toBe(6);
  s.setValue("b", 99);
  expect(s.getValue("b")).toBe(6);
  s.reset();
  expect(s.getValue("b")).toBe(4);
});
test("value equality, serialization, readOnly, disposal and unsubscribe", async () => {
  const e = engine().register({
    type: "objectValue",
    title: "Object",
    value: {
      empty: () => ({ x: 0 }),
      normalize: (v) => v as { x: number },
      isEmpty: () => false,
      equals: (a, b) => a.x === b.x,
      serialize: (v) => v.x,
    },
  });
  const compiled = e.compile(form([field("object", { type: "objectValue" })]));
  expect(compiled.ok).toBe(true);
  if (!compiled.ok) return;
  const s = e.createSession(compiled.form, { mode: "readOnly" });
  const changes: unknown[] = [];
  const off = s.subscribe((p) => changes.push(p));
  s.setValue("object", { x: 1 }, { source: "user" });
  expect(s.getValue("object")).toEqual({ x: 0 });
  expect(changes).toEqual([
    { changedFields: ["object"], changedPaths: [], data: { object: { x: 0 } } },
  ]);
  changes.length = 0; // The following equal API write must still emit nothing.
  s.setValue("object", { x: 0 });
  expect(changes).toEqual([]);
  const input = { x: 2 };
  s.setValue("object", input);
  input.x = 7;
  expect(s.getValue("object")).toEqual({ x: 2 });
  expect(s.getFieldState("object").readOnly).toBe(true);
  expect(await s.submit()).toEqual({ ok: true, data: { object: 2 } });
  off();
  s.reset();
  const n = changes.length;
  s.dispose();
  expect(() => s.setValue("object", { x: 3 })).toThrow("disposed");
  expect(() => s.touch("object")).toThrow("disposed");
  expect(() => s.subscribe(() => {})).toThrow("disposed");
  expect(() => s.reset()).toThrow("disposed");
  expect(changes).toHaveLength(n);
  expect(() => createEngine().createSession(compiled.form)).toThrow("belong");
});
test("compiled snapshots isolate schema/registry and remain immutable", () => {
  const e = engine();
  const definition = form([field("name", { defaultValue: "original" })]);
  const r = e.compile(definition);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  definition.components[0]!.defaultValue = "mutated";
  expect(e.createSession(r.form).getValue("name")).toBe("original");
  expect(Object.isFrozen(r.form.byId)).toBe(true);
  expect(Object.isFrozen(r.form.definition.components)).toBe(true);
  const registry = new Registry().register(text);
  expect(registry.list()).toHaveLength(1);
  expect(() => registry.register(text)).toThrow("Duplicate");
  expect(() => registry.register({ ...text, type: "" })).toThrow("empty");
  const s = e.createSession(r.form);
  expect(() => s.setValue("name", () => {})).not.toThrow(); // text normalization produces JSON strings
  expect(() => session(e, definition, [])).toThrow("object");
  expect(() =>
    s.setValue("name", {
      toString() {
        throw new Error("host adapter");
      },
    }),
  ).toThrow("host adapter");
  expect(() =>
    session(
      engine(),
      form([field("container", { type: "container" })]),
    ).setValue("container", {}),
  ).toThrow("non-value");
});
test("submission returns the validated snapshot despite later edits or listener changes", async () => {
  const s = session(
    engine(),
    form([
      field("name", { defaultValue: "valid", validation: { required: true } }),
    ]),
  );
  const pending = s.submit();
  s.setValue("name", "");
  expect(await pending).toEqual({ ok: true, data: { name: "valid" } });
  s.reset({ name: "valid" });
  let fired = false;
  s.subscribe(() => {
    if (!fired) {
      fired = true;
      s.setValue("name", "");
    }
  });
  expect(await s.submit()).toEqual({ ok: true, data: { name: "valid" } });
  expect(s.getValue("name")).toBe("");
});
test("compiler diagnoses unsupported capabilities and malformed executable input", () => {
  const e = engine()
    .register({ type: "rows", title: "Rows", dataScope: "array" })
    .register({ type: "composite", title: "Composite", kind: "composite" });
  for (const [definition, code] of [
    [form([field("rows", { type: "rows" })]), "unsupported-scope"],
    [
      form([field("composite", { type: "composite" })]),
      "unsupported-component",
    ],
    [form([{ id: "object", type: "container" }]), "missing-key"],
    [
      form([field("panel", { type: "panel", calculate: { expr: 1 } })]),
      "invalid-calculation",
    ],
    [
      form([
        field("name", { validation: { custom: [{ validator: "remote" }] } }),
      ]),
      "unsupported-validator",
    ],
    [
      { ...form([]), requires: [{ plugin: "missing", version: "1" }] },
      "missing-plugin",
    ],
    [
      form([field("name", { calculate: { expr: { path: "data.missing" } } })]),
      "bad-path",
    ],
    [form([field("name", { visibleWhen: { ref: "name" } })]), "cycle"],
  ] as [unknown, string][])
    expect(e.compile(definition).diagnostics.some((d) => d.code === code)).toBe(
      true,
    );
  const cycle: Record<string, unknown> = {};
  cycle.self = cycle;
  expect(e.compile(cycle).ok).toBe(false);
  const malicious = new Proxy(
    {},
    {
      get() {
        throw new Error("getter");
      },
    },
  );
  expect(() => e.compile(malicious)).not.toThrow();
  expect(e.compile(malicious).ok).toBe(false);
});
test("explicit null defaults and value adapter snapshots retain their meaning", () => {
  const e = engine().register({
    type: "nullable",
    title: "Nullable",
    value: {
      empty: () => ({ empty: true }),
      normalize: (v) => v,
      isEmpty: (v) => v === null,
    },
  });
  const s = session(
    e,
    form([
      field("show"),
      field("value", {
        type: "nullable",
        defaultValue: null,
        visibleWhen: ["eq", { ref: "show" }, "yes"],
      }),
    ]),
  );
  expect(s.getValue("value")).toEqual({ empty: true });
  s.setValue("show", "yes");
  expect(s.getValue("value")).toBeNull();
});
