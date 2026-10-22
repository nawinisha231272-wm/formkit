import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type {} from "../../apps/playground/tabs";
for (const theme of [
  "base",
  "bootstrap4",
  "bootstrap5",
  "tailwind",
  "material",
]) {
  test(`Tabs ${theme}: keyboard, retained state, error reveal, reset and accessibility`, async ({
    page,
  }) => {
    await page.goto("/tabs.html");
    await page.locator("#theme").selectOption(theme);
    const profile = page.getByRole("tab", { name: "Profile", exact: true });
    const contact = page.getByRole("tab", { name: "Contact", exact: true });
    const name = page.getByRole("textbox", { name: "Full name", exact: true });
    await expect(profile).toHaveAttribute("aria-selected", "true");
    await expect(name).toHaveValue("Ada Lovelace");
    const input = await name.elementHandle();
    await name.fill("Updated name");
    await profile.focus();
    await page.keyboard.press("ArrowRight");
    await expect(contact).toBeFocused();
    await expect(contact).toHaveAttribute("aria-selected", "true");
    const email = page.getByRole("textbox", { name: "Email", exact: true });
    await expect(email).toHaveValue("ada@example.test");
    await email.fill("invalid");
    await contact.focus();
    await page.keyboard.press("Home");
    await expect(profile).toBeFocused();
    await expect(name).toHaveValue("Updated name");
    expect(await name.evaluate((el, old) => el === old, input)).toBe(true);
    await page.locator("#submit").click();
    await expect(
      page.getByRole("region", {
        name: "Please correct these errors",
        exact: true,
      }),
    ).toBeFocused();
    await page
      .getByRole("link", {
        name: "Email must be a valid email address",
        exact: true,
      })
      .click();
    await expect(email).toBeVisible();
    await expect(email).toBeFocused();
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await email.fill("valid@example.test");
    await profile.click();
    const axe = await new AxeBuilder({ page }).analyze();
    expect(
      axe.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact ?? ""),
      ),
    ).toEqual([]);
    await name.focus();
    await name.evaluate((el) =>
      (el as HTMLInputElement).setSelectionRange(2, 5),
    );
    const data = await page.evaluate(() => window.tabsForm.session.getData());
    await page.evaluate(() => window.tabsForm.view.setTheme("base"));
    await expect(name).toBeFocused();
    expect(
      await name.evaluate((el) => (el as HTMLInputElement).selectionStart),
    ).toBe(2);
    expect(
      await page.evaluate(() => window.tabsForm.session.getData()),
    ).toEqual(data);
    await page.locator("#reset").click();
    await expect(name).toHaveValue("");
    await expect(name).toHaveAttribute("aria-invalid", "false");
  });
}
for (const state of ["readonly", "disabled"])
  test(`Tabs propagates ${state}; API writes still work`, async ({ page }) => {
    await page.goto(`/tabs.html?${state}`);
    const name = page.getByRole("textbox", { name: "Full name", exact: true });
    if (state === "readonly")
      await expect(name).toHaveAttribute("readonly", "");
    else await expect(name).toBeDisabled();
    await name.evaluate((el) => {
      (el as HTMLInputElement).value = "blocked";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await expect(name).toHaveValue("Ada Lovelace");
    await page.evaluate(() =>
      window.tabsForm.session.setValue("name", "API answer"),
    );
    await expect(name).toHaveValue("API answer");
  });

for (const theme of [
  "base",
  "bootstrap4",
  "bootstrap5",
  "tailwind",
  "material",
]) {
  test(`Tabs ${theme}: visual conformance`, async ({ page }) => {
    await page.goto("/tabs.html");
    await page.locator("#theme").selectOption(theme);
    await page
      .getByRole("textbox", { name: "Full name", exact: true })
      .fill("Updated name");
    const profile = page.getByRole("tab", { name: "Profile", exact: true });
    await profile.focus();
    await page.keyboard.press("ArrowRight");
    await expect(
      page.getByRole("tab", { name: "Contact", exact: true }),
    ).toBeFocused();
    await expect(
      page.getByRole("textbox", { name: "Email", exact: true }),
    ).toHaveValue("ada@example.test");
    await expect(page.locator("#tabs-form")).toHaveScreenshot(
      `tabs-${theme}-contact.png`,
      { animations: "disabled", maxDiffPixelRatio: 0.02 },
    );
    await profile.click();
    await expect(
      page.getByRole("textbox", { name: "Full name", exact: true }),
    ).toHaveValue("Updated name");
    await expect(page.locator("#tabs-form")).toHaveScreenshot(
      `tabs-${theme}-profile.png`,
      { animations: "disabled", maxDiffPixelRatio: 0.02 },
    );
  });
}
