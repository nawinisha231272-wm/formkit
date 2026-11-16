import { expect, test } from "vitest";
import { createEngine } from "@ourform/core";
import { createLogic } from "@ourform/core/logic";
import { builtinComponents } from "@ourform/components";
import type { ComponentNode, LogicAction, LogicRule } from "@ourform/schema";
import { controlledFields, visibilityCondition } from "../src/signals";

import { readFileSync } from "node:fs";
import type { FormDefinition } from "@ourform/schema";
const fixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../fixtures/forms/logic/build-signals.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as FormDefinition;
const components: ComponentNode[] = fixture.components;
function compile(
  actions: LogicAction[],
  extras: LogicRule[] = [],
  nodes = components,
) {
  const engine = createEngine({ logic: createLogic() });
  for (const component of builtinComponents) engine.register(component.model);
  const result = engine.compile({
    $formVersion: "1.0",
    id: "signals",
    display: "form",
    components: nodes,
    logic: [
      {
        id: "business",
        trigger: { on: "change", refs: ["source"] },
        when: ["eq", { ref: "source" }, "business"],
        then: actions,
      },
      ...extras,
    ],
  });
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  return { engine, form: result.form };
}
test("Build counts compiled root value/state influence with unique inherited field targets", () => {
  const { form } = compile([
    { action: "show", target: "panel" },
    { action: "require", target: "a" },
    { action: "setValue", target: "invoice", value: "company" },
  ]);
  expect(controlledFields(form, "source")).toBe(3);
  expect(controlledFields(form, "source")).toBe(3);
  expect(controlledFields(form, "invoice")).toBe(0);
});
test("caption-only layout links never count its descendants as controlled fields", () => {
  const { form } = compile([
    {
      action: "setProperty",
      target: "panel",
      property: "label",
      value: "Business",
    },
  ]);
  expect(controlledFields(form, "source")).toBe(0);
});
test("caption-only field links do not count unchanged legacy value dependants", () => {
  const nodes = structuredClone(components);
  nodes[1]!.components![1]!.calculate = { expr: { ref: "a" } };
  const { form } = compile(
    [
      {
        action: "setProperty",
        target: "a",
        property: "label",
        value: "Business",
      },
    ],
    [],
    nodes,
  );
  expect(controlledFields(form, "source")).toBe(1);
});
test("root value links continue through legacy value dependants", () => {
  const nodes = structuredClone(components);
  nodes[1]!.components![1]!.calculate = { expr: { ref: "a" } };
  const { form } = compile(
    [{ action: "setValue", target: "a", value: { ref: "source" } }],
    [],
    nodes,
  );
  expect(controlledFields(form, "source")).toBe(2);
});
test("disabled rules are inspected in compiled reads but omitted from active Build influence", () => {
  const disabled: LogicRule = {
    id: "off",
    enabled: false,
    trigger: { on: "change", refs: ["source"] },
    then: [{ action: "require", target: "invoice" }],
  };
  const { form } = compile([{ action: "require", target: "a" }], [disabled]);
  expect(form.logic?.ruleReads?.off).toEqual(["source"]);
  expect(controlledFields(form, "source")).toBe(1);
});
test("self-reading state is a control relation without a data cycle", () => {
  const { form } = compile(
    [],
    [
      {
        id: "self",
        trigger: { on: "change" },
        when: ["eq", { ref: "invoice" }, "yes"],
        then: [{ action: "require", target: "invoice" }],
      },
    ],
  );
  expect(controlledFields(form, "invoice")).toBe(1);
});
test("legacy transitive dependencies remain counted without opting into root logic", () => {
  const engine = createEngine();
  for (const component of builtinComponents) engine.register(component.model);
  const result = engine.compile({
    $formVersion: "1.0",
    id: "legacy",
    display: "form",
    components: [
      { id: "a", type: "number", key: "a" },
      { id: "b", type: "number", key: "b", calculate: { expr: { ref: "a" } } },
      { id: "c", type: "number", key: "c", calculate: { expr: { ref: "b" } } },
    ],
  });
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  expect(controlledFields(result.form, "a")).toBe(2);
});

test("root visibility chips follow legacy fallback, root priority and inherited state", () => {
  const { form } = compile([{ action: "show", target: "panel" }]);
  const business = ["eq", { ref: "source" }, "business"];
  expect(visibilityCondition(form, "panel")).toEqual(business);
  expect(visibilityCondition(form, "a")).toEqual(business);
  expect(visibilityCondition(form, "a")).toBe(visibilityCondition(form, "a"));
  const override = compile(
    [{ action: "show", target: "panel" }],
    [
      {
        id: "hide",
        trigger: { on: "change" },
        when: ["eq", { ref: "source" }, "hidden"],
        then: [{ action: "hide", target: "panel" }],
      },
    ],
  ).form;
  expect(visibilityCondition(override, "panel")).toEqual([
    "if",
    ["eq", { ref: "source" }, "hidden"],
    false,
    business,
  ]);
});
test("explicit otherwise visibility is represented and disabled root visibility is ignored", () => {
  const { form } = compile(
    [],
    [
      {
        id: "otherwise",
        trigger: { on: "change" },
        when: ["eq", { ref: "source" }, "yes"],
        then: [{ action: "hide", target: "invoice" }],
        otherwise: [{ action: "show", target: "invoice" }],
      },
    ],
  );
  expect(visibilityCondition(form, "invoice")).toEqual([
    "not",
    ["eq", { ref: "source" }, "yes"],
  ]);
  const disabled = compile(
    [],
    [
      {
        id: "off",
        enabled: false,
        trigger: { on: "load" },
        then: [{ action: "show", target: "panel" }],
      },
    ],
  ).form;
  expect(visibilityCondition(disabled, "panel")).toBe(false);
  expect(visibilityCondition(disabled, "a")).toBeUndefined();
});
