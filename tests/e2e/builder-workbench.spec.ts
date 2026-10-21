import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type {} from "../../apps/playground/builder";

test("workbench modes use the live form and submission schema without remounting controls", async ({
  page,
}) => {
  await page.goto("/builder.html");
  await expect(
    page.getByRole("tab", { name: "Logic", exact: true }),
  ).toBeDisabled();
  const history = await page.evaluate(
    () => window.miniBuilder.builder.getState().history.past.length,
  );
  await page.getByRole("tab", { name: "Preview", exact: true }).click();
  const name = page.locator("#preview").getByRole("textbox", { name: /Name/ });
  await name.fill("Ana");
  const identity = await name.elementHandle();
  await page.getByRole("tab", { name: "Data", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Submission JSON Schema", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".ofb-data-panel pre").first()).toContainText(
    '"additionalProperties": false',
  );
  await expect(page.locator(".ofb-data-panel pre").last()).toContainText(
    '"name": "Ana"',
  );
  await page.getByRole("tab", { name: "JSON", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Form JSON", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Preview", exact: true }).click();
  expect(await name.evaluate((node, old) => node === old, identity)).toBe(true);
  await expect(name).toHaveValue("Ana");
  expect(
    await page.evaluate(
      () => window.miniBuilder.builder.getState().history.past.length,
    ),
  ).toBe(history);
  await page.getByRole("tab", { name: "Build", exact: true }).click();
  await expect(page.locator('[data-builder-part="canvas"]')).toBeVisible();
  await expect(page.locator("#preview")).toBeHidden();
});

test("design canvas shows only the active tab and preserves tab DOM/selection on theme switches", async ({
  page,
}) => {
  await page.goto("/builder.html?fixture");
  const canvas = page.locator('[data-builder-part="canvas"]');
  await expect(canvas.locator('[data-field-id="name"]')).toBeVisible();
  await expect(canvas.locator('[data-field-id="email"]')).toBeHidden();
  const email = canvas.locator('[data-field-id="email"]');
  const identity = await email.elementHandle();
  await canvas.getByRole("tab", { name: "Contact", exact: true }).click();
  await expect(email).toBeVisible();
  await expect(canvas.locator('[data-field-id="name"]')).toBeHidden();
  await email.click();
  await page
    .getByRole("combobox", { name: "Preview theme", exact: true })
    .selectOption("material");
  await expect(
    canvas.getByRole("tab", { name: "Contact", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  expect(await email.evaluate((node, old) => node === old, identity)).toBe(
    true,
  );
  expect(
    await page.evaluate(() => window.miniBuilder.builder.getState().selection),
  ).toBe("email");
  await expect(canvas).toHaveAttribute("data-of-theme", "material");
});

test("copy toolbar captures a snapshot; keyboard paste commits once without opening settings", async ({
  page,
}) => {
  await page.goto("/builder.html");
  const rating = page.locator(
    '[data-builder-part="canvas"] [data-field-id="cmp_rating"]',
  );
  await rating.getByRole("button", { name: "Copy", exact: true }).click();
  expect(
    await page.evaluate(
      () => window.miniBuilder.builder.getState().history.past.length,
    ),
  ).toBe(0);
  await rating.focus();
  await rating.press("Control+v");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      window.miniBuilder.builder.getState().history.past.map((c) => c.type),
    ),
  ).toEqual(["PasteComponent"]);
  expect(
    await page.evaluate(
      () =>
        window.miniBuilder.builder
          .getState()
          .definition.components.filter((n) => n.type === "rating").length,
    ),
  ).toBe(2);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect(
    await page.evaluate(
      () =>
        window.miniBuilder.builder
          .getState()
          .definition.components.filter((n) => n.type === "rating").length,
    ),
  ).toBe(1);
});

test("context menu and duplicate shortcut share one-step commands; host can cancel deletion", async ({
  page,
}) => {
  await page.goto("/builder.html");
  const rating = page.locator(
    '[data-builder-part="canvas"] [data-field-id="cmp_rating"]',
  );
  await rating.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Duplicate", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      window.miniBuilder.builder.getState().history.past.map((c) => c.type),
    ),
  ).toEqual(["DuplicateComponent"]);
  const selected = page.locator(
    '[data-builder-part="canvas"] [data-of-selected="true"]',
  );
  await selected.focus();
  await selected.press("Control+d");
  expect(
    await page.evaluate(() =>
      window.miniBuilder.builder.getState().history.past.map((c) => c.type),
    ),
  ).toEqual(["DuplicateComponent", "DuplicateComponent"]);
  await page.evaluate(() =>
    document
      .getElementById("builder")!
      .addEventListener("of-before-delete", (e) => e.preventDefault(), {
        once: true,
      }),
  );
  await page
    .locator('[data-builder-part="canvas"] [data-of-selected="true"]')
    .press("Delete");
  expect(
    await page.evaluate(
      () => window.miniBuilder.builder.getState().history.past.length,
    ),
  ).toBe(2);
});

test("workbench chrome and active-tab canvas have no serious/critical axe issues", async ({
  page,
}) => {
  await page.goto("/builder.html?fixture");
  const result = await new AxeBuilder({ page }).analyze();
  expect(
    result.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
});

test("React native settings preview receives its draft form context and hook writes remain isolated", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4182/builder.html?context-trial");
  await page
    .getByRole("button", { name: "Add Native text", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("input[data-builder-native]")).toBeVisible();
  await expect(dialog.locator("[data-builder-context]")).toHaveText(
    "react-builder-context",
  );
  await expect(dialog.locator("[data-builder-session-native]")).not.toHaveText(
    "missing",
  );
  await dialog
    .getByRole("button", { name: "Write through form hook", exact: true })
    .click();
  await expect(dialog.locator("input[data-builder-native]")).toHaveValue(
    "Written through draft hook",
  );
  expect(
    await page.evaluate(() =>
      window
        .builderHost!.builder.getState()
        .definition.components.some((n) => n.type === "acme.native"),
    ),
  ).toBe(false);
  expect(await page.evaluate(() => window.builderChanges.length)).toBe(0);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(await page.evaluate(() => window.builderChanges.length)).toBe(0);
});
