import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { builtinComponents } from "@ourform/components";
import { validateSubmission } from "@ourform/validation";
import { createLogicPropertiesEngine } from "../../apps/shared/logic-properties";
import { readFileSync } from "node:fs";
const definition = JSON.parse(
  readFileSync(
    new URL("../../fixtures/forms/logic/properties.json", import.meta.url),
    "utf8",
  ),
);
import type {} from "../../apps/playground/logic-prototype";
import type {} from "../../apps/react-example/src/main";

for (const host of [
  "DOM",
  "Element light",
  "Element shadow",
  "React",
  "Angular",
] as const)
  for (const theme of [
    "base",
    "bootstrap4",
    "bootstrap5",
    "tailwind",
    "material",
  ]) {
    test(`${host} ${theme}: property overlays retain controls, revert and match Node constraints/config`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const port = host === "React" ? 4182 : 4183;
      await page.goto(
        host === "React" || host === "Angular"
          ? `http://127.0.0.1:${port}/?properties&theme=${theme}`
          : `/logic-prototype.html?properties&theme=${theme}`,
      );
      if (host.startsWith("Element"))
        await page.evaluate((shadow) => {
          window.ourformLogic.destroy();
          document.querySelector("#form")!.remove();
          window.ourformEffects.element(shadow);
        }, host === "Element shadow");
      const scope = host.startsWith("Element")
        ? page.locator("logic-effects-form")
        : host === "DOM"
          ? page.locator("#form")
          : page.locator("#app");
      const source = scope.getByRole("textbox", {
        name: "Source",
        exact: true,
      });
      const amount = scope.getByRole("spinbutton");
      const choice = scope.getByRole("combobox", {
        name: "Choice",
        exact: true,
      });
      const code = scope.getByRole("textbox", { name: "Code", exact: true });
      expect(errors).toEqual([]);
      await expect(amount).toHaveValue("3");
      await amount.evaluate((el) => {
        (el as HTMLElement).dataset.identity = "same";
      });
      await source.fill("yes");
      await expect(source).toBeFocused();
      await expect(amount).toHaveAccessibleName("Adjusted amount");
      await expect(amount).toHaveAttribute("data-identity", "same");
      await expect(amount).toHaveAccessibleDescription(/At least five/);
      await expect(code).toHaveAttribute("placeholder", "Uppercase code");
      await expect(
        scope.getByText("Changed panel", { exact: true }),
      ).toBeVisible();
      await expect(
        choice.getByRole("option", { name: "Replacement", exact: true }),
      ).toHaveCount(1);
      await expect(
        choice.getByRole("option", { name: "Original", exact: true }),
      ).toHaveCount(0);
      await expect(scope.getByText("USD", { exact: true })).toBeVisible();
      await expect(scope.getByText("net", { exact: true })).toBeVisible();
      await expect(amount).toHaveAttribute("aria-invalid", "true");
      await expect(code).toHaveAttribute("aria-invalid", "true");
      const e = createLogicPropertiesEngine();
      for (const field of builtinComponents) e.register(field.model);
      const compiled = e.compile(definition);
      if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
      expect(
        (
          await validateSubmission(compiled.form, {
            source: "yes",
            amount: 3,
            code: "aa",
            choice: "old",
          })
        ).valid,
      ).toBe(false);
      await amount.fill("6");
      await code.fill("AA");
      await choice.selectOption("new");
      await expect(amount).toHaveAttribute("aria-invalid", "false");
      await expect(code).toHaveAttribute("aria-invalid", "false");
      expect(
        (
          await validateSubmission(compiled.form, {
            source: "yes",
            amount: 6,
            code: "AA",
            choice: "new",
          })
        ).valid,
      ).toBe(true);
      const axe = await new AxeBuilder({ page }).analyze();
      expect(
        axe.violations.filter(
          (v) => v.impact === "serious" || v.impact === "critical",
        ),
      ).toEqual([]);
      await source.fill("no");
      await expect(amount).toHaveAccessibleName("Amount");
      await expect(amount).toHaveAttribute("data-identity", "same");
      await expect(code).toHaveAttribute("aria-invalid", "true");
      await expect(
        scope.getByText("Original panel", { exact: true }),
      ).toBeVisible();
      await expect(
        choice.getByRole("option", { name: "Original", exact: true }),
      ).toHaveCount(1);
      expect(errors).toEqual([]);
    });
  }

test("property overlays update offline under strict CSP without fetching runtime code", async ({
  page,
  context,
}) => {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("Content Security Policy"))
      violations.push(message.text());
  });
  await page.route("**/logic-prototype.html?*", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        "content-security-policy":
          "default-src 'self'; script-src 'self'; style-src 'self' 'nonce-property-test'; img-src 'self' data:; connect-src 'self'; font-src 'self'",
      },
    });
  });
  await page.goto(
    "http://127.0.0.1:4174/logic-prototype.html?properties&theme=bootstrap5",
  );
  const source = page.getByRole("textbox", { name: "Source", exact: true });
  await expect(source).toBeVisible();
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await context.setOffline(true);
  await source.fill("yes");
  await expect(page.getByRole("spinbutton")).toHaveAccessibleName(
    "Adjusted amount",
  );
  await expect(
    page.getByRole("option", { name: "Replacement", exact: true }),
  ).toHaveCount(1);
  await source.fill("no");
  await expect(page.getByRole("spinbutton")).toHaveAccessibleName("Amount");
  expect(requests).toEqual([]);
  expect(violations).toEqual([]);
});
