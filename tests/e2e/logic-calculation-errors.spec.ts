import { expect, test } from "@playwright/test";
import { createEngine } from "@ourform/core";
import { createLogic } from "@ourform/core/logic";
import { builtinFields } from "@ourform/components";
import { validateSubmission } from "@ourform/validation";
import { strictNumber } from "../../apps/playground/strict-number";
import type {} from "../../apps/playground/logic-prototype";

for (const allowOverride of [false, true])
  test(`invalid derivation persists until recovery or explicit override, following Node authority policy, override=${allowOverride}`, async ({
    page,
  }) => {
    await page.goto(
      `/logic-prototype.html?calculation-errors${allowOverride ? "&allow-override" : ""}`,
    );
    const source = page.getByRole("textbox", { name: "Source", exact: true });
    const other = page.getByRole("textbox", { name: "Other", exact: true });
    const derived = page.getByRole("spinbutton", {
      name: "Derived",
      exact: true,
    });
    await expect(derived).toHaveValue("3");
    await derived.evaluate(
      (el) => ((el as HTMLElement).dataset.identity = "retained"),
    );
    await source.fill("bad");
    await other.fill("unrelated");
    await expect(other).toBeFocused();
    const observed = await page.evaluate(async () => ({
      definition: window.ourformLogic.session.schema,
      data: window.ourformLogic.session.getData(),
      result: await window.ourformLogic.session.submit(),
    }));
    expect(observed.result.ok).toBe(false);
    if (!observed.result.ok)
      expect(observed.result.errors.map((e) => e.error.code)).toContain(
        "invalid-logic-value",
      );
    const engine = createEngine({ logic: createLogic() });
    for (const f of builtinFields) engine.register(f.model);
    engine.register(strictNumber.model);
    const compiled = engine.compile(observed.definition);
    if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
    // Node cannot infer client edit history: supplied overrideable values are valid.
    expect((await validateSubmission(compiled.form, observed.data)).valid).toBe(
      allowOverride,
    );
    if (allowOverride) {
      await derived.fill("99");
      const override = await page.evaluate(async () => ({
        data: window.ourformLogic.session.getData(),
        result: await window.ourformLogic.session.submit(),
      }));
      expect(override.result.ok).toBe(true);
      expect(
        (await validateSubmission(compiled.form, override.data)).valid,
      ).toBe(true);
    }
    for (const [value, expected] of [
      ["good", "3"],
      ["off", "2"],
    ] as const) {
      await source.fill(value);
      await expect(derived).toHaveValue(expected);
      await expect(derived).toHaveAttribute("data-identity", "retained");
      const recovered = await page.evaluate(async () => ({
        data: window.ourformLogic.session.getData(),
        result: await window.ourformLogic.session.submit(),
      }));
      expect(recovered.result.ok).toBe(true);
      expect(
        (await validateSubmission(compiled.form, recovered.data)).valid,
      ).toBe(true);
    }
  });
