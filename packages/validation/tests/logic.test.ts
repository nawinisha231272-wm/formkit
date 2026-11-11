import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { createEngine } from "@ourform/core";
import { createLogic } from "@ourform/core/logic";
import { builtinFields } from "@ourform/components";
import { validateSubmission } from "../src/index";
const definition = JSON.parse(
  readFileSync(
    new URL("../../../fixtures/forms/logic/prototype.json", import.meta.url),
    "utf8",
  ),
);
function compile() {
  const engine = createEngine({ logic: createLogic() });
  for (const field of builtinFields) engine.register(field.model);
  const result = engine.compile(definition);
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  return { engine, form: result.form };
}
const good = {
  customerType: "business",
  country: "US",
  company: "Acme",
  invoice: "company",
  reference: "a later user answer",
  quantity: 2,
  total: 20,
  receipt: "ready",
};

test("shared root-rule session and customer Node accept the same canonical submission without rewriting input", async () => {
  const { engine, form } = compile();
  const before = structuredClone(good);
  const session = engine.createSession(form, { data: good });
  expect(await session.submit()).toEqual({ ok: true, data: good });
  expect(await validateSubmission(form, good)).toEqual({
    valid: true,
    errors: [],
  });
  expect(good).toEqual(before);
  session.dispose();
});

test("Node enforces rule-required state and authoritative load/submit/calculation values, preserving editable edge values", async () => {
  const { form } = compile();
  for (const target of ["invoice", "receipt", "total"] as const) {
    const result = await validateSubmission(form, {
      ...good,
      [target]: target === "total" ? 19 : "forged",
    });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some(
        (e) => e.componentId === target && e.error.code === "calculated",
      ),
    ).toBe(true);
  }
  const missing = await validateSubmission(form, { ...good, company: "" });
  expect(
    missing.errors.some(
      (e) => e.componentId === "company" && e.error.code === "required",
    ),
  ).toBe(true);
  expect(
    (
      await validateSubmission(form, {
        ...good,
        reference: "another valid user value",
      })
    ).valid,
  ).toBe(true);
  expect(
    (await validateSubmission(form, { ...good, country: "GB", company: "" }))
      .valid,
  ).toBe(true);
  expect((await validateSubmission(form, { ...good, extra: true })).valid).toBe(
    false,
  );
  expect(
    (
      await validateSubmission(
        form,
        { ...good, extra: true },
        { unknownKeys: "strip" },
      )
    ).valid,
  ).toBe(true);
});
