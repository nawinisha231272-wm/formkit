import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { createEngine, compileExpression, type StatePatch } from "../src/index";
import { createLogic } from "../src/logic/index";
import type { LogicRule } from "@ourform/schema";
import { field, form, text, number, panel } from "./helpers";

const make = () =>
  createEngine({ logic: createLogic() })
    .register(text)
    .register(number)
    .register(panel);
function session(
  rules: LogicRule[],
  nodes = [field("source"), field("target"), field("other")],
) {
  const e = make();
  const compiled = e.compile({
    ...form(nodes, { validateOn: "change" }),
    logic: rules,
  });
  expect(compiled.ok, JSON.stringify(compiled.diagnostics)).toBe(true);
  if (!compiled.ok) throw new Error("Expected valid root logic.");
  return { e, compiled, s: e.createSession(compiled.form) };
}
const conditional: LogicRule = {
  id: "rule",
  trigger: { on: "change" },
  when: ["eq", { ref: "source" }, "yes"],
  then: [
    { action: "require", target: "target" },
    { action: "setValue", target: "target", value: "seed" },
  ],
};

test("opt-in registration is isolated, fails closed, rejects duplicates and supports explicit engine installation", () => {
  const reg = createLogic();
  const a = createEngine({ logic: reg }).register(text),
    b = createEngine().register(text);
  const definition = { ...form([field()]), logic: [] };
  expect(a.compile(definition).ok).toBe(true);
  expect(b.compile(definition).diagnostics.map((d) => d.code)).toEqual([
    "missing-logic",
  ]);
  expect(() => a.registerLogic(reg)).toThrow("Duplicate logic");
  expect(b.registerLogic(createLogic())).toBe(b);
  expect(b.compile(definition).ok).toBe(true);
  expect(() =>
    createEngine().registerLogic({ compile: null } as never),
  ).toThrow(TypeError);
});

test("state is derived at load while value assignments fire only on the matching edge, with one patch", async () => {
  const { s } = session([conditional]);
  expect(s.getFieldState("target").required).toBe(false);
  const patches: StatePatch[] = [];
  s.subscribe((patch) => patches.push(patch));
  s.setValue("source", "yes", { source: "user" });
  expect(patches).toHaveLength(1);
  expect(new Set(patches[0]!.changedFields)).toEqual(
    new Set(["source", "target"]),
  );
  expect(s.getValue("target")).toBe("seed");
  expect(s.getFieldState("target").required).toBe(true);
  expect(s.getFieldState("target").logic).toEqual({
    ruleId: "rule",
    authoritative: false,
  });
  s.setValue("other", "unrelated");
  expect(s.getValue("target")).toBe("seed");
  s.setValue("source", "no");
  expect(s.getFieldState("target").required).toBe(false);
  expect(s.getValue("target")).toBe("");
  expect((await s.validate()).valid).toBe(true);
  s.dispose();
});

test("later user/API edits survive otherwise revert and reset creates independent runtime state", () => {
  for (const source of ["user", "api"] as const) {
    const { s, e, compiled } = session([conditional]);
    s.setValue("source", "yes");
    s.setValue("target", "chosen", { source });
    s.setValue("source", "no");
    expect(s.getValue("target")).toBe("chosen");
    expect(s.getFieldState("target").logic).toBeUndefined();
    const second = e.createSession(compiled.form);
    expect(second.getValue("target")).toBe("");
    s.reset();
    expect(s.getValue("target")).toBe("");
    expect(s.getFieldState("target").required).toBe(false);
    second.dispose();
    s.dispose();
  }
});

test("later matching state writers win; conflicts warn without rejecting and otherwise lists restore priority", async () => {
  const first: LogicRule = {
    ...conditional,
    then: [{ action: "require", target: "target" }],
  };
  const second: LogicRule = {
    id: "second",
    trigger: { on: "load" },
    when: ["eq", { ref: "other" }, "override"],
    then: [{ action: "optional", target: "target" }],
    otherwise: [{ action: "setReadOnly", target: "target", value: true }],
  };
  const { s, compiled } = session([first, second]);
  expect(compiled.diagnostics.some((d) => d.code === "logic-conflict")).toBe(
    true,
  );
  expect(s.getFieldState("target").readOnly).toBe(true);
  s.setValue("source", "yes");
  expect(s.getFieldState("target").required).toBe(true);
  expect((await s.validate()).valid).toBe(false);
  s.setValue("other", "override");
  expect(s.getFieldState("target").required).toBe(false);
  expect(s.getFieldState("target").readOnly).toBe(false);
  s.dispose();
});

