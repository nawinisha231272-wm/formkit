import { expect, test } from "vitest";
import Ajv2020 from "ajv/dist/2020.js";
import {
  formDefinitionSchema,
  validateDefinition,
  migrate,
  type FormDefinition,
  type LogicAction,
} from "../src/index";

const actions: LogicAction[] = [
  ...(
    [
      "show",
      "hide",
      "enable",
      "disable",
      "require",
      "optional",
      "clear",
      "refreshOptions",
      "focus",
    ] as const
  ).map((action) => ({ action, target: "answer" })),
  { action: "setReadOnly", target: "answer", value: true },
  {
    action: "setProperty",
    target: "answer",
    property: "label",
    value: "Answer",
  },
  { action: "setValue", target: "answer", value: ["add", 1, 2] },
  { action: "calculate", target: "answer", expr: { ref: "answer" } },
  { action: "emit", name: "completed", payload: { ref: "answer" } },
  { action: "call", function: "lookup", args: [{ ref: "answer" }] },
];
const form: FormDefinition = {
  $formVersion: "1.0",
  id: "logic",
  display: "form",
  components: [{ id: "answer", key: "answer", type: "text" }],
};
const rule = { id: "rule", trigger: { on: "change" as const }, then: actions };
const validate = new Ajv2020({ strict: false }).compile(formDefinitionSchema);

test("root logic meta-schema and structural validation agree for all triggers and actions", () => {
  for (const trigger of [
    { on: "change" },
    { on: "change", refs: ["answer"] },
    { on: "load" },
    { on: "submit" },
    { on: "event", name: "lookup" },
  ])
    for (const otherwise of [undefined, "revert", "none", actions]) {
      const input = {
        ...form,
        logic: [
          {
            ...rule,
            trigger,
            when: ["eq", { ref: "answer" }, "yes"],
            ...(otherwise === undefined ? {} : { otherwise }),
          },
        ],
      };
      expect(validate(input), JSON.stringify(validate.errors)).toBe(true);
      expect(validateDefinition(input)).toEqual([]);
    }
  expect(validate({ ...form, logic: [] })).toBe(true);
});

test("root logic rejects malformed actions, triggers, expressions and executable/prototype data", () => {
  for (const bad of [
    { ...rule, id: "" },
    { ...rule, enabled: "yes" },
    { ...rule, trigger: { on: "event" } },
    { ...rule, trigger: { on: "load", refs: ["answer"] } },
    { ...rule, trigger: { on: "click" } },
    { ...rule, when: ["eval", "code"] },
    { ...rule, otherwise: "ignore" },
    ...[
      { action: "show" },
      { action: "javascript", target: "answer" },
      { action: "setReadOnly", target: "answer", value: "true" },
      { action: "setProperty", target: "answer", value: 2 },
      { action: "calculate", target: "answer" },
      { action: "call", function: "lookup", args: {} },
      { action: "emit", name: "" },
      { action: "show", target: "answer", code: "untrusted" },
    ].map((action) => ({ ...rule, then: [action] })),
  ]) {
    const input = { ...form, logic: [bad] };
    expect(validate(input), JSON.stringify(bad)).toBe(false);
    expect(validateDefinition(input).map((d) => d.code)).toContain(
      "invalid-definition",
    );
  }
  for (const unsafe of [() => 1, JSON.parse('{"__proto__":{}}')])
    expect(
      validateDefinition({ ...form, logic: [{ ...rule, when: unsafe }] })
        .length,
    ).toBeGreaterThan(0);
});

test("logic migration is immutable/idempotent and never adds logic to legacy forms", () => {
  const input = { ...form, logic: [{ ...rule, otherwise: "revert" as const }] };
  const before = JSON.stringify(input);
  const first = migrate(input);
  expect(first.diagnostics).toEqual([]);
  expect(first.definition.logic).toEqual(input.logic);
  expect(JSON.stringify(input)).toBe(before);
  expect(migrate(first.definition)).toEqual(first);
  expect(Object.hasOwn(migrate(form).definition, "logic")).toBe(false);
});
