import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { createEngine } from "@ourform/core";
import { createLogic } from "@ourform/core/logic";
import { textField, numberField } from "@ourform/components";
import type { FormDefinition } from "@ourform/schema";
import { validateSubmission } from "../src/index";
const definition: FormDefinition = JSON.parse(
  readFileSync(
    new URL(
      "../../../fixtures/forms/logic/calculation-precedence.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

for (const allowOverride of [false, true])
  test(`combined calculations use active root=3 / inactive field=2 with browser/Node parity, allowOverride=${allowOverride}`, async () => {
    const e = createEngine({ logic: createLogic() })
      .register(textField.model)
      .register(numberField.model);
    const compiled = e.compile({
      ...definition,
      components: definition.components.map((node) =>
        node.calculate
          ? { ...node, calculate: { ...node.calculate, allowOverride } }
          : node,
      ),
    });
    if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
    const session = e.createSession(compiled.form);
    expect(session.getValue("target")).toBe(3);
    expect(session.getFieldState("target").logic?.authoritative).toBe(
      !allowOverride,
    );
    for (const [source, target] of [
      ["no", 2],
      ["yes", 3],
    ] as const) {
      session.setValue("source", source, { source: "user" });
      expect(await session.submit()).toEqual({
        ok: true,
        data: { source, target },
      });
      expect(
        (await validateSubmission(compiled.form, { source, target })).valid,
      ).toBe(true);
    }
    session.setValue("target", 99, { source: "user" });
    const expected = allowOverride ? 99 : 3;
    expect(await session.submit()).toEqual({
      ok: true,
      data: { source: "yes", target: expected },
    });
    expect(
      (
        await validateSubmission(compiled.form, {
          source: "yes",
          target: expected,
        })
      ).valid,
    ).toBe(true);
    const forged = await validateSubmission(compiled.form, {
      source: "yes",
      target: 99,
    });
    expect(forged.valid).toBe(allowOverride);
    if (!allowOverride)
      expect(forged.errors.map((e) => e.error.code)).toContain("calculated");
    const invalid = await validateSubmission(compiled.form, {
      source: "yes",
      target: -1,
    });
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.map((e) => e.error.code)).toContain(
      allowOverride ? "min" : "calculated",
    );
    session.dispose();
  });
