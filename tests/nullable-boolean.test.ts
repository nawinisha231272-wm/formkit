import { test, expect } from "vitest";
import Ajv2020 from "ajv/dist/2020.js";
import { createEngine } from "@ourform/core";
import {
  nullableBooleanValue,
  booleanValue,
  defineField,
  h,
} from "@ourform/sdk";
import { validateSubmission } from "@ourform/validation";
import { toSubmissionSchema } from "@ourform/schema";
import { caption } from "../apps/docs/examples/yes-no";

test("nullable booleans preserve tri-state values and true-only required is explicit", () => {
  expect(() => nullableBooleanValue({ requiredTrue: "true" as never })).toThrow(
    "requiredTrue must be a boolean",
  );
  const answers = nullableBooleanValue();
  const consent = nullableBooleanValue({ requiredTrue: true });
  for (const adapter of [answers, consent]) {
    expect(adapter.empty()).toBeNull();
    for (const value of [true, false, null]) {
      expect(adapter.normalize(value)).toBe(value);
      expect(adapter.serialize!(value)).toBe(value);
      expect(adapter.equals!(value, value)).toBe(true);
    }
    expect(adapter.equals!(null, false)).toBe(false);
    expect(adapter.normalize("true")).toBe(true);
    expect(adapter.normalize("false")).toBe(false);
    for (const value of [undefined, "", 0, 1, "yes", {}, []])
      expect(adapter.normalize(value)).toBeNull();
  }
  expect(answers.isEmpty(false)).toBe(false);
  expect(answers.isEmpty(null)).toBe(true);
  expect(consent.isEmpty(false)).toBe(true);
  expect(consent.isEmpty(null)).toBe(true);
  expect(consent.isEmpty(true)).toBe(false);
  expect(booleanValue().empty()).toBe(false);
  expect(booleanValue().isEmpty(false)).toBe(true);
});
for (const requiredTrue of [false, true])
  for (const required of [false, true]) {
    test(`nullable boolean required=${required} requiredTrue=${requiredTrue}: session, Node and JSON Schema agree`, async () => {
      const field = defineField({
        type: "answer",
        title: "Answer",
        value: nullableBooleanValue({ requiredTrue }),
        control: () => h("input", {}),
      });
      const engine = createEngine().register(field.model);
      const compiled = engine.compile({
        $formVersion: "1.0",
        id: "answers",
        display: "form",
        components: [
          {
            id: "answer",
            type: "answer",
            key: "answer",
            validation: { required },
          },
        ],
      });
      expect(compiled.ok).toBe(true);
      if (!compiled.ok) return;
      const check = new Ajv2020({ strict: false }).compile(
        toSubmissionSchema(compiled.form),
      );
      for (const value of [undefined, null, false, true]) {
        const data = value === undefined ? {} : { answer: value };
        const valid =
          !required ||
          (requiredTrue ? value === true : value === true || value === false);
        const session = engine.createSession(compiled.form, { data });
        expect((await session.submit()).ok).toBe(valid);
        expect(session.getValue("answer")).toBe(value ?? null);
        session.dispose();
        const result = await validateSubmission(compiled.form, data);
        expect(result.valid).toBe(valid);
        if (!valid)
          expect(result.errors.some((e) => e.error.code === "required")).toBe(
            true,
          );
        expect(check(data), JSON.stringify(check.errors)).toBe(valid);
      }
      for (const invalid of ["false", "true", 0, 1, {}, []])
        expect(
          (await validateSubmission(compiled.form, { answer: invalid })).valid,
        ).toBe(false);
    });
  }
test("caption literals stay literal; optional message keys translate with configured English fallback", () => {
  const translate = (key: string) =>
    key === "custom.yes"
      ? "Absolutely"
      : key === "Yes"
        ? "Unexpected translation"
        : key;
  expect(caption(translate, "Yes", "")).toBe("Yes");
  expect(caption(translate, "Yes", "custom.yes")).toBe("Absolutely");
  expect(caption(translate, "Yes", "missing.key")).toBe("Yes");
});

test("boolean JSON Schema checks emptiness after normalization for object-valued adapters", async () => {
  const field = defineField({
    type: "object-answer",
    title: "Object answer",
    control: () => h("input", {}),
    value: {
      empty: () => ({ answer: null as boolean | null }),
      normalize: (raw: unknown) => {
        const value =
          raw !== null && typeof raw === "object" && "answer" in raw
            ? raw.answer
            : raw;
        return { answer: typeof value === "boolean" ? value : null };
      },
      isEmpty: (value: { answer: boolean | null }) => value.answer !== true,
      serialize: (value: { answer: boolean | null }) => value.answer,
      jsonSchema: () => ({ type: ["boolean", "null"] }),
    },
  });
  const engine = createEngine().register(field.model);
  const compiled = engine.compile({
    $formVersion: "1.0",
    id: "objects",
    display: "form",
    components: [
      {
        id: "answer",
        type: "object-answer",
        key: "answer",
        validation: { required: true },
      },
    ],
  });
  expect(compiled.ok).toBe(true);
  if (!compiled.ok) return;
  const check = new Ajv2020({ strict: false }).compile(
    toSubmissionSchema(compiled.form),
  );
  for (const value of [false, true, null]) {
    expect(check({ answer: value })).toBe(value === true);
    expect(
      (await validateSubmission(compiled.form, { answer: value })).valid,
    ).toBe(value === true);
  }
});
