import { test, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import { createEngine } from "@ourform/core";
import { builtinFields } from "@ourform/components";
import {
  compileForm,
  validateSubmission,
  toSubmissionSchema,
} from "../src/index";
import { stringValue, numberValue } from "@ourform/sdk";
import type { FormDefinition } from "@ourform/schema";
const load = (file: string): unknown =>
  JSON.parse(
    readFileSync(
      new URL(`../../../fixtures/forms/${file}`, import.meta.url),
      "utf8",
    ),
  );
const engine = () => {
  const e = createEngine();
  for (const f of builtinFields) e.register(f.model);
  return e
    .register({
      type: "container",
      title: "Container",
      dataScope: "object",
      kind: "layout",
    })
    .register({
      type: "panel",
      title: "Panel",
      dataScope: "none",
      kind: "layout",
    });
};
const def = (components: FormDefinition["components"]): FormDefinition => ({
  $formVersion: "1.0",
  id: "test",
  display: "form",
  components,
});
const ajv = new Ajv2020({
  strictSchema: false,
  strictTypes: false,
  allErrors: true,
});
test("every legacy fixture compiles/diagnoses consistently; canonical data yields identical session/submission results", async () => {
  for (const file of readdirSync(
    new URL("../../../fixtures/forms", import.meta.url),
  ).filter((f) => f.endsWith(".json"))) {
    const e = engine();
    const result = compileForm(e, load(file));
    expect(result.ok, file).toBe(!file.includes(".invalid"));
    if (!result.ok) continue;
    const s = e.createSession(result.form);
    expect(await validateSubmission(result.form, s.getData()), file).toEqual(
      await s.validate(),
    );
    const schema = toSubmissionSchema(result.form);
    expect(schema.$schema).toContain("2020-12");
    const validate = ajv.compile(schema);
    // Runtime conditions are explicit annotations, so static Ajv cannot assert their validation.
    if ((await s.validate()).valid)
      expect(
        validate(s.getData()),
        `${file}: ${JSON.stringify(validate.errors)}`,
      ).toBe(true);
    s.dispose();
  }
});
test("Tier 1 generated schema accepts all good samples and rejects every bad sample in Ajv and runtime", async () => {
  const e = engine();
  const compiled = compileForm(e, load("tier1/registration.json"));
  expect(compiled.ok).toBe(true);
  if (!compiled.ok) return;
  const schema = toSubmissionSchema(compiled.form);
  const validate = ajv.compile(schema);
  expect(validate(load("tier1/registration.data.json"))).toBe(true);
  expect(
    (
      await validateSubmission(
        compiled.form,
        load("tier1/registration.data.json"),
      )
    ).valid,
  ).toBe(true);
  for (const data of load("tier1/registration.invalid.json") as unknown[]) {
    expect(validate(data)).toBe(false);
    expect((await validateSubmission(compiled.form, data)).valid).toBe(false);
  }
});
test("email schema retains both built-in syntax and explicit host patterns", async () => {
  const r = engine().compile(
    def([
      {
        id: "email",
        type: "email",
        key: "email",
        validation: { required: true, pattern: "@example\\.com$" },
      },
    ]),
  );
  if (!r.ok) throw new Error("compile");
  const validate = ajv.compile(toSubmissionSchema(r.form));
  for (const [email, valid] of [
    ["ana@example.com", true],
    ["ana@other.com", false],
    ["@example.com", false],
  ] as const) {
    expect(validate({ email })).toBe(valid);
    expect((await validateSubmission(r.form, { email })).valid).toBe(valid);
  }
});
test("canonical submission boundary rejects unsafe/non-object data, unknown fields, wrong object scopes and coercions", async () => {
  const e = engine();
  const r = e.compile(
    def([
      {
        id: "container",
        type: "container",
        key: "nested",
        components: [{ id: "n", type: "number", key: "n" }],
      },
      { id: "t", type: "text", key: "t" },
    ]),
  );
  if (!r.ok) throw new Error("compile");
  for (const data of [
    null,
    [],
    "text",
    { t: undefined },
    { extra: true },
    { nested: "bad" },
    { nested: { extra: 1 } },
    { nested: { n: "12" } },
    { t: {} },
    JSON.parse('{"__proto__":{"polluted":true}}'),
  ])
    expect((await validateSubmission(r.form, data)).valid).toBe(false);
  expect(
    (await validateSubmission(r.form, { nested: { n: 12 }, t: "ok" })).valid,
  ).toBe(true);
});
test("missing required defaults and forged calculations fail; conditional/custom rules are retained as annotations", async () => {
  const e = engine();
  const r = e.compile(
    def([
      {
        id: "a",
        type: "number",
        key: "a",
        defaultValue: 2,
        validation: { required: true },
      },
      {
        id: "b",
        type: "number",
        key: "b",
        calculate: { expr: ["mul", { ref: "a" }, 2] },
      },
      {
        id: "c",
        type: "text",
        key: "c",
        visibleWhen: ["gt", { ref: "a" }, 4],
        validation: { required: true },
        disabledWhen: false,
      },
    ]),
  );
  if (!r.ok) throw new Error("compile");
  expect(await validateSubmission(r.form, {})).toMatchObject({
    valid: false,
    errors: [{ componentId: "a", error: { code: "required" } }],
  });
  expect(await validateSubmission(r.form, { a: 2, b: 9 })).toMatchObject({
    valid: false,
    errors: [{ error: { code: "calculated" } }],
  });
  expect((await validateSubmission(r.form, { a: 2, b: 4, c: "" })).valid).toBe(
    true,
  );
  const schema = toSubmissionSchema(r.form);
  expect(JSON.stringify(schema)).toContain("x-ourform-visibility");
  expect(JSON.stringify(schema)).toContain("x-ourform-calculate");
  expect(JSON.stringify(schema)).toContain("x-ourform-disabledWhen");
});
test("customer Node providers and async validation share browser rules without a renderer or external runtime dependency", async () => {
  const e = createEngine({
    validators: {
      unique: {
        validate: async (value, ctx) =>
          value === ctx.providers.reserved
            ? { code: "taken", messageKey: "demo.taken" }
            : null,
      },
    },
  }).register({ type: "text", title: "Text", value: stringValue() });
  const r = compileForm(
    e,
    def([
      {
        id: "a",
        type: "text",
        key: "a",
        validation: { custom: [{ validator: "unique" }] },
      },
    ]),
  );
  if (!r.ok) throw new Error("compile");
  expect(
    await validateSubmission(
      r.form,
      { a: "reserved" },
      { providers: { reserved: "reserved" } },
    ),
  ).toMatchObject({ valid: false, errors: [{ error: { code: "taken" } }] });
  expect((await validateSubmission(r.form, { a: "free" })).valid).toBe(true);
  expect(JSON.stringify(toSubmissionSchema(r.form))).toContain(
    "x-ourform-validators",
  );
});
test("custom value adapters may reject malformed inputs without throwing from validateSubmission", async () => {
  const e = createEngine().register({
    type: "strict",
    title: "Strict",
    value: {
      ...stringValue(),
      normalize: (v) => {
        if (typeof v !== "string") throw new Error("bad");
        return v;
      },
    },
  });
  const r = e.compile(def([{ id: "s", type: "strict", key: "s" }]));
  if (!r.ok) throw new Error("compile");
  expect(
    (await validateSubmission(r.form, { s: 3 })).errors[0]!.error.code,
  ).toBe("type");
  const broken = createEngine().register({
    type: "broken",
    title: "Broken",
    value: {
      ...stringValue(),
      normalize: () => {
        throw new Error("bad default");
      },
    },
  });
  const b = broken.compile(def([{ id: "b", type: "broken", key: "b" }]));
  if (!b.ok) throw new Error("compile");
  expect((await validateSubmission(b.form, {})).errors[0]!.error.code).toBe(
    "submission",
  );
});
test("JSON equality ignores custom-object property order and preserves arrays", async () => {
  const adapter = {
    empty: () => null,
    normalize: (value: unknown) =>
      value && typeof value === "object"
        ? { a: (value as { a: unknown }).a, b: (value as { b: unknown }).b }
        : null,
    isEmpty: (v: unknown) => v === null,
    jsonSchema: () => ({ type: ["object", "null"] }),
  };
  const e = createEngine()
    .register({ type: "object", title: "Object", value: adapter })
    .register({
      type: "array",
      title: "Array",
      value: {
        empty: () => [] as number[],
        normalize: (v) => (Array.isArray(v) ? v : []),
        isEmpty: (v) => !v.length,
        jsonSchema: () => ({ type: "array" }),
      },
    });
  const r = e.compile(
    def([
      { id: "o", type: "object", key: "o" },
      {
        id: "a",
        type: "array",
        key: "a",
        validation: { minItems: 1, maxItems: 3 },
      },
    ]),
  );
  if (!r.ok) throw new Error("compile");
  expect(
    (await validateSubmission(r.form, { o: { b: 2, a: 1 }, a: [1, 2] })).valid,
  ).toBe(true);
  expect(
    ajv.compile(toSubmissionSchema(r.form))({ o: null, a: [1, 2, 3, 4] }),
  ).toBe(false);
});
test("schema generation preserves nested required scopes, optional empties and Unicode string lengths", async () => {
  const e = engine();
  const r = e.compile(
    def([
      {
        id: "section",
        type: "container",
        key: "group",
        components: [
          {
            id: "n",
            type: "text",
            key: "name",
            validation: {
              required: true,
              minLength: 2,
              maxLength: 4,
              pattern: "^[A-Z😀]+$",
            },
          },
        ],
      },
    ]),
  );
  if (!r.ok) throw new Error("compile");
  const validate = ajv.compile(toSubmissionSchema(r.form));
  for (const data of [
    {},
    { group: {} },
    { group: { name: " " } },
    { group: { name: "😀" } },
    { group: { name: "lower" } },
  ])
    expect(validate(data)).toBe(false);
  expect(validate({ group: { name: "😀😀" } })).toBe(true);
  expect(
    (await validateSubmission(r.form, { group: { name: "😀😀" } })).valid,
  ).toBe(true);
});
test("schema exports are isolated JSON snapshots, with explicit missing adapter hints and rejected row schemas", () => {
  const e = createEngine().register({
    type: "n",
    title: "No hint",
    value: { ...numberValue(), jsonSchema: undefined },
  } as never);
  const r = e.compile(def([{ id: "n", type: "n", key: "n" }]));
  if (!r.ok) throw new Error("compile");
  const a = toSubmissionSchema(r.form);
  a.title = "changed";
  expect(toSubmissionSchema(r.form).title).toBeUndefined();
  expect(JSON.stringify(a)).toContain("x-ourform-adapter");
  expect(() =>
    toSubmissionSchema({
      definition: { id: "rows" },
      nodes: [
        {
          node: { id: "r", type: "r" },
          path: [{ row: "x" }],
          model: { value: { empty: () => "" } },
        },
      ],
    }),
  ).toThrow("M10");
  expect(() =>
    toSubmissionSchema({
      definition: { id: "bad" },
      nodes: [
        {
          node: { id: "r", type: "r" },
          path: ["r"],
          model: { value: { empty: () => "", jsonSchema: () => new Date() } },
        },
      ],
    }),
  ).toThrow();
});

test("serialized custom values round-trip through normalize/serialize without permitting coercion", async () => {
  const value = {
    empty: () => ({ n: 0 }),
    normalize: (input: unknown) =>
      typeof input === "number" ? { n: input } : { n: 0 },
    isEmpty: (input: { n: number }) => input.n === 0,
    serialize: (input: { n: number }) => input.n,
    jsonSchema: () => ({ type: "number" }),
  };
  const e = createEngine().register({ type: "serial", title: "Serial", value });
  const compiled = e.compile(def([{ id: "n", type: "serial", key: "n" }]));
  if (!compiled.ok) throw new Error("compile");
  expect((await validateSubmission(compiled.form, { n: 2 })).valid).toBe(true);
  expect((await validateSubmission(compiled.form, { n: "2" })).valid).toBe(
    false,
  );
  const check = ajv.compile(toSubmissionSchema(compiled.form));
  expect(check({ n: 0 })).toBe(true);
  expect(check({ n: {} })).toBe(false);
});

test("explicit good/bad data companions for every legacy fixture pass/fail both SDK and Ajv", async () => {
  const names = readdirSync(
    new URL("../../../fixtures/forms", import.meta.url),
  ).filter((f) => f.endsWith(".json") && !f.includes(".invalid"));
  for (const name of names) {
    const result = engine().compile(load(name));
    if (!result.ok) throw new Error(name);
    const good = load(`../submissions/${name.slice(0, -5)}.data.json`);
    const bad = load(
      `../submissions/${name.slice(0, -5)}.invalid.json`,
    ) as unknown[];
    const validate = ajv.compile(toSubmissionSchema(result.form));
    expect(validate(good), name).toBe(true);
    expect((await validateSubmission(result.form, good)).valid, name).toBe(
      true,
    );
    for (const data of bad) {
      expect(validate(data), name).toBe(false);
      expect((await validateSubmission(result.form, data)).valid, name).toBe(
        false,
      );
    }
  }
});

test("null serialization is a canonical empty value, including calculated fields", async () => {
  const e = createEngine().register({
    type: "v",
    title: "Value",
    value: {
      empty: () => ({ n: 0 }),
      normalize: (input: unknown) => ({
        n: typeof input === "number" ? input : 0,
      }),
      isEmpty: (input: { n: number }) => input.n === 0,
      serialize: (input: { n: number }) => input.n || null,
      jsonSchema: () => ({ type: ["number", "null"] }),
    },
  });
  const empty = e.compile(def([{ id: "a", type: "v", key: "a" }]));
  if (!empty.ok) throw new Error("compile");
  expect((await validateSubmission(empty.form, { a: null })).valid).toBe(true);
  expect(ajv.compile(toSubmissionSchema(empty.form))({ a: null })).toBe(true);
  const calc = e.compile(
    def([{ id: "a", type: "v", key: "a", calculate: { expr: 2 } }]),
  );
  if (!calc.ok) throw new Error("compile");
  expect((await validateSubmission(calc.form, { a: 2 })).valid).toBe(true);
  expect(
    (await validateSubmission(calc.form, { a: 3 })).errors[0]!.error.code,
  ).toBe("calculated");
});
