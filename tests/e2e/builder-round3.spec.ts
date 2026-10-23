import { test, expect } from "@playwright/test";
import type {} from "../../apps/playground/builder";

for (const theme of [
  "base",
  "bootstrap4",
  "bootstrap5",
  "tailwind",
  "material",
])
  test(`${theme}: toolbar tooltips are single-line and inside viewport`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/builder.html?approved&theme=${theme}`);
    const field = page.locator('#canvas [data-field-id="email"]');
    await field.focus();
    const toolbar = field.locator(":scope > .ofb-component-toolbar");
    for (const action of ["Edit", "Move", "Duplicate", "Copy"]) {
      const button = toolbar.getByRole("button", { name: action, exact: true });
      await button.hover();
      const tooltip = button.getByRole("tooltip");
      await expect(tooltip).toBeVisible();
      const bounds = await tooltip.evaluate((el) => {
        const rect = el.getBoundingClientRect(),
          style = getComputedStyle(el);
        return {
          x: rect.x,
          right: rect.right,
          height: rect.height,
          line: parseFloat(style.lineHeight),
          padding:
            parseFloat(style.paddingTop) + parseFloat(style.paddingBottom),
        };
      });
      expect(bounds.height - bounds.padding).toBeLessThan(bounds.line * 1.5);
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.right).toBeLessThanOrEqual(1280);
    }
  });

test("history replaces toast and SR text, handles empty stack, and never replays expired notices", async ({
  page,
}) => {
  await page.goto("/builder.html?approved");
  await page.clock.install({ time: new Date("2026-10-22T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-22T12:00:01Z"));
  const field = page.locator('#canvas [data-field-id="email"]');
  await field.focus();
  await page.keyboard.press("ControlOrMeta+d");
  const undo = page
    .locator(".ofb-header-actions")
    .getByRole("button", { name: "Undo", exact: true });
  const redo = page
    .locator(".ofb-header-actions")
    .getByRole("button", { name: "Redo", exact: true });
  await undo.click();
  await expect(page.locator("#diagnostics")).toHaveText(
    "Undid duplicate of Email",
  );
  await expect(page.locator(".of-builder-toast")).toHaveText(
    "Undid duplicate of Email",
  );
  await redo.click();
  await expect(page.locator("#diagnostics")).toHaveText(
    "Redid duplicate of Email",
  );
  await page.clock.fastForward(5001);
  await expect(page.locator(".of-builder-toast")).toBeHidden();
  await page
    .getByRole("combobox", { name: "Theme", exact: true })
    .selectOption("bootstrap5");
  await expect(page.locator(".of-builder-toast")).toBeHidden();
  await page.evaluate(() => {
    window.miniBuilder.builder.undo();
    window.miniBuilder.builder.undo();
  });
  await expect(page.locator("#diagnostics")).toHaveText("Nothing to undo");
  expect(
    await page
      .locator("#diagnostics")
      .evaluate((el) => el.getBoundingClientRect().height),
  ).toBeLessThanOrEqual(1);
});

test("F6 cycles regions and Alt+Z is not intercepted in text inputs", async ({
  page,
}) => {
  await page.goto("/builder.html?approved");
  const search = page.getByRole("searchbox", {
    name: "Search components",
    exact: true,
  });
  await search.focus();
  const prevented = await search.evaluate((el) => {
    const event = new KeyboardEvent("keydown", {
      key: "Ω",
      code: "KeyZ",
      altKey: true,
      bubbles: true,
      cancelable: true,
    });
    el.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(prevented).toBe(false);
  await search.fill("Ω");
  await expect(search).toHaveValue("Ω");
  await page.keyboard.press("F6");
  await expect(search).not.toBeFocused();
});
