import { expect, test } from "vitest";
import { createEngine } from "../src/index";
import { createLogic } from "../src/logic/index";
import { field, form, text, panel, number } from "./helpers";

test("independent competing value writers preserve definition priority regardless of field rank", () => {
  for (const reverse of [false, true]) {
    const fields = [
      field("source"),
      field("a", { defaultValue: "first" }),
      field("b", { defaultValue: "second" }),
      field("target"),
    ];
    const engine = createEngine({ logic: createLogic() }).register(text);
    const compiled = engine.compile({
      ...form(reverse ? fields.reverse() : fields),
      logic: [
        {
          id: "earlier",
          trigger: { on: "change", refs: ["source"] },
          then: [{ action: "setValue", target: "target", value: { ref: "b" } }],
        },
        {
          id: "later",
          trigger: { on: "change", refs: ["source"] },
          then: [{ action: "setValue", target: "target", value: { ref: "a" } }],
        },
      ],
    });
    if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
    expect(compiled.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "logic-conflict",
        componentId: "target",
        message: expect.stringMatching(/earlier.*later/),
      }),
    );
    const s = engine.createSession(compiled.form);
    const patches: unknown[] = [];
    s.subscribe((patch) => patches.push(patch));
    s.setValue("source", "go");
    expect(s.getValue("target")).toBe("first");
    expect(s.getFieldState("target").logic?.ruleId).toBe("later");
    expect(patches).toHaveLength(1);
    s.dispose();
  }
});

test("sequential actions depend on their own reads rather than unrelated later action reads", () => {
  const engine = createEngine({ logic: createLogic() }).register(text);
  const compiled = engine.compile({
    ...form([field("source"), field("a"), field("b")]),
    logic: [
      {
        id: "sequential",
        trigger: { on: "change", refs: ["source"] },
        then: [
          { action: "setValue", target: "a", value: "assigned" },
          { action: "setValue", target: "b", value: { ref: "a" } },
        ],
      },
    ],
  });
  expect(compiled.ok, JSON.stringify(compiled.diagnostics)).toBe(true);
  if (!compiled.ok) throw new Error("Expected an acyclic action sequence");
  const s = engine.createSession(compiled.form);
  s.setValue("source", "go");
  expect(s.getData()).toEqual({ source: "go", a: "assigned", b: "assigned" });
  s.dispose();
});
import { toSubmissionSchema } from "@ourform/schema";

test("root actions settle legacy calculations in action order and expire overrides when dependencies change", () => {
  for (const override of [false, true]) {
    const engine = createEngine({ logic: createLogic() })
      .register(text)
      .register(number);
    const compiled = engine.compile({
      ...form([
        field("source"),
        field("a", { type: "number", defaultValue: 2 }),
        field("derived", {
          type: "number",
          calculate: { expr: ["mul", { ref: "a" }, 2], allowOverride: true },
        }),
        field("result", { type: "number" }),
      ]),
      logic: [
        {
          id: "ordered-actions",
          trigger: { on: "change", refs: ["source"] },
          then: [
            { action: "setValue", target: "a", value: 3 },
            { action: "setValue", target: "result", value: { ref: "derived" } },
          ],
        },
      ],
    });
    if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
    const session = engine.createSession(compiled.form);
    if (override) session.setValue("derived", 99, { source: "user" });
    const patches: unknown[] = [];
    session.subscribe((patch) => patches.push(patch));
    session.setValue("source", "go");
    expect(session.getData()).toEqual({
      source: "go",
      a: 3,
      derived: 6,
      result: 6,
    });
    expect(patches).toHaveLength(1);
    session.dispose();
  }
});

test("a reverting higher-priority writer cannot suppress a still-active lower writer", () => {
  for (const calculate of [false, true]) {
    const action = (value: string | { ref: string }) =>
      calculate
        ? { action: "calculate", target: "target", expr: value }
        : { action: "setValue", target: "target", value };
    const engine = createEngine({ logic: createLogic() }).register(text);
    const compiled = engine.compile({
      ...form([
        field("source"),
        field("other", { defaultValue: "low" }),
        field("target"),
      ]),
      logic: [
        {
          id: "lower",
          trigger: { on: "change", refs: ["source"] },
          then: [action({ ref: "other" })],
        },
        {
          id: "higher",
          trigger: { on: "change", refs: ["source"] },
          when: ["eq", { ref: "source" }, "yes"],
          then: [action("high")],
        },
      ],
    });
    if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
    const session = engine.createSession(compiled.form);
    session.setValue("source", "yes");
    expect(session.getValue("target")).toBe("high");
    const patches: unknown[] = [];
    session.subscribe((patch) => patches.push(patch));
    session.setValue("source", "no");
    expect(session.getValue("target")).toBe("low");
    expect(session.getFieldState("target").logic?.ruleId).toBe("lower");
    expect(patches).toHaveLength(1);
    session.dispose();
  }
});

