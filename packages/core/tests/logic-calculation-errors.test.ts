import { expect, test } from "vitest";
import { validateSubmission } from "@ourform/validation";
import { createEngine } from "../src/index";
import { createLogic } from "../src/logic/index";
import { field, form, text, number } from "./helpers";

const setup = (allowOverride = false, two = false) => {
  const engine = createEngine({ logic: createLogic() })
    .register(text)
    .register({
      ...number,
      value: {
        ...number.value!,
        normalize(value: unknown) {
          if (
            value !== null &&
            (typeof value !== "number" || !Number.isFinite(value))
          )
            throw new TypeError("Expected a number or null");
          return value as number | null;
        },
      },
    });
  const targets = two ? ["first", "second"] : ["first"];
  const compiled = engine.compile({
    ...form([
      field("source"),
      field("other"),
      ...targets.map((id) =>
        field(id, { type: "number", calculate: { expr: 2, allowOverride } }),
      ),
    ]),
    logic: targets.map((id) => ({
      id: `derive-${id}`,
      trigger: { on: "change" },
      when: ["neq", { ref: "source" }, "off"],
      then: [
        {
          action: "calculate",
          target: id,
          expr: ["if", ["eq", { ref: "source" }, "bad"], "invalid", 3],
        },
      ],
    })),
  });
  if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
  return {
    engine,
    form: compiled.form,
    session: engine.createSession(compiled.form),
  };
};

test("active calculation errors survive unrelated edits with zero unrelated evaluation and browser/Node parity", async () => {
  const { session: s, form } = setup();
  s.setValue("source", "bad");
  const counts = { ...s.debug.logic! };
  s.setValue("other", "edited");
  expect(s.debug.logic!.conditions).toBe(counts.conditions);
  expect(s.debug.logic!.actionExpressions).toBe(counts.actionExpressions);
  expect(s.debug.logic!.candidates).toBe(counts.candidates);
  const browser = await s.submit();
  expect(browser.ok).toBe(false);
  if (!browser.ok)
    expect(browser.errors.map((e) => e.error.code)).toContain(
      "invalid-logic-value",
    );
  expect((await validateSubmission(form, s.getData())).valid).toBe(false);
  s.dispose();
});

test("successful or inactive calculations clear only their recovered diagnostics", async () => {
  for (const source of ["good", "off"]) {
    const { session: s, form } = setup();
    s.setValue("source", "bad");
    expect((await s.submit()).ok).toBe(false);
    s.setValue("source", source);
    expect(s.getValue("first")).toBe(source === "off" ? 2 : 3);
    expect((await s.submit()).ok).toBe(true);
    expect((await validateSubmission(form, s.getData())).valid).toBe(true);
    s.dispose();
  }
});

test("allowed explicit overrides recover invalid derivation; other invalid targets still block", async () => {
  const { session: s, form } = setup(true, true);
  s.setValue("source", "bad");
  s.setValue("first", 99, { source: "user" });
  const first = await s.submit();
  expect(first.ok).toBe(false);
  if (!first.ok)
    expect(first.errors.map((e) => e.componentId)).toEqual(["second"]);
  s.setValue("second", 98, { source: "user" });
  expect((await s.submit()).ok).toBe(true);
  expect((await validateSubmission(form, s.getData())).valid).toBe(true);
  s.dispose();
});

test("calculation errors are session-local and reset removes stale errors", async () => {
  const { engine, form, session: s } = setup();
  const other = engine.createSession(form);
  s.setValue("source", "bad");
  expect((await other.submit()).ok).toBe(true);
  expect((await s.submit()).ok).toBe(false);
  s.reset();
  expect((await s.submit()).ok).toBe(true);
  other.dispose();
  s.dispose();
});
