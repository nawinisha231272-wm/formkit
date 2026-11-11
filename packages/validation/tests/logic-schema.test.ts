import { expect, test } from "vitest";
import Ajv2020 from "ajv/dist/2020.js";
import { createEngine } from "@ourform/core";
import { createLogic } from "@ourform/core/logic";
import { textField, containerLayout } from "@ourform/components";
import { toSubmissionSchema, validateSubmission } from "../src/index";

test("root-rule schema annotations defer dynamic required/hidden constraints while preserving static requirements and canonical types", async () => {
  const engine = createEngine({ logic: createLogic() })
    .register(textField.model)
    .register(containerLayout.model);
  const definition = {
    $formVersion: "1.0",
    id: "annotations",
    display: "form",
    components: [
      {
        id: "static",
        type: "text",
        key: "static",
        validation: { required: true },
      },
      {
        id: "optional",
        type: "text",
        key: "optional",
        validation: { required: true, minLength: 5 },
      },
      {
        id: "group",
        type: "container",
        key: "group",
        components: [
          {
            id: "child",
            type: "text",
            key: "child",
            validation: { required: true },
          },
        ],
      },
    ],
    logic: [
      {
        id: "state",
        trigger: { on: "load" },
        then: [
          { action: "optional", target: "optional" },
          { action: "hide", target: "group" },
        ],
      },
    ],
  };
  const compiled = engine.compile(definition);
  if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
  const schema = toSubmissionSchema(compiled.form);
  expect(schema["x-ourform-logic"]).toEqual(definition.logic);
  expect(schema.required).toEqual(["static"]);
  const validate = new Ajv2020({ strict: false }).compile(schema);
  expect(validate({ static: "ok" })).toBe(true);
  expect(
    (await validateSubmission(compiled.form, { static: "ok" })).valid,
  ).toBe(true);
  expect(validate({})).toBe(false);
  expect(validate({ static: 42 })).toBe(false);
  // An annotation is not a substitute for the shared runtime's conditional constraints.
  expect(
    (await validateSubmission(compiled.form, { static: "ok", optional: "a" }))
      .valid,
  ).toBe(false);
  (schema["x-ourform-logic"] as unknown[]).length = 0;
  expect(compiled.form.definition.logic).toHaveLength(1);
});

test("authoritative submit assignments annotate omitted server-filled fields, while Node rejects forged values", async () => {
  const engine = createEngine({ logic: createLogic() }).register(
    textField.model,
  );
  const compiled = engine.compile({
    $formVersion: "1.0",
    id: "authoritative",
    display: "form",
    components: [
      {
        id: "answer",
        key: "answer",
        type: "text",
        validation: { required: true },
      },
    ],
    logic: [
      {
        id: "server",
        trigger: { on: "submit" },
        then: [{ action: "setValue", target: "answer", value: "server" }],
      },
    ],
  });
  if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
  const schema = toSubmissionSchema(compiled.form);
  expect(schema.required).toBeUndefined();
  expect((await validateSubmission(compiled.form, {})).valid).toBe(true);
  expect(
    (await validateSubmission(compiled.form, { answer: "forged" })).errors.map(
      (error) => error.error.code,
    ),
  ).toContain("calculated");
});
