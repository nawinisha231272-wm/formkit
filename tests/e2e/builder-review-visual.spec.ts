import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type {} from "../../apps/playground/builder";

test("owner review: sentence-first Conditional settings with synchronized expression disclosure", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/builder.html?approved&chrome=neutral&theme=material");
  await page.getByRole("tab", { name: "Build", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit settings", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("tab", { name: "Conditional", exact: true }).click();
  const expression = dialog.locator('[data-expression="visibleWhen"]');
  await expression
    .getByRole("button", { name: "Add condition", exact: true })
    .click();
  await expression
    .getByLabel("Comparison value", { exact: true })
    .fill("Ana Martinez");
  await expect(expression.locator("textarea")).toHaveValue(
    '["eq",{"ref":"fullName"},"Ana Martinez"]',
  );
  await expect(expression.locator("textarea")).toBeHidden();
  await page.evaluate(() => document.fonts.ready);
  if (info.project.name === "chromium")
    await expect(page).toHaveScreenshot("review-conditional-sentence.png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  const results = await new AxeBuilder({ page })
    .include(".of-builder")
    .analyze();
  expect(
    results.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
});

test("owner review: Builder look and keyboard destinations are in header More", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/builder.html?approved&chrome=neutral&theme=material");
  await page.getByRole("tab", { name: "Build", exact: true }).click();
  await page.locator(".ofb-header-menu > summary").click();
  await expect(
    page.getByRole("combobox", { name: "Builder look", exact: true }),
  ).toHaveValue("neutral");
  await expect(
    page.getByRole("combobox", { name: "Insert into", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Layout to wrap in", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  if (info.project.name === "chromium")
    await expect(page).toHaveScreenshot("review-builder-look-menu.png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  await page.locator(".ofb-header-menu select").first().press("Escape");
  await expect(
    page.getByRole("combobox", { name: "Builder look", exact: true }),
  ).toBeHidden();
});

test("owner review: Material phone preview uses filled read-only fields", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/builder.html?approved&chrome=neutral&theme=material");
  const name = page.locator('#preview [data-field-id="fullName"] input');
  await expect(name).toHaveAttribute("readonly", "");
  await expect(name).toHaveCSS("border-top-style", "solid");
  expect(
    await name.evaluate((el) => getComputedStyle(el).backgroundColor),
  ).not.toBe("rgba(0, 0, 0, 0)");
  await expect(page.locator(".ofb-header-actions")).toBeHidden();
  await page.evaluate(() => document.fonts.ready);
  if (info.project.name === "chromium")
    await expect(page).toHaveScreenshot("review-material-phone-readonly.png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  const results = await new AxeBuilder({ page })
    .include(".of-builder")
    .analyze();
  expect(
    results.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
  const before = await page.evaluate(() =>
    JSON.stringify(window.miniBuilder.builder.getState().definition),
  );
  await page
    .getByRole("tab", { name: "Preview", exact: true })
    .press("ControlOrMeta+d");
  expect(
    await page.evaluate(() =>
      JSON.stringify(window.miniBuilder.builder.getState().definition),
    ),
  ).toBe(before);
  await page.locator(".ofb-header-menu > summary").click();
  await expect(
    page.getByRole("combobox", { name: "Insert into", exact: true }),
  ).toBeHidden();
  await expect(
    page.getByRole("combobox", { name: "Layout to wrap in", exact: true }),
  ).toBeHidden();
});
