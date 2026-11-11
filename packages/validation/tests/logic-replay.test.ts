import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { createEngine } from "@ourform/core";
import { createLogic } from "@ourform/core/logic";
import { textField, numberField } from "@ourform/components";
import { toSubmissionSchema, validateSubmission } from "../src/index";
const definition = JSON.parse(
  readFileSync(
    new URL(
      "../../../fixtures/forms/logic/load-initializer.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const engine = () =>
  createEngine({ logic: createLogic() })
    .register(textField.model)
    .register(numberField.model);

test("Node accepts the browser's retained load copy A after source changes to B, without replaying initializers or losing derived state enforcement", async () => {
  const e = engine();
  const compiled = e.compile(definition);
  if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
  const session = e.createSession(compiled.form);
  session.setValue("source", "B", { source: "user" });
  expect(session.getValue("target")).toBe("A");
  expect((await session.submit()).ok).toBe(false);
  const invalid = await validateSubmission(compiled.form, {
    source: "B",
    target: "A",
  });
  expect(
    invalid.errors.map((e) => [e.componentId, e.error.code]),
  ).toContainEqual(["details", "required"]);
  expect(invalid.errors.some((e) => e.error.code === "calculated")).toBe(false);
  session.setValue("details", "provided");
  const result = await session.submit();
  expect(result).toEqual({
    ok: true,
    data: { source: "B", target: "A", details: "provided" },
  });
  if (!result.ok) throw new Error("Expected valid browser data");
  const before = structuredClone(result.data);
  expect(await validateSubmission(compiled.form, result.data)).toEqual({
    valid: true,
    errors: [],
  });
  expect(result.data).toEqual(before);
  const interactive = e.createSession(compiled.form, { data: result.data });
  expect(interactive.getValue("target")).toBe("B");
  interactive.dispose();
  expect(
    (
      await validateSubmission(compiled.form, {
        source: "B",
        target: "edited",
        details: "provided",
      })
    ).valid,
  ).toBe(true);
  expect(toSubmissionSchema(compiled.form).required).toEqual(["target"]);
  expect(
    (await validateSubmission(compiled.form, { source: "A" })).errors.map(
      (e) => [e.componentId, e.error.code],
    ),
  ).toContainEqual(["target", "required"]);
  session.dispose();
});

test("load clear never erases submitted data and is not a server-filled schema constraint", async () => {
  const e = engine();
  const compiled = e.compile({
    ...definition,
    logic: [
      {
        id: "clear-at-start",
        trigger: { on: "load" },
        then: [{ action: "clear", target: "target" }],
      },
    ],
  });
  if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
  const s = e.createSession(compiled.form, { data: { target: "initial" } });
  expect(s.getValue("target")).toBe("");
  s.setValue("target", "later");
  expect((await s.submit()).ok).toBe(true);
  expect((await validateSubmission(compiled.form, s.getData())).valid).toBe(
    true,
  );
  expect(toSubmissionSchema(compiled.form).required).toEqual(["target"]);
  s.dispose();
});

test("change writes into allowOverride calculations remain ordinary editable answers and Node validates the actual submitted value", async () => {
  const e = engine();
  const base = {
    $formVersion: "1.0",
    id: "override",
    display: "form",
    components: [
      { id: "source", key: "source", type: "text" },
      {
        id: "target",
        key: "target",
        type: "number",
        calculate: { expr: 2, allowOverride: true },
        validation: { min: 90 },
      },
    ],
    logic: [
      {
        id: "assign",
        trigger: { on: "change", refs: ["source"] },
        then: [{ action: "setValue", target: "target", value: 99 }],
      },
    ],
  };
  const compiled = e.compile(base);
  if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
  const s = e.createSession(compiled.form);
  s.setValue("source", "changed");
  expect(s.getFieldState("target").logic?.authoritative).toBe(false);
  expect(await s.submit()).toEqual({
    ok: true,
    data: { source: "changed", target: 99 },
  });
  expect((await validateSubmission(compiled.form, s.getData())).valid).toBe(
    true,
  );
  expect(
    (
      await validateSubmission(compiled.form, { source: "changed", target: 1 })
    ).errors.map((e) => e.error.code),
  ).toContain("min");
  expect(
    (
      await validateSubmission(compiled.form, {
        source: "changed",
        target: 100,
      })
    ).valid,
  ).toBe(true);
  const rejected = e.compile({
    ...base,
    components: base.components.map((node) =>
      node.id === "target"
        ? { ...node, calculate: { expr: 2, allowOverride: false } }
        : node,
    ),
  });
  expect(rejected.ok).toBe(false);
  expect(rejected.diagnostics).toContainEqual(
    expect.objectContaining({
      code: "logic-calculation-conflict",
      componentId: "target",
      message: expect.stringMatching(/assign.*target/),
    }),
  );
  s.dispose();
});