test("root show/enable cannot bypass parent visibility or static protection", () => {
  const nodes = [
    field("source"),
    {
      id: "group",
      type: "panel",
      disabled: true,
      readOnly: true,
      components: [field("target", { visibleWhen: false })],
    },
  ];
  const { s } = session(
    [
      {
        id: "state",
        trigger: { on: "load" },
        then: [
          { action: "show", target: "target" },
          { action: "enable", target: "target" },
          { action: "setReadOnly", target: "target", value: false },
        ],
      },
    ],
    nodes,
  );
  expect(s.getFieldState("target")).toMatchObject({
    visible: true,
    disabled: true,
    readOnly: true,
  });
  s.setValue("target", "blocked", { source: "user" });
  expect(s.getValue("target")).toBe("");
  s.setValue("target", "API");
  expect(s.getValue("target")).toBe("API");
  s.dispose();
});

test("continuous calculations cascade through legacy calculations, restore attempted overrides and remain empty while hidden", () => {
  const nodes = [
    field("source", { type: "number", defaultValue: 2 }),
    field("target", { type: "number" }),
    field("other", {
      type: "number",
      calculate: { expr: ["add", { ref: "target" }, 1] },
    }),
  ];
  const rule: LogicRule = {
    id: "calc",
    trigger: { on: "change" },
    then: [
      {
        action: "calculate",
        target: "target",
        expr: ["mul", { ref: "source" }, 3],
      },
    ],
  };
  const { s } = session([rule], nodes);
  expect(s.getData()).toEqual({ source: 2, target: 6, other: 7 });
  expect(s.getFieldState("target").dirty).toBe(false);
  s.setValue("source", 4);
  expect(s.getValue("other")).toBe(13);
  s.setValue("target", 100, { source: "user" });
  expect(s.getValue("target")).toBe(12);
  expect(s.getFieldState("target").logic?.authoritative).toBe(true);
  s.dispose();
  const hidden = session(
    [rule],
    nodes.map((node) =>
      node.id === "target" ? { ...node, visibleWhen: false } : node,
    ),
  ).s;
  expect(hidden.getValue("target")).toBeNull();
  expect(hidden.debug.logic!.cascades).toBeLessThan(10);
  hidden.dispose();
});

test("load/submit/event assignments fire in their phases and unrelated named events evaluate no rules", async () => {
  const { s } = session([
    {
      id: "load",
      trigger: { on: "load" },
      then: [{ action: "setValue", target: "target", value: "loaded" }],
    },
    {
      id: "submit",
      trigger: { on: "submit" },
      then: [{ action: "setValue", target: "target", value: "submitted" }],
    },
    {
      id: "event",
      trigger: { on: "event", name: "lookup" },
      when: ["eq", { ref: "source" }, "yes"],
      then: [{ action: "setValue", target: "other", value: "found" }],
    },
  ]);
  expect(s.getValue("target")).toBe("loaded");
  s.setValue("source", "yes");
  expect(s.getValue("other")).toBe("");
  const before = s.debug.logic!.candidates;
  s.triggerLogicEvent("unrelated");
  expect(s.debug.logic!.candidates).toBe(before);
  s.triggerLogicEvent("lookup", { safe: true });
  expect(s.getValue("other")).toBe("found");
  expect(await s.submit()).toEqual({
    ok: true,
    data: { source: "yes", target: "submitted", other: "found" },
  });
  expect(s.getFieldState("target").logic).toEqual({
    ruleId: "submit",
    authoritative: true,
  });
  expect(() => s.triggerLogicEvent("")).toThrow(TypeError);
  s.dispose();
  expect(() => s.triggerLogicEvent("lookup")).toThrow("disposed");
});