test("an unchanged legacy calculation does not fire a root value edge or evaluate an unrelated rule", () => {
  const engine = createEngine({ logic: createLogic() }).register(text);
  const compiled = engine.compile({
    ...form([
      field("source"),
      field("derived", {
        calculate: {
          expr: ["if", ["eq", { ref: "source" }, "yes"], "same", "same"],
        },
      }),
      field("target"),
    ]),
    logic: [
      {
        id: "derived-edge",
        trigger: { on: "change", refs: ["derived"] },
        then: [{ action: "setValue", target: "target", value: "changed" }],
      },
    ],
  });
  if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
  const session = engine.createSession(compiled.form);
  const before = session.debug.logic!.candidates;
  session.setValue("source", "yes");
  expect(session.getData()).toEqual({
    source: "yes",
    derived: "same",
    target: "",
  });
  expect(session.debug.logic!.candidates - before).toBe(0);
  session.dispose();
});

test("source capability schema projection preserves static requirements and defers active dynamic writers only", () => {
  const engine = createEngine({ logic: createLogic() })
    .register(text)
    .register(panel);
  const compiled = engine.compile({
    ...form([
      field("static", { validation: { required: true } }),
      field("dynamic", { validation: { required: true, minLength: 2 } }),
      field("calculated", { validation: { required: true } }),
      field("disabled", { validation: { required: true } }),
      {
        id: "group",
        type: "panel",
        components: [field("child", { validation: { required: true } })],
      },
    ]),
    logic: [
      {
        id: "active",
        trigger: { on: "load" },
        then: [
          { action: "optional", target: "dynamic" },
          { action: "calculate", target: "calculated", expr: "server" },
          { action: "hide", target: "group" },
        ],
      },
      {
        id: "off",
        enabled: false,
        trigger: { on: "load" },
        then: [{ action: "optional", target: "disabled" }],
      },
    ],
  });
  if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
  const schema = toSubmissionSchema(compiled.form);
  expect(schema.required).toEqual(["static", "disabled"]);
  expect(schema["x-ourform-logic"]).toEqual(compiled.form.definition.logic);
  expect(
    (schema.properties as Record<string, Record<string, unknown>>).dynamic![
      "x-ourform-validation"
    ],
  ).toEqual({ required: true, minLength: 2 });
  expect(JSON.stringify(schema)).not.toContain("dynamicValidation");
});

test("root rules compose with generated composite ids without hiding genuine legacy reference errors", () => {
  const engine = createEngine({ logic: createLogic() })
    .register(text)
    .register({
      type: "address",
      title: "Address",
      kind: "composite",
      dataScope: "object",
      expand: () => [field("address/street", { key: "street" })],
    });
  const definition = {
    ...form([
      { id: "address", key: "address", type: "address" },
      field("summary", {
        visibleWhen: ["eq", { ref: "address/street" }, "Main street"],
      }),
    ]),
    logic: [
      {
        id: "fill",
        trigger: { on: "load" },
        then: [
          {
            action: "setValue",
            target: "address/street",
            value: "Main street",
          },
        ],
      },
    ],
  };
  const compiled = engine.compile(definition);
  if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
  const session = engine.createSession(compiled.form);
  expect(session.getValue("address.street")).toBe("Main street");
  expect(session.getFieldState("summary").visible).toBe(true);
  session.dispose();
  const invalid = engine.compile({
    ...definition,
    components: [
      definition.components[0],
      field("summary", { visibleWhen: { ref: "unknown" } }),
    ],
  });
  expect(invalid.ok).toBe(false);
  expect(invalid.diagnostics.some((d) => d.code === "bad-ref")).toBe(true);
});

test("a hidden write cleared back to its stored value does not create a downstream value edge", () => {
  for (const clearOnHide of [true, false]) {
    const engine = createEngine({ logic: createLogic() }).register(text);
    const compiled = engine.compile({
      ...form([
        field("source"),
        field("hidden", { visibleWhen: false, clearOnHide }),
        field("target"),
      ]),
      logic: [
        {
          id: "write-hidden",
          trigger: { on: "change", refs: ["source"] },
          then: [{ action: "setValue", target: "hidden", value: "retained" }],
        },
        {
          id: "hidden-edge",
          trigger: { on: "change", refs: ["hidden"] },
          then: [{ action: "setValue", target: "target", value: "cascade" }],
        },
      ],
    });
    if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
    const session = engine.createSession(compiled.form);
    session.setValue("source", "go");
    expect(session.getValue("target")).toBe(clearOnHide ? "" : "cascade");
    expect(session.getValue("hidden")).toBe(clearOnHide ? "" : "retained");
    session.dispose();
  }
});
