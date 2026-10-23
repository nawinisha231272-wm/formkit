import { test, expect } from "@playwright/test";
import type {} from "../../apps/playground/builder";

test("Unwrap replaces a preceding command announcement and restores exactly through Undo/Redo", async ({
  page,
}) => {
  await page.goto("/builder.html?approved");
  const panel = page.locator('#canvas [data-field-id="contactPanel"]');
  await panel.focus();
  await page.keyboard.press("ControlOrMeta+c");
  await expect(page.locator("#diagnostics")).toHaveText(
    "Copied Contact details. Choose a slot and paste.",
  );
  const before = await page.evaluate(() =>
    JSON.stringify(window.miniBuilder.builder.getState().definition),
  );
  await page.keyboard.press("Shift+F10");
  await page.getByRole("menuitem", { name: "Unwrap", exact: true }).click();
  await expect(page.locator("#diagnostics")).toHaveText(
    "Unwrapped Contact details",
  );
  await expect(page.locator(".of-builder-toast")).toHaveText(
    "Unwrapped Contact details",
  );
  await expect(panel).toHaveCount(0);
  const after = await page.evaluate(() =>
    JSON.stringify(window.miniBuilder.builder.getState().definition),
  );
  expect(after).not.toBe(before);
  await page.keyboard.press("ControlOrMeta+z");
  await expect(page.locator("#diagnostics")).toHaveText(
    "Undid unwrap of Contact details",
  );
  expect(
    await page.evaluate(() =>
      JSON.stringify(window.miniBuilder.builder.getState().definition),
    ),
  ).toBe(before);
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(page.locator("#diagnostics")).toHaveText(
    "Redid unwrap of Contact details",
  );
  expect(
    await page.evaluate(() =>
      JSON.stringify(window.miniBuilder.builder.getState().definition),
    ),
  ).toBe(after);
});