test("cycles name rule and component ids; bad refs, duplicate ids and unfinished actions fail explicitly", () => {
  const e = make();
  for (const [rules, code] of [
    [
      [
        {
          id: "a",
          trigger: { on: "change", refs: ["source"] },
          then: [{ action: "setValue", target: "target", value: "A" }],
        },
        {
          id: "b",
          trigger: { on: "change", refs: ["target"] },
          then: [{ action: "setValue", target: "source", value: "B" }],
        },
      ],
      "cycle",
    ],
    [[{ ...conditional, when: { ref: "missing" } }], "bad-ref"],
    [[conditional, conditional], "duplicate-rule-id"],
    [
      [
        {
          id: "pending",
          trigger: { on: "load" },
          then: [{ action: "call", function: "host", args: [] }],
        },
      ],
      "unsupported-logic-action",
    ],
  ] as const) {
    const compiled = e.compile({
      ...form([field("source"), field("target")]),
      logic: rules,
    });
    expect(compiled.ok).toBe(false);
    expect(compiled.diagnostics.some((d) => d.code === code)).toBe(true);
    if (code === "cycle")
      expect(compiled.diagnostics.map((d) => d.message).join()).toMatch(
        /source.*target.*rules: a, b/,
      );
  }
});

test("owner-corrected membership is ordinary OR-of-eq, not a new literal-list expression", () => {
  const context = { byRef: (id: string) => [id], byPath: () => undefined };
  const corrected = compileExpression(
    ["or", ["eq", { ref: "country" }, "US"], ["eq", { ref: "country" }, "CA"]],
    context,
  );
  expect(corrected.diagnostics).toEqual([]);
  for (const [country, expected] of [
    ["US", true],
    ["CA", true],
    ["GB", false],
  ] as const)
    expect(
      corrected.expression!.evaluate({
        getRef: () => country,
        getPath: () => undefined,
        mode: "edit",
      }),
    ).toBe(expected);
  expect(
    compileExpression(["in", { ref: "country" }, ["US", "CA"]], context)
      .diagnostics[0]?.code,
  ).toBe("invalid-expression");
});

test("cascade overflow is a runtime diagnostic and validates as an error without replacing the transaction", async () => {
  const components = Array.from({ length: 13 }, (_, i) => field(`n${i}`));
  const rules: LogicRule[] = components.slice(0, -1).map((node, i) => ({
    id: `chain${i}`,
    trigger: { on: "change", refs: [node.id] },
    when: ["eq", { ref: node.id }, "yes"],
    then: [{ action: "setValue", target: `n${i + 1}`, value: "yes" }],
  }));
  const { s } = session(rules, components);
  const patches: StatePatch[] = [];
  s.subscribe((patch) => patches.push(patch));
  s.setValue("n0", "yes");
  expect(patches).toHaveLength(1);
  expect(patches[0]!.diagnostics?.[0]?.code).toBe("logic-cascade-limit");
  expect(s.getValue("n10")).toBe("yes");
  expect(s.getValue("n11")).toBe("");
  expect((await s.validate()).valid).toBe(false);
  s.reset();
  expect((await s.validate()).valid).toBe(true);
  s.dispose();
});

test("failed load initialization is diagnosed and submit cannot discard that error", async () => {
  const e = createEngine({ logic: createLogic() }).register({
    ...text,
    value: {
      ...text.value!,
      normalize: (value: unknown) => {
        if (typeof value !== "string") throw new Error("Expected text");
        return value;
      },
    },
  });
  const compiled = e.compile({
    ...form([field()]),
    logic: [
      {
        id: "bad",
        trigger: { on: "load" },
        then: [{ action: "setValue", target: "name", value: 42 }],
      },
    ],
  });
  if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
  const s = e.createSession(compiled.form);
  const result = await s.submit();
  expect(result.ok).toBe(false);
  if (!result.ok)
    expect(
      result.errors.some((e) => e.error.code === "invalid-logic-value"),
    ).toBe(true);
  expect(s.getValue("name")).toBe("");
  s.dispose();
});

