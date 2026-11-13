import { expect, test } from "vitest";
import { validateSubmission } from "@ourform/validation";
import { createEngine, type ComponentModel } from "../src/index";
import { createLogic } from "../src/logic/index";
import { field, form, number, text } from "./helpers";
import type { Expr, LogicRule } from "@ourform/schema";

const model: ComponentModel<number | null> = {
  ...number,
  logicSettable: ["label", "description", "validation.min", "validation.max"],
  properties: {
    hint: {
      kind: "string",
      label: "Hint",
      group: "Display",
      default: "base",
      logicSettable: true,
    },
    secret: {
      kind: "string",
      label: "Unmarked",
      group: "Display",
      default: "base",
    },
  },
};
const rule = (
  id: string,
  property: string,
  value: Expr,
  condition: Expr = true,
): LogicRule => ({
  id,
  trigger: { on: "change" },
  when: condition,
  then: [{ action: "setProperty", target: "n", property, value }],
});
const setup = (logic: LogicRule[]) => {
  const engine = createEngine({ logic: createLogic() })
    .register(text)
    .register(model);
  const definition = {
    ...form([
      field("source"),
      field("other"),
      field("n", {
        type: "number",
        label: "Original",
        validation: { min: 1, max: 9 },
      }),
    ]),
    logic,
  };
  const compiled = engine.compile(definition);
  if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
  return {
    engine,
    definition,
    form: compiled.form,
    session: engine.createSession(compiled.form),
  };
};

test("marked display/config contributions are immutable, session-local and revert to the base", () => {
  const {
    session: s,
    form,
    engine,
    definition,
  } = setup([
    rule("label", "label", "Changed", ["eq", { ref: "source" }, "yes"]),
    rule("hint", "properties.hint", "derived", [
      "eq",
      { ref: "source" },
      "yes",
    ]),
  ]);
  const bytes = JSON.stringify(definition),
    registered = engine.getField("number");
  const independent = engine.createSession(form);
  const patches: string[][] = [];
  s.subscribe((patch) => patches.push(patch.changedFields));
  s.setValue("source", "yes");
  expect(s.getFieldState("n").resolvedNode).toMatchObject({
    label: "Changed",
    properties: { hint: "derived" },
  });
  expect(Object.isFrozen(s.getFieldState("n").resolvedNode)).toBe(true);
  expect(patches.at(-1)).toContain("n");
  expect(JSON.stringify(definition)).toBe(bytes);
  expect(engine.getField("number")).toBe(registered);
  expect(form.byId.n!.node.label).toBe("Original");
  expect(independent.getFieldState("n").resolvedNode).toBeUndefined();
  s.setValue("source", "no");
  expect(s.getFieldState("n").resolvedNode).toBeUndefined();
  s.setValue("source", "yes");
  s.reset();
  expect(s.getFieldState("n").resolvedNode).toBeUndefined();
  s.dispose();
  independent.dispose();
});

test("property priority folds in wire order and reveals earlier contributions when later rules stop", () => {
  const { session: s } = setup([
    rule("first", "label", "First"),
    rule("later", "label", "Later", ["eq", { ref: "source" }, "yes"]),
  ]);
  expect(s.getFieldState("n").resolvedNode?.label).toBe("First");
  s.setValue("source", "yes");
  expect(s.getFieldState("n").resolvedNode?.label).toBe("Later");
  s.setValue("source", "no");
  expect(s.getFieldState("n").resolvedNode?.label).toBe("First");
  s.dispose();
});

test("resolved numeric constraints are enforced by browser and Node with the original schema intact", async () => {
  const { session: s, form } = setup([rule("min", "validation.min", 5)]);
  s.setValue("n", 3);
  expect((await s.submit()).ok).toBe(false);
  expect((await validateSubmission(form, s.getData())).valid).toBe(false);
  s.setValue("n", 6);
  expect((await s.submit()).ok).toBe(true);
  expect((await validateSubmission(form, s.getData())).valid).toBe(true);
  expect(form.byId.n!.node.validation!.min).toBe(1);
  s.dispose();
});

test("unrelated edits do not evaluate property expressions or reprocess their targets", () => {
  const { session: s } = setup([rule("hint", "hint", { ref: "source" })]);
  const before = { ...s.debug.logic! },
    runs = s.debug.processorRuns.n;
  s.setValue("other", "unrelated");
  expect(s.debug.logic!.conditions).toBe(before.conditions);
  expect(s.debug.logic!.actionExpressions).toBe(before.actionExpressions);
  expect(s.debug.processorRuns.n).toBe(runs);
  s.dispose();
});

