import { test, expect } from "vitest";
import Ajv2020 from "ajv/dist/2020.js";
import {
  validateDefinition,
  formDefinitionSchema,
  migrate,
  inspectJson,
  isRecord,
  isSafeKey,
} from "../src/index";
const field = { id: "name", key: "name", type: "text" };
const form = {
  $formVersion: "1.0",
  id: "form",
  display: "form",
  components: [field],
};
const registry = {
  get: (type: string) =>
    type === "text"
      ? {
          value: {},
          properties: {
            max: { kind: "number", min: 1, max: 10 },
            label: { kind: "string" },
            enabled: { kind: "boolean" },
          },
        }
      : type === "container"
        ? { dataScope: "object" as const }
        : type === "panel"
          ? { dataScope: "none" as const }
          : undefined,
};
test("meta-schema is valid Draft 2020-12 and agrees with structural runtime checks", () => {
  const validate = new Ajv2020({ strict: false }).compile(formDefinitionSchema);
  for (const input of [
    form,
    { ...form, display: "invalid" },
    { ...form, components: [{ ...field, validation: { required: "yes" } }] },
    { ...form, components: [{ ...field, layout: { width: 13 } }] },
    { ...form, components: [{ ...field, calculate: { expr: ["add", 1, 2] } }] },
    {
      ...form,
      components: [
        { ...field, meta: { free: "json" }, defaultValue: [null, 1] },
      ],
    },
    {
      ...form,
      settings: { validateOn: "change" },
      requires: [{ plugin: "p", version: "1" }],
    },
  ]) {
    expect(validate(input)).toBe(validateDefinition(input).length === 0);
  }
  expect(validate({ ...form, components: [{ ...field, unknown: true }] })).toBe(
    false,
  );
});
test("definition semantic diagnostics include stable component ids", () => {
  const cases: [unknown, string][] = [
    [
      { ...form, components: [field, { ...field, key: "other" }] },
      "duplicate-id",
    ],
    [
      { ...form, components: [field, { ...field, id: "other" }] },
      "duplicate-key",
    ],
    [{ ...form, components: [{ ...field, type: "missing" }] }, "unknown-type"],
    [{ ...form, components: [{ id: "name", type: "text" }] }, "missing-key"],
    [{ ...form, components: [{ ...field, id: "" }] }, "invalid-definition"],
    [{ ...form, components: [{ ...field, key: "1bad" }] }, "unsafe-key"],
    [
      { ...form, components: [{ ...field, validation: { pattern: "[" } }] },
      "invalid-pattern",
    ],
    [
      { ...form, components: [{ ...field, visibleWhen: { ref: "missing" } }] },
      "bad-ref",
    ],
    [
      { ...form, components: [{ ...field, properties: { max: 11 } }] },
      "invalid-property",
    ],
    [
      { ...form, components: [{ ...field, properties: { max: "bad" } }] },
      "invalid-property",
    ],
    [
      { ...form, components: [{ ...field, properties: { enabled: "bad" } }] },
      "invalid-property",
    ],
    [
      { ...form, components: [{ ...field, properties: { label: false } }] },
      "invalid-property",
    ],
    [
      { ...form, components: [{ ...field, properties: { unknown: 1 } }] },
      "invalid-property",
    ],
  ];
  for (const [input, code] of cases)
    expect(
      validateDefinition(input, registry).some((d) => d.code === code),
    ).toBe(true);
  expect(
    validateDefinition(
      {
        ...form,
        components: [
          { ...field, properties: { max: 5, enabled: true, label: "ok" } },
        ],
      },
      registry,
    ),
  ).toEqual([]);
  const nodes = [
    {
      id: "a",
      type: "container",
      key: "left",
      components: [{ ...field, id: "leftName" }],
    },
    {
      id: "b",
      type: "container",
      key: "right",
      components: [{ ...field, id: "rightName" }],
    },
  ];
  expect(validateDefinition({ ...form, components: nodes }, registry)).toEqual(
    [],
  );
  expect(
    validateDefinition(
      {
        ...form,
        components: [
          field,
          { id: "p", type: "panel", components: [{ ...field, id: "other" }] },
        ],
      },
      registry,
    ).some((d) => d.code === "duplicate-key"),
  ).toBe(true);
});
test("JSON safety and migration harness reject unsupported data without mutation", () => {
  expect(isRecord(null)).toBe(false);
  expect(isRecord([])).toBe(false);
  expect(isRecord(Object.create(null))).toBe(true);
  expect(isSafeKey("constructor")).toBe(false);
  for (const v of [undefined, () => {}, new Date(), NaN, Infinity, Symbol("x")])
    expect(inspectJson(v).length).toBeGreaterThan(0);
  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;
  expect(inspectJson(cyclic)[0]!.code).toBe("invalid-definition");
  const hostile = new Proxy(
    {},
    {
      ownKeys() {
        throw new Error("hostile");
      },
    },
  );
  expect(inspectJson(hostile)[0]!.code).toBe("invalid-definition");
  const result = migrate(form);
  expect(result.diagnostics).toEqual([]);
  expect(result.applied).toEqual([]);
  expect(result.definition).toEqual(form);
  expect(
    migrate({ ...form, $formVersion: "old" }).diagnostics.length,
  ).toBeGreaterThan(0);
});
test("standalone validation and migration defer unknown nested scopes until registry compilation", () => {
  const nested = {
    ...form,
    components: [
      {
        id: "left",
        type: "container",
        key: "left",
        components: [{ ...field, id: "leftName" }],
      },
      {
        id: "right",
        type: "container",
        key: "right",
        components: [{ ...field, id: "rightName" }],
      },
    ],
  };
  expect(validateDefinition(nested)).toEqual([]);
  expect(migrate(nested).diagnostics).toEqual([]);
  expect(Object.isFrozen(formDefinitionSchema)).toBe(true);
  expect(Object.isFrozen(formDefinitionSchema.$defs.component)).toBe(true);
});
