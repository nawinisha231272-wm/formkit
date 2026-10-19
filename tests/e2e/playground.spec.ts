import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("feedback, themes and generated properties", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Name", { exact: true }).fill("Ana");
  await page.getByRole("button", { name: "4 of 5 stars" }).click();
  await page.locator("#theme").selectOption("tailwind");
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Ana");
  await page.getByRole("button", { name: "Validate", exact: true }).click();
  await expect(page.locator("#output")).toContainText('"rating": 4');
  await expect(page.locator("#output")).toContainText('"errors": []');
  await page.getByLabel("Number of stars").fill("7");
  await page.getByLabel("Number of stars").press("Tab");
  await expect(
    page.getByRole("button", { name: "7 of 7 stars" }),
  ).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
});
