import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { checkPropertyEditors } from "@ourform/testing/playwright";
import type {} from "../../apps/playground/boolean-authoring";
for (const theme of ["base", "bootstrap4", "bootstrap5", "tailwind"]) {
  test(`nullable boolean: ${theme} consent, tri-state answer, literal/key captions and editors`, async ({
    page,
  }) => {
    await page.goto("/boolean-authoring.html");
    await page.locator("#theme").selectOption(theme);
    const input = page.locator("#consent input");
    expect(
      await page.evaluate(() =>
        window.booleanAuthoring.consent.session.getValue("value"),
      ),
    ).toBeNull();
    await page.locator("#submit").click();
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#consent")).toHaveScreenshot(
      `nullable-${theme}.png`,
      { animations: "disabled", maxDiffPixelRatio: 0.02 },
    );
    await expect(input).toHaveAccessibleName("Consent");
    expect(
      (await new AxeBuilder({ page }).analyze()).violations.filter((v) =>
        ["serious", "critical"].includes(v.impact ?? ""),
      ),
    ).toEqual([]);
    const geometry = await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>("#consent input")!;
      const label = document.querySelector<HTMLLabelElement>(
        `#consent label[for="${input.id}"]`,
      )!;
      const a = input.getBoundingClientRect(),
        b = label.getBoundingClientRect();
      return a.top < b.bottom && b.top < a.bottom;
    });
    expect(geometry).toBe(true);
    await input.focus();
    await page.keyboard.press("Space");
    await page.locator("#submit").click();
    await expect(page.locator("#result")).toContainText('"ok":true');
    await input.focus();
    await page.keyboard.press("Space");
    await page.locator("#submit").click();
    await expect(page.locator("#result")).toContainText('"ok":false');
    expect(
      await page.evaluate(() =>
        window.booleanAuthoring.consent.session.getValue("value"),
      ),
    ).toBe(false);
    await page.locator("#required").uncheck();
    await page.evaluate(() =>
      window.booleanAuthoring.consent.session.setValue("value", false),
    );
    await page.locator("#submit").click();
    await expect(page.locator("#result")).toContainText('"value":false');
    await expect(page.locator("#result")).toContainText('"ok":true');
    for (const toggle of ["read-only", "disabled"]) {
      await page.locator(`#${toggle}`).check();
      await page.evaluate(() =>
        window.booleanAuthoring.consent.session.setValue("value", false),
      );
      await input.evaluate((el) => {
        (el as HTMLInputElement).checked = true;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await expect(input).not.toBeChecked();
      expect(
        await page.evaluate(() =>
          window.booleanAuthoring.consent.session.getValue("value"),
        ),
      ).toBe(false);
      await page.evaluate(() =>
        window.booleanAuthoring.consent.session.setValue("value", true),
      );
      await expect(input).toBeChecked();
      await page.locator(`#${toggle}`).uncheck();
    }
    await page.locator("#reset").click();
    expect(
      await page.evaluate(() =>
        window.booleanAuthoring.consent.session.getValue("value"),
      ),
    ).toBeNull();
    expect(
      await page.evaluate(async () => {
        window.booleanAuthoring.answer.session.setValue("value", false);
        return (await window.booleanAuthoring.answer.submit()).ok;
      }),
    ).toBe(true);
    await page.locator('#builder [data-component-type="acme-yes-no"]').click();
    await checkPropertyEditors(page, [
      {
        key: "yesLabel",
        value: "Absolutely",
        verify: async (p) => {
          await p.locator("input[type=checkbox]").check();
          await expect(p.locator("[data-answer-label]")).toHaveText(
            "Absolutely",
          );
        },
      },
      {
        key: "noLabel",
        value: "Never",
        verify: async (p) => {
          await p.locator("input[type=checkbox]").uncheck();
          await expect(p.locator("[data-answer-label]")).toHaveText("Never");
        },
      },
      {
        key: "yesLabelKey",
        value: "acme.answer.yes",
        verify: async (p) => {
          await p.locator("input[type=checkbox]").check();
          await expect(p.locator("[data-answer-label]")).toHaveText(
            "Translated yes",
          );
        },
      },
      {
        key: "noLabelKey",
        value: "acme.answer.no",
        verify: async (p) => {
          await p.locator("input[type=checkbox]").uncheck();
          await expect(p.locator("[data-answer-label]")).toHaveText(
            "Translated no",
          );
        },
      },
    ]);
  });
}
