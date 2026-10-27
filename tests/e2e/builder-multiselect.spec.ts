import { expect, test } from "@playwright/test";
import type {} from "../../apps/playground/builder";

test("outline Shift arrows extend and contract selection immediately", async ({
  page,
}) => {
  await page.goto("/builder.html?approved&settingsPreload=none");
  const outline = page.locator(".of-builder-outline");
  const email = outline.locator('[role=treeitem][data-drag-id="email"]');
  await email.focus();
  await page.keyboard.press("Shift+ArrowDown");
  await expect(email).toHaveAttribute("aria-selected", "true");
  await expect(
    outline.locator('[role=treeitem][data-drag-id="customerType"]'),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.locator('#canvas [data-field-id="email"]')).toHaveAttribute(
    "data-of-multiselected",
    "true",
  );
  await expect(page.locator(".of-builder-status")).toHaveText("2 selected");
  await page.keyboard.press("Shift+ArrowUp");
  await expect(
    outline.locator('[role=treeitem][data-drag-id="customerType"]'),
  ).toHaveAttribute("aria-selected", "false");
  await expect(page.locator(".of-builder-status")).toHaveText("1 selected");
});