test("invalid property results persist across unrelated edits and recover only when the writer recovers", async () => {
  const { session: s, form } = setup([
    rule("bound", "validation.min", [
      "if",
      ["eq", { ref: "source" }, "bad"],
      "invalid",
      2,
    ]),
  ]);
  s.setValue("source", "bad");
  s.setValue("other", "edited");
  const failed = await s.submit();
  expect(failed.ok).toBe(false);
  if (!failed.ok)
    expect(failed.errors.map((e) => e.error.code)).toContain(
      "invalid-logic-property",
    );
  expect((await validateSubmission(form, s.getData())).valid).toBe(false);
  s.setValue("source", "good");
  expect((await s.submit()).ok).toBe(true);
  s.dispose();
});

for (const property of [
  "id",
  "key",
  "type",
  "components",
  "layout.width",
  "validation.required",
  "properties.secret",
  "properties.__proto__",
  "constructor.prototype",
  "unknown",
])
  test(`unmarked/structural/unsafe property ${property} fails closed`, () => {
    const engine = createEngine({ logic: createLogic() })
      .register(text)
      .register(model);
    const compiled = engine.compile({
      ...form([field("n", { type: "number" })]),
      logic: [rule("bad", property, "no")],
    });
    expect(compiled.ok).toBe(false);
    expect(
      compiled.diagnostics.some(
        (d) => d.severity === "error" && d.message.includes(property),
      ),
    ).toBe(true);
  });

// These checks deliberately use the public submission-schema path, not the overlay implementation.
test("display-only rules retain static JSON Schema bounds; validation rules defer them", async () => {
  const { toSubmissionSchema } = await import("@ourform/schema");
  const display = setup([rule("caption", "label", "Changed")]);
  const numeric = setup([rule("minimum", "validation.min", 5)]);
  const displaySchema = JSON.stringify(toSubmissionSchema(display.form));
  const numericSchema = JSON.stringify(toSubmissionSchema(numeric.form));
  expect(displaySchema).toContain('"minimum":1');
  expect(displaySchema).toContain('"maximum":9');
  expect(numericSchema).toContain('"x-ourform-validation"');
  expect(displaySchema).not.toContain('"x-ourform-validation"');
  display.session.dispose();
  numeric.session.dispose();
});

test("canonical config and validation paths disambiguate aliases without granting structural writes", () => {
  const ambiguous: ComponentModel<number | null> = {
    ...model,
    logicSettable: [...model.logicSettable!, "properties.min"],
    properties: {
      min: { kind: "number", label: "Minimum", group: "Control", default: 0 },
    },
  };
  const e = createEngine({ logic: createLogic() }).register(ambiguous);
  const compile = (property: string) =>
    e.compile({
      ...form([field("n", { type: "number" })]),
      logic: [rule("minimum", property, 3)],
    });
  expect(compile("min").ok).toBe(false);
  for (const path of ["validation.min", "properties.min"]) {
    const result = compile(path);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("compile");
    const s = e.createSession(result.form);
    expect(s.getFieldState("n").resolvedNode).toMatchObject(
      path === "validation.min"
        ? { validation: { min: 3 } }
        : { properties: { min: 3 } },
    );
    s.dispose();
  }
});

test.each([
  ["validation.minLength", -1],
  ["validation.minLength", 1.5],
  ["validation.pattern", "["],
  ["labelKey", ""],
])(
  "invalid marked %s contribution reports a persistent diagnostic and restores base",
  async (property, value) => {
    const e = createEngine({ logic: createLogic() }).register({
      ...text,
      logicSettable: ["labelKey", "validation.minLength", "validation.pattern"],
    });
    const compiled = e.compile({
      ...form([field("n", { label: "Original" }), field("other")]),
      logic: [rule("invalid", property as string, value as Expr)],
    });
    if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
    const s = e.createSession(compiled.form);
    s.setValue("other", "changed");
    expect(s.getFieldState("n").resolvedNode).toBeUndefined();
    expect(s.debug.logic!.actionExpressions).toBe(1);
    expect((await s.validate()).errors.map((e) => e.error.code)).toContain(
      "invalid-logic-property",
    );
    s.dispose();
  },
);

test("invalid writers on one target recover independently and deactivation removes only their own errors", async () => {
  const { session: s } = setup([
    rule("min", "validation.min", [
      "if",
      ["eq", { ref: "source" }, "bad"],
      "invalid",
      2,
    ]),
    rule("max", "validation.max", "invalid", ["eq", { ref: "other" }, "bad"]),
  ]);
  s.setValue("source", "bad");
  s.setValue("other", "bad");
  expect(
    (await s.validate()).errors.filter(
      (e) => e.error.code === "invalid-logic-property",
    ),
  ).toHaveLength(2);
  s.setValue("source", "good");
  expect(
    (await s.validate()).errors.filter(
      (e) => e.error.code === "invalid-logic-property",
    ),
  ).toHaveLength(1);
  expect(s.getFieldState("n").resolvedNode?.validation?.min).toBe(2);
  s.setValue("other", "good");
  expect(
    (await s.validate()).errors.filter(
      (e) => e.error.code === "invalid-logic-property",
    ),
  ).toHaveLength(0);
  s.dispose();
});

