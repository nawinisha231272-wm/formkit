import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { checkPropertyEditors } from "@ourform/testing/playwright";
import type {} from "../../apps/playground/authoring";
for (const theme of ["base", "bootstrap4", "bootstrap5", "tailwind"]) {
  test(`authoring: ${theme} Slider/Quantity protection, translation, generated property editors and visuals`, async ({
    page,
  }) => {
    await page.goto("/authoring.html");
    await page.locator("#theme").selectOption(theme);
    expect(
      await page.evaluate(
        async () => (await window.authoring.slider.submit()).ok,
      ),
    ).toBe(false);
    expect(
      await page.evaluate(
        async () => (await window.authoring.quantity.submit()).ok,
      ),
    ).toBe(false);
    await expect(page.locator("#quantity output")).toHaveText("Not set");
    await expect(page.locator("#author-fixtures")).toHaveScreenshot(
      `authoring-${theme}.png`,
      { animations: "disabled", maxDiffPixelRatio: 0.02 },
    );
    const slider = page.getByRole("slider");
    await slider.focus();
    await page.keyboard.press("Home");
    expect(
      await page.evaluate(() =>
        window.authoring.slider.session.getValue("value"),
      ),
    ).toBe(0);
    for (const id of ["read-only", "disabled"]) {
      await page.locator(`#${id}`).check();
      await page.evaluate(() =>
        window.authoring.slider.session.setValue("value", 25),
      );
      await slider.evaluate((el) => {
        const input = el as HTMLInputElement;
        input.dataset.identity = "kept";
        input.value = "80";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await expect(slider).toHaveValue("25");
      await expect(slider).toHaveAttribute("data-identity", "kept");
      expect(
        await page.evaluate(() =>
          window.authoring.slider.session.getValue("value"),
        ),
      ).toBe(25);
      await page.evaluate(() =>
        window.authoring.slider.session.setValue("value", 50, {
          source: "api",
        }),
      );
      await expect(slider).toHaveValue("50");
      await page.locator(`#${id}`).uncheck();
    }
    await page
      .locator('#builder [data-component-type="acme-quantity"]')
      .click();
    await expect(checkPropertyEditors(page, [])).rejects.toThrow(
      "every generated component property",
    );
    await checkPropertyEditors(page, [
      {
        key: "min",
        value: 5,
        verify: async (p) => {
          await expect(p.locator("input")).toHaveAttribute("min", "5");
        },
      },
      {
        key: "max",
        value: 50,
        verify: async (p) => {
          await expect(p.locator("input")).toHaveAttribute("max", "50");
        },
      },
      {
        key: "step",
        value: 5,
        verify: async (p) => {
          await expect(p.locator("input")).toHaveAttribute("step", "5");
        },
      },
      {
        key: "showValue",
        value: false,
        verify: async (p) => {
          await expect(p.locator("output")).toHaveCount(0);
        },
      },
    ]);
    expect(
      (await new AxeBuilder({ page }).analyze()).violations.filter((v) =>
        ["serious", "critical"].includes(v.impact ?? ""),
      ),
    ).toEqual([]);
    const cleaned = await page.evaluate(() => {
      const host = document.getElementById("builder")!;
      window.authoring.mini.destroy();
      window.authoring.mini.destroy();
      return host.childNodes.length;
    });
    expect(cleaned).toBe(0);
  });
}
