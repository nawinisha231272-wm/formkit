import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type {} from "../../apps/playground/builder";
async function openBulk(page: import("@playwright/test").Page) {
  const outline = page.locator(".of-builder-outline");
  await outline.locator('[data-drag-id="email"]').focus();
  await page.keyboard.press("Shift+ArrowDown");
  await page.keyboard.press("ControlOrMeta+k");
  const commands = page.getByRole("dialog", { name: "Commands", exact: true });
  await commands
    .getByRole("searchbox", { name: "Search commands" })
    .fill("Edit");
  await commands
    .getByRole("button", { name: "Edit 2 components", exact: true })
    .click();
  return page.getByRole("dialog", {
    name: "Edit selected components",
    exact: true,
  });
}
for (const theme of [
  "base",
  "bootstrap4",
  "bootstrap5",
  "tailwind",
  "material",
])
  test(`${theme}: bulk settings use the property intersection and save all selected members in one undo step`, async ({
    page,
  }) => {
    await page.goto(
      `/builder.html?approved&settingsPreload=none&theme=${theme}`,
    );
    const before = await page.evaluate(() =>
      JSON.stringify(window.miniBuilder.builder.getState().definition),
    );
    const editor = await openBulk(page);
    const axe = await new AxeBuilder({ page }).include(".of-builder").analyze();
    expect(
      axe.violations.filter((violation) =>
        ["serious", "critical"].includes(violation.impact ?? ""),
      ),
    ).toEqual([]);
    await expect(
      editor.locator('[data-property="properties.options"]'),
    ).toHaveCount(0);
    await editor.getByLabel("Description", { exact: true }).fill("Shared help");
    await editor.getByRole("button", { name: "Save", exact: true }).click();
    await expect(editor).toHaveCount(0);
    expect(
      await page.evaluate(
        () => window.miniBuilder.builder.getState().history.past.length,
      ),
    ).toBe(1);
    for (const id of ["email", "customerType"])
      await expect(
        page.locator(`#canvas [data-field-id="${id}"] .of-description`).first(),
      ).toHaveText("Shared help");
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    expect(
      await page.evaluate(() =>
        JSON.stringify(window.miniBuilder.builder.getState().definition),
      ),
    ).toBe(before);
    for (const id of ["email", "customerType"])
      await expect(
        page.locator(`.of-builder-outline [data-drag-id="${id}"]`),
      ).toHaveAttribute("aria-selected", "true");
  });
test("bulk settings Cancel discards edits and retains the exact selection without history", async ({
  page,
}) => {
  await page.goto("/builder.html?approved&settingsPreload=none");
  const before = await page.evaluate(() =>
    JSON.stringify(window.miniBuilder.builder.getState().definition),
  );
  const editor = await openBulk(page);
  await editor.getByLabel("Label", { exact: true }).fill("Discarded");
  await editor.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(
    await page.evaluate(() =>
      JSON.stringify(window.miniBuilder.builder.getState().definition),
    ),
  ).toBe(before);
  expect(
    await page.evaluate(
      () => window.miniBuilder.builder.getState().history.past.length,
    ),
  ).toBe(0);
  for (const id of ["email", "customerType"])
    await expect(
      page.locator(`.of-builder-outline [data-drag-id="${id}"]`),
    ).toHaveAttribute("aria-selected", "true");
});
test("bulk editor opens an immediate accessible frame while its lazy asset is slow", async ({
  page,
}) => {
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/features\/bulk-editor\.js(?:\?|$)/, async (route) => {
    await waiting;
    await route.continue();
  });
  await page.goto("/builder.html?approved&settingsPreload=none");
  const editor = await openBulk(page);
  await expect(editor).toBeVisible();
  await expect(editor.locator('[aria-busy="true"]')).toBeVisible();
  expect(
    await page.evaluate(
      () => window.miniBuilder.builder.getState().history.past.length,
    ),
  ).toBe(0);
  release();
  await expect(editor.getByLabel("Label", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(editor).toHaveCount(0);
});

test("bulk editor failure shows its reason and Retry preserves selection, schema and history", async ({
  page,
}) => {
  await page.route(/\/features\/bulk-editor\.js(?:\?|$)/, (route) =>
    route.abort("failed"),
  );
  await page.goto("/builder.html?approved&settingsPreload=none");
  const before = await page.evaluate(() =>
    JSON.stringify(window.miniBuilder.builder.getState().definition),
  );
  const editor = await openBulk(page);
  await expect(
    editor.getByRole("button", { name: "Retry", exact: true }),
  ).toBeVisible();
  expect((await editor.innerText()).length).toBeGreaterThan("Retry".length);
  await editor.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(editor.getByLabel("Label", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  expect(
    await page.evaluate(() =>
      JSON.stringify(window.miniBuilder.builder.getState().definition),
    ),
  ).toBe(before);
  expect(
    await page.evaluate(
      () => window.miniBuilder.builder.getState().history.past.length,
    ),
  ).toBe(0);
  for (const id of ["email", "customerType"])
    await expect(
      page.locator(`.of-builder-outline [data-drag-id="${id}"]`),
    ).toHaveAttribute("aria-selected", "true");
});
