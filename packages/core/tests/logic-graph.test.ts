import { expect, test } from "vitest";
import { createEngine } from "../src/index";
import { createLogic } from "../src/logic/index";
import type { LogicRule } from "@ourform/schema";
import { field, form, text, container } from "./helpers";

function compile(logic: LogicRule[]) {
  const engine = createEngine({ logic: createLogic() }).register({
    ...text,
    logicSettable: ["label"],
  });
  const result = engine.compile({
    ...form(
      ["condition", "value", "fallback", "trigger", "target"].map((id) =>
        field(id),
      ),
    ),
    logic,
  });
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  return { engine, form: result.form };
}
test("compiled rule reads include conditions, action/otherwise expressions and explicit triggers, even for disabled rules", () => {
  const rule: LogicRule = {
    id: "caption",
    trigger: { on: "change", refs: ["trigger"] },
    when: ["eq", { ref: "condition" }, "yes"],
    then: [
      {
        action: "setProperty",
        target: "target",
        property: "label",
        value: ["concat", { ref: "condition" }, { ref: "value" }],
      },
    ],
    otherwise: [
      {
        action: "setProperty",
        target: "target",
        property: "label",
        value: { ref: "fallback" },
      },
    ],
  };
  const { form: compiled } = compile([
    rule,
    { ...rule, id: "disabled", enabled: false },
  ]);
  expect(compiled.logic?.ruleReads).toEqual({
    caption: ["condition", "value", "fallback", "trigger"],
    disabled: ["condition", "value", "fallback", "trigger"],
  });
  expect(compiled.logic?.edges).toEqual([]);
  rule.trigger = { on: "load" };
  expect(compiled.logic?.ruleReads?.caption).toEqual([
    "condition",
    "value",
    "fallback",
    "trigger",
  ]);
});
test("self-reading state links are visible to authoring but do not become data cycles", () => {
  const { form: compiled } = compile([
    {
      id: "self",
      trigger: { on: "change" },
      when: ["eq", { ref: "target" }, "yes"],
      then: [{ action: "require", target: "target" }],
    },
  ]);
  expect(compiled.logic?.ruleReads?.self).toEqual(["target"]);
  expect(compiled.logic?.edges).toEqual([]);
});
test("compiled logic graph and read summaries are immutable across sessions and replay", () => {
  const { engine, form: compiled } = compile([
    {
      id: "copy",
      trigger: { on: "change", refs: ["condition"] },
      then: [{ action: "setValue", target: "target", value: { ref: "value" } }],
    },
  ]);
  const logic = compiled.logic!;
  expect(Object.isFrozen(logic.edges)).toBe(true);
  expect(Object.isFrozen(logic.edges[0])).toBe(true);
  expect(Object.isFrozen(logic.dependents)).toBe(true);
  expect(Object.isFrozen(logic.dependents.condition)).toBe(true);
  expect(Object.isFrozen(logic.ruleReads)).toBe(true);
  expect(Object.isFrozen(logic.ruleReads?.copy)).toBe(true);
  expect(() => (logic.edges as unknown[]).push({})).toThrow(TypeError);
  expect(() => (logic.ruleReads!.copy as string[]).push("fallback")).toThrow(
    TypeError,
  );
  const replay = logic.replay();
  expect(replay.ruleReads).toBe(logic.ruleReads);
  const a = engine.createSession(compiled),
    b = engine.createSession(compiled);
  a.setValue("value", "A");
  a.setValue("condition", "go");
  expect(a.getValue("target")).toBe("A");
  expect(b.getValue("target")).toBe("");
  a.dispose();
  b.dispose();
});
test("object-scope references retain the compiler's expanded leaf dependencies", () => {
  const engine = createEngine({ logic: createLogic() })
    .register(text)
    .register(container);
  const result = engine.compile({
    ...form([
      {
        id: "customer",
        type: "container",
        key: "customer",
        components: [field("name"), field("phone")],
      },
      field("target"),
    ]),
    logic: [
      {
        id: "object",
        trigger: { on: "change", refs: ["customer"] },
        then: [{ action: "require", target: "target" }],
      },
    ],
  });
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  expect(result.form.logic?.ruleReads?.object).toEqual(["name", "phone"]);
});