test("disabled rules, otherwise none and false-branch edge assignments preserve explicit behavior", () => {
  const { s } = session([
    { ...conditional, id: "disabled", enabled: false },
    {
      id: "none",
      trigger: { on: "change" },
      when: ["eq", { ref: "source" }, "yes"],
      then: [{ action: "setValue", target: "target", value: "kept" }],
      otherwise: "none",
    },
    {
      id: "other",
      trigger: { on: "event", name: "choose" },
      when: false,
      then: [],
      otherwise: [{ action: "clear", target: "target" }],
    },
  ]);
  s.setValue("source", "yes");
  expect(s.getFieldState("target").required).toBe(false);
  expect(s.getValue("target")).toBe("kept");
  s.setValue("source", "no");
  expect(s.getValue("target")).toBe("kept");
  s.triggerLogicEvent("choose");
  expect(s.getValue("target")).toBe("");
  s.dispose();
});

test("an incomplete registration and non-value action targets fail closed", () => {
  const invalid = createEngine({
    logic: { compile: () => ({ diagnostics: [] }) },
  }).register(text);
  expect(
    invalid.compile({ ...form([field()]), logic: [] }).diagnostics[0]?.code,
  ).toBe("invalid-logic-registration");
  const e = make();
  for (const action of ["require", "setValue"] as const) {
    const compiled = e.compile({
      ...form([{ id: "panel", type: "panel" }]),
      logic: [
        {
          id: "bad",
          trigger: { on: "load" },
          then: [
            {
              action,
              target: "panel",
              ...(action === "setValue" ? { value: "x" } : {}),
            },
          ],
        },
      ],
    });
    expect(compiled.ok).toBe(false);
    expect(
      compiled.diagnostics.some((d) => d.code === "invalid-logic-target"),
    ).toBe(true);
  }
});

test("trusted class registrations retain their compiler receiver and cannot lose the hook through spreading", () => {
  class Registration {
    calls = 0;
    compile(context: Parameters<ReturnType<typeof createLogic>["compile"]>[0]) {
      this.calls++;
      return createLogic().compile(context);
    }
  }
  const registration = new Registration();
  const e = createEngine({ logic: registration }).register(text);
  expect(e.compile({ ...form([field()]), logic: [] }).ok).toBe(true);
  expect(registration.calls).toBe(1);
});

test("clear-on-hide feedback cycles are diagnosed and interleaved rules use settled legacy calculations", () => {
  const e = make();
  const hidden = e.compile({
    ...form([field("source")]),
    logic: [
      {
        id: "hide",
        trigger: { on: "change" },
        when: ["eq", { ref: "source" }, "yes"],
        then: [{ action: "hide", target: "source" }],
      },
    ],
  });
  expect(hidden.ok).toBe(false);
  expect(
    hidden.diagnostics.some(
      (d) => d.code === "cycle" && d.message.includes("hide"),
    ),
  ).toBe(true);
  const interleaved = e.compile(
    JSON.parse(
      readFileSync(
        new URL(
          "../../../fixtures/forms/logic/interleaved.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ),
  );
  expect(interleaved.ok, JSON.stringify(interleaved.diagnostics)).toBe(true);
  if (!interleaved.ok)
    throw new Error("Expected interleaved rules to compile.");
  for (const reverse of [false, true]) {
    const input = interleaved.form.definition;
    const compiled = reverse
      ? e.compile({ ...input, logic: [...input.logic!].reverse() })
      : interleaved;
    if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
    const session = e.createSession(compiled.form);
    const patches: StatePatch[] = [];
    session.subscribe((patch) => patches.push(patch));
    session.setValue("source", "go", { source: "user" });
    expect(session.getData()).toEqual({
      source: "go",
      bridge: 4,
      derived: 8,
      target: "ready",
    });
    expect(patches).toHaveLength(1);
    expect(new Set(patches[0]!.changedFields)).toEqual(
      new Set(["source", "bridge", "derived", "target"]),
    );
    expect(session.getFieldState("target").logic).toEqual({
      ruleId: "second",
      authoritative: false,
    });
    session.dispose();
  }
});
