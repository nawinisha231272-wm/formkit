import { test, expect } from "@playwright/test";
import type {} from "../../apps/playground/builder";

test("host palette, toolbar, editor, messages and icons options reach every workbench surface", async ({
  page,
}) => {
  await page.goto("/builder.html?host-options");
  const palette = page.locator("#palette");
  await expect(palette.locator("[data-type]").first()).toHaveAttribute(
    "data-type",
    "acme.customer-reference",
  );
  await expect(palette.locator('[data-type="password"]')).toHaveCount(0);
  await expect(palette.locator('[data-type="panel"]')).toHaveCount(0);
  const toolbar = page.locator('[data-component-toolbar="cmp_rating"]');
  await expect(toolbar.locator("button")).toHaveCount(3);
  await expect(
    toolbar.getByRole("button", { name: "Configure", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("button", { name: "Keep changes", exact: true })
      .locator('svg circle[r="5"]'),
  ).toHaveCount(1);
  await toolbar.getByRole("button", { name: "Configure", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("tab", { name: "Layout", exact: true }),
  ).toHaveCount(0);
  await expect(dialog.getByLabel("Placeholder", { exact: true })).toBeHidden();
  await dialog.getByLabel("Number of stars", { exact: true }).fill("6");
  await dialog
    .getByRole("button", { name: "Keep changes", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => window.miniBuilder.builder.getState().history.past.length,
    ),
  ).toBe(1);
});

test("structure, key and all locks show reasons and protect generated editors and JSON", async ({
  page,
}) => {
  await page.goto("/builder.html?locks");
  const canvas = page.locator("#canvas");
  const structure = canvas.locator('[data-component-toolbar="cmp_name"]');
  const remove = structure.getByRole("button", { name: "Delete", exact: true });
  await expect(remove).toHaveAttribute("aria-disabled", "true");
  await expect(remove).toHaveAttribute(
    "title",
    "Locked by your app: can't delete",
  );
  await remove.press("Enter");
  expect(
    await page.evaluate(
      () => window.miniBuilder.builder.getState().definition.components.length,
    ),
  ).toBe(3);
  await page
    .getByRole("button", { name: "Edit settings", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "Delete", exact: true }),
  ).toBeDisabled();
  await dialog.getByRole("tab", { name: "Data", exact: true }).click();
  await expect(dialog.getByLabel("Data key", { exact: true })).toBeDisabled();
  await dialog.getByRole("tab", { name: "Display", exact: true }).click();
  await dialog.getByLabel("Label", { exact: true }).fill("Account name");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("treeitem", { name: "Comment", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit settings", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "Delete", exact: true }),
  ).toBeEnabled();
  await dialog.getByRole("tab", { name: "Data", exact: true }).click();
  await expect(dialog.getByLabel("Data key", { exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await canvas.locator('[data-field-id="cmp_rating"]').click();
  expect(
    await page.evaluate(() => window.miniBuilder.builder.getState().selection),
  ).toBe("cmp_comment");
  const locked = page.locator('[role="treeitem"][data-drag-id="cmp_rating"]');
  await locked.click({ button: "right" });
  const menu = page.getByRole("menu");
  await expect(
    menu.getByRole("menuitem", { name: "Edit", exact: true }),
  ).toHaveAttribute("aria-disabled", "true");
  await menu.press("Escape");
  const beforeLockedShortcut = await page.evaluate(() =>
    JSON.stringify(window.miniBuilder.builder.getState().definition),
  );
  await locked.press("ControlOrMeta+d");
  expect(
    await page.evaluate(() =>
      JSON.stringify(window.miniBuilder.builder.getState().definition),
    ),
  ).toBe(beforeLockedShortcut);
  await expect(page.locator("#diagnostics")).toContainText(
    "Locked by your app",
  );
  await locked.click({ button: "right" });
  await menu.getByRole("menuitem", { name: "Edit JSON", exact: true }).click();
  dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("textbox", { name: "Edit JSON", exact: true }),
  ).toHaveAttribute("readonly", "");
  await expect(
    dialog.getByRole("button", { name: "Save", exact: true }),
  ).toBeHidden();
  await expect(
    dialog.getByText("Locked by your app", { exact: false }),
  ).toBeVisible();
});