test("display-only updates do not reprocess unchanged legacy value dependants", () => {
  const e = createEngine({ logic: createLogic() })
    .register(text)
    .register(model);
  const compiled = e.compile({
    ...form([
      field("source"),
      field("n", { type: "number", defaultValue: 2 }),
      field("dependent", { type: "number", calculate: { expr: { ref: "n" } } }),
    ]),
    logic: [rule("caption", "label", { ref: "source" })],
  });
  if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
  const s = e.createSession(compiled.form);
  const before = s.debug.processorRuns.dependent;
  s.setValue("source", "changed");
  expect(s.getFieldState("n").resolvedNode?.label).toBe("changed");
  expect(s.getValue("dependent")).toBe(2);
  expect(s.debug.processorRuns.dependent).toBe(before);
  s.dispose();
});

test("load and event property state is recomputed from final data by Node without replaying editable values", async () => {
  const e = createEngine({ logic: createLogic() })
    .register(text)
    .register(model);
  for (const trigger of [
    { on: "load" },
    { on: "event", name: "change-caption" },
  ] as const) {
    const definition = {
      ...form([
        field("source"),
        field("n", { type: "number", defaultValue: 3 }),
      ]),
      logic: [
        {
          ...rule("bound", "validation.min", [
            "if",
            ["eq", { ref: "source" }, "yes"],
            5,
            1,
          ]),
          trigger,
        },
      ],
    };
    const compiled = e.compile(definition);
    if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
    const s = e.createSession(compiled.form);
    s.setValue("source", "yes");
    if (trigger.on === "event") s.triggerLogicEvent(trigger.name);
    expect((await s.submit()).ok).toBe(false);
    expect((await validateSubmission(compiled.form, s.getData())).valid).toBe(
      false,
    );
    s.setValue("n", 6);
    expect((await s.submit()).ok).toBe(true);
    expect((await validateSubmission(compiled.form, s.getData())).valid).toBe(
      true,
    );
    s.dispose();
  }
});

test("trusted config results still reject unsafe JSON and wrong option shapes", async () => {
  for (const value of [
    JSON.parse('{"__proto__":{"polluted":true}}'),
    [{ value: 2, label: "Wrong" }],
    ["wrong"],
    undefined,
  ]) {
    const e = createEngine({
      logic: createLogic(),
      functions: {
        bad: { pure: true, availableInNode: true, run: () => value },
      },
    }).register({
      ...text,
      properties: {
        options: {
          kind: "options",
          label: "Options",
          group: "Options",
          default: [],
          logicSettable: true,
        },
      },
    });
    const compiled = e.compile({
      ...form([field("n")]),
      logic: [rule("unsafe", "options", ["call", "bad"])],
    });
    if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
    const s = e.createSession(compiled.form);
    expect((await s.submit()).ok).toBe(false);
    expect((await validateSubmission(compiled.form, s.getData())).valid).toBe(
      false,
    );
    expect(s.getFieldState("n").resolvedNode).toBeUndefined();
    expect(Object.hasOwn(Object.prototype, "polluted")).toBe(false);
    s.dispose();
  }
});

test("resolved config reaches custom validators and property changes abort stale async results", async () => {
  const jobs: {
    config: Readonly<Record<string, unknown>>;
    signal: AbortSignal;
    finish(value: { code: string; messageKey: string } | null): void;
  }[] = [];
  const e = createEngine({
    logic: createLogic(),
    validators: {
      check: {
        validate: (_value, ctx) =>
          new Promise((resolve) =>
            jobs.push({
              config: ctx.config,
              signal: ctx.signal,
              finish: resolve,
            }),
          ),
      },
    },
  })
    .register(text)
    .register({
      ...text,
      type: "dynamic",
      validators: ["check"],
      properties: {
        hint: {
          kind: "string",
          label: "Hint",
          group: "Display",
          default: "base",
          logicSettable: true,
        },
      },
    });
  const compiled = e.compile({
    ...form(
      [field("source"), field("n", { type: "dynamic", defaultValue: "value" })],
      { validateOn: "change" },
    ),
    logic: [rule("hint", "hint", { ref: "source" })],
  });
  if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
  const s = e.createSession(compiled.form);
  const prior = jobs.at(-1)!;
  s.setValue("source", "updated");
  const latest = jobs.at(-1)!;
  expect(prior.signal.aborted).toBe(true);
  expect(latest.config.hint).toBe("updated");
  expect(Object.isFrozen(latest.config)).toBe(true);
  latest.finish(null);
  for (const job of jobs.slice(0, -1))
    job.finish({ code: "stale", messageKey: "test.stale" });
  await new Promise((resolve) => setImmediate(resolve));
  expect(s.getFieldState("n")).toMatchObject({ pending: false, errors: [] });
  s.dispose();
});
