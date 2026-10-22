import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import type {} from "../../apps/playground/builder";

async function collapseCompany(page: Page) {
  await page
    .locator('#canvas [data-field-id="companyDetails"] > .of-layout-title')
    .click({ button: "right" });
  await page
    .getByRole("menuitem", { name: "Collapse or expand", exact: true })
    .click();
  await page
    .locator('[role="treeitem"][data-drag-id="email"] > .of-builder-tree-name')
    .click();
  const pane = page.locator('[data-builder-part="canvas-panel"]');
  await pane.hover();
  await page.mouse.wheel(0, -10000);
  await expect.poll(() => pane.evaluate((el) => el.scrollTop)).toBe(0);
}

test("approved screen 1: Neutral workbench with Material form and real pointer insertion", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/builder.html?approved&chrome=neutral&theme=material");
  await collapseCompany(page);
  const source = page.locator('#palette [data-type="email"]');
  const from = (await source.boundingBox())!,
    column = page.locator(
      '#canvas [data-of-slot-owner="contactColumns"][data-of-slot="column_0"]',
    ),
    to = (await column.boundingBox())!;
  await page.mouse.move(from.x + 15, from.y + 15);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
    steps: 12,
  });
  await expect(page.locator(".of-builder")).toHaveAttribute(
    "data-ofb-dragging",
    "true",
  );
  await expect(column).toHaveAttribute("data-ofb-drop-target", "true");
  await page.evaluate(() => document.fonts.ready);
  if (info.project.name === "chromium")
    await expect(page).toHaveScreenshot("screen-1-neutral-material-drag.png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  expect(
    await page.evaluate(
      () => window.miniBuilder.builder.getState().history.past.length,
    ),
  ).toBe(0);
});

test("approved screen 2: generated modal and actual Bootstrap 5 error-state preview", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/builder.html?approved&chrome=neutral&theme=bootstrap5");
  await page
    .getByRole("button", { name: "Edit settings", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Placeholder", { exact: true })
    .fill("name@company.com");
  await dialog.getByRole("button", { name: "Error", exact: true }).click();
  const email = dialog
    .locator('[data-builder-part="editor-preview"]')
    .getByRole("textbox", { name: /Email/ });
  await email.fill("ana@exam");
  await email.press("Tab");
  await expect(
    dialog.locator(
      '[data-builder-part="editor-preview"] [data-field-id="email"] [aria-invalid="true"]',
    ),
  ).toHaveCount(1);
  await page.evaluate(() => document.fonts.ready);
  if (info.project.name === "chromium")
    await expect(page).toHaveScreenshot("screen-2-neutral-edit-dialog.png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
});

for (const theme of ["bootstrap4", "bootstrap5", "material"])
  test(`approved screen 5: ${theme} form and matching builder chrome`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto(`/builder.html?approved&theme=${theme}`);
    await collapseCompany(page);
    await expect(page.locator(".of-builder")).toHaveAttribute(
      "data-ofb-theme",
      theme,
    );
    await page.evaluate(() => document.fonts.ready);
    if (info.project.name === "chromium")
      await expect(page).toHaveScreenshot(`screen-5-${theme}.png`, {
        animations: "disabled",
        maxDiffPixelRatio: 0.02,
      });
  });

test("approved screen 5: dark compact chrome retains a light Material canvas", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/builder.html?approved&theme=material&compact");
  await page.evaluate(() =>
    window.nestedBuilder.setChrome({
      theme: "material",
      mode: "dark",
      density: "compact",
    }),
  );
  await collapseCompany(page);
  await expect(page.locator(".of-builder")).toHaveAttribute(
    "data-ofb-mode",
    "dark",
  );
  await expect(page.locator("#canvas")).toHaveAttribute(
    "data-of-mode",
    "light",
  );
  await page.evaluate(() => document.fonts.ready);
  if (info.project.name === "chromium")
    await expect(page).toHaveScreenshot("screen-5-dark-compact.png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
});

test("approved screen 5: one actual definition in three themes and a dark compact builder", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/builder-themes.html");
  for (const theme of ["bootstrap4", "bootstrap5", "material"]) {
    const form = page.locator(`#${theme}`);
    await expect(form).toHaveAttribute("data-of-theme", theme);
    await expect(
      form.getByRole("textbox", { name: "Full name", exact: true }),
    ).toHaveValue("Ana Lima");
    await expect(form.getByRole("textbox", { name: /Email/ })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(
      form.getByRole("radio", { name: "Business", exact: true }),
    ).toBeChecked();
  }
  const base = page
    .locator("#bootstrap4")
    .getByRole("textbox", { name: "Full name", exact: true });
  await base.fill("Independent answer");
  await expect(
    page
      .locator("#material")
      .getByRole("textbox", { name: "Full name", exact: true }),
  ).toHaveValue("Ana Lima");
  await expect(
    page
      .locator("#bootstrap5")
      .getByRole("textbox", { name: "Full name", exact: true }),
  ).toHaveValue("Ana Lima");
  await base.fill("Ana Lima");
  await expect(page.locator(".of-builder")).toHaveAttribute(
    "data-ofb-mode",
    "dark",
  );
  await expect(page.locator('[data-builder-part="canvas"]')).toHaveAttribute(
    "data-of-mode",
    "light",
  );
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("heading", { level: 1 }).click();
  const compactBuilder = (await page.locator(".of-builder").boundingBox())!;
  expect(compactBuilder.y + compactBuilder.height).toBeLessThanOrEqual(1000);
  const axe = await new AxeBuilder({ page }).analyze();
  expect(
    axe.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
  if (info.project.name === "chromium")
    await expect(page).toHaveScreenshot("screen-5-theme-comparison.png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
});
