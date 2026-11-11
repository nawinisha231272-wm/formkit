import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createEngine } from "@ourform/core";
import { createLogic } from "@ourform/core/logic";
import { builtinFields } from "@ourform/components";
import { validateSubmission } from "@ourform/validation";
import { readFileSync } from "node:fs";
const definition = JSON.parse(
  readFileSync(
    new URL("../../fixtures/forms/logic/prototype.json", import.meta.url),
    "utf8",
  ),
);
import type {} from "../../apps/playground/logic-prototype";

test("root rules preserve live control identity, update required state, and submit identically in browser and Node", async ({
  page,
}) => {
  await page.goto("/logic-prototype.html");
  const company = page.getByRole("textbox", { name: "Company", exact: true });
  await expect(company).toHaveAttribute("aria-required", "true");
  await expect(
    page.getByRole("spinbutton", { name: "Total", exact: true }),
  ).toHaveValue("20");
  await expect(
    page.getByRole("textbox", { name: "Invoice type", exact: true }),
  ).toHaveValue("company");
  const reference = page.getByRole("textbox", {
    name: "Reference",
    exact: true,
  });
  const control = await reference.elementHandle();
  await reference.fill("my later answer");
  await expect(reference).toBeFocused();
  expect(
    await reference.evaluate((node, original) => node === original, control),
  ).toBe(true);
  await page.getByRole("textbox", { name: "Country", exact: true }).fill("GB");
  await expect(company).toHaveAttribute("aria-required", "false");
  await page.getByRole("textbox", { name: "Country", exact: true }).fill("CA");
  await expect(company).toHaveAttribute("aria-required", "true");
  const result = await page.evaluate(() => window.ourformLogic.submit());
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Expected successful browser submission.");
  expect(result.data).toMatchObject({
    reference: "my later answer",
    total: 20,
    receipt: "ready",
  });
  const engine = createEngine({ logic: createLogic() });
  for (const field of builtinFields) engine.register(field.model);
  const compiled = engine.compile(definition);
  if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
  expect(await validateSubmission(compiled.form, result.data)).toEqual({
    valid: true,
    errors: [],
  });
  expect(
    (await new AxeBuilder({ page }).analyze()).violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
});
