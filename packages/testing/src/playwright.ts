import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Run against createThemeConformance's fixture with a host-owned native Submit button. */
export async function checkThemeConformance(
  page: Page,
  options: { root?: string; snapshot?: string } = {},
): Promise<void> {
  const selector = options.root ?? "#form";
  const root = page.locator(selector);
  await root.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(root.locator(".of-summary")).toBeFocused();
  await expect(root.getByLabel("Disabled", { exact: true })).toBeDisabled();
  await expect(
    root.getByLabel("Quantity, item A", { exact: true }),
  ).toHaveValue("3");
  const name = root.getByLabel("Name", { exact: true });
  await expect(name).toHaveAttribute("aria-invalid", "true");
  expect(
    (await name.getAttribute("aria-describedby"))?.split(" "),
  ).toHaveLength(3);
  const rating = root.locator('fieldset[data-field-id="rating"]');
  await expect(rating).toHaveAccessibleName("Rating");
  await expect(rating.locator("legend")).toContainText("(required)");
  await expect(rating).toHaveAccessibleDescription(
    "Rating is required (required)",
  );
  await root.getByRole("link", { name: "Rating is required" }).click();
  await expect(
    root.getByRole("button", { name: "1 of 5 stars" }),
  ).toBeFocused();
  await root.getByRole("button", { name: "3 of 5 stars" }).click();
  const hover = root.getByRole("button", { name: "4 of 5 stars" });
  await hover.hover();
  const color = await hover.evaluate((el) => getComputedStyle(el).color);
  await expect(hover).toHaveCSS("border-top-color", color);
  await name.focus();
  await expect(root.locator('[aria-live="polite"]')).toHaveCount(1);
  const results = await new AxeBuilder({ page }).include(selector).analyze();
  expect(
    results.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
  if (options.snapshot)
    await expect(root).toHaveScreenshot(options.snapshot, {
      animations: "disabled",
      scale: "css",
      maxDiffPixelRatio: 0.02,
    });
}

/** Verify native text, boolean and grouped-control read-only behavior, then optionally compare pixels. */
export async function checkReadOnlyTheme(
  page: Page,
  options: { root?: string; snapshot?: string } = {},
): Promise<void> {
  const root = page.locator(options.root ?? "#form");
  const name = root.getByLabel("Name", { exact: true });
  await expect(name).toHaveAttribute("readonly", "");
  await name.focus();
  await page.keyboard.type("ignored");
  await expect(name).toHaveValue("");
  await name.blur();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await root.getByLabel("Accept", { exact: true }).click();
  await expect(root.getByLabel("Accept", { exact: true })).not.toBeChecked();
  await expect(
    root.getByRole("button", { name: "1 of 5 stars" }),
  ).toBeDisabled();
  if (options.snapshot)
    await expect(root).toHaveScreenshot(options.snapshot, {
      animations: "disabled",
      scale: "css",
      maxDiffPixelRatio: 0.02,
    });
}
