import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type {} from "../../apps/playground/builder";

test("settings drafts update a real preview, cancel cleanly and save all edits as one command", async ({
  page,
}) => {
  await page.goto("/builder.html");
  const history = await page.evaluate(
    () => window.miniBuilder.builder.getState().history.past.length,
  );
  await page
    .locator('[data-builder-part="inspector"]')
    .getByRole("button", { name: "Edit settings", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Number of stars", { exact: true }).fill("7");
  await expect(
    dialog.getByRole("button", { name: "7 of 7 stars" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => window.miniBuilder.builder.getState().history.past.length,
    ),
  ).toBe(history);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("tab", { name: "Preview", exact: true }).click();
  await expect(
    page.locator("#preview").getByRole("button", { name: "5 of 5 stars" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Build", exact: true }).click();
  await page
    .locator('[data-builder-part="inspector"]')
    .getByRole("button", { name: "Edit settings", exact: true })
    .click();
  await dialog.getByLabel("Number of stars", { exact: true }).fill("7");
  await dialog.getByLabel("Label", { exact: true }).fill("Your rating");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("tab", { name: "Preview", exact: true }).click();
  await expect(
    page.locator("#preview").getByRole("button", { name: "7 of 7 stars" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => window.miniBuilder.builder.getState().history.past.length,
    ),
  ).toBe(history + 1);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByRole("tab", { name: "Preview", exact: true }).click();
  await expect(
    page.locator("#preview").getByRole("button", { name: "5 of 5 stars" }),
  ).toBeVisible();
});

test("modal focus, tab errors, Escape cancellation and appearance changes preserve the draft DOM/history", async ({
  page,
}) => {
  await page.goto("/builder.html");
  await page
    .locator('[data-builder-part="inspector"]')
    .getByRole("button", { name: "Edit settings", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  const label = dialog.getByLabel("Label", { exact: true });
  await label.fill("Draft title");
  const handle = await label.elementHandle();
  await page.evaluate(() => {
    window.nestedBuilder.setTheme("material");
    window.nestedBuilder.setMode("dark");
    window.nestedBuilder.setChrome({ theme: "bootstrap5", density: "compact" });
  });
  await expect(label).toBeFocused();
  expect(await label.evaluate((node, old) => node === old, handle)).toBe(true);
  await expect(label).toHaveValue("Draft title");
  await expect(
    dialog.locator('[data-builder-part="editor-preview"]'),
  ).toHaveAttribute("data-of-theme", "material");
  await dialog.getByRole("tab", { name: "Data", exact: true }).click();
  const key = dialog.getByLabel("Data key", { exact: true });
  await key.fill("name");
  await expect(
    dialog.getByRole("button", { name: "Save", exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("tab", { name: "Data has a problem", exact: true }),
  ).toBeVisible();
  await key.fill("rating");
  await expect(
    dialog.getByRole("button", { name: "Save", exact: true }),
  ).toBeEnabled();
  const axe = await new AxeBuilder({ page }).analyze();
  expect(
    axe.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
  await key.press("Escape");
  await expect(dialog).toHaveCount(0);
  expect(
    await page.evaluate(
      () => window.miniBuilder.builder.getState().history.past.length,
    ),
  ).toBe(0);
});

test("drawer applies live and consecutive property edits undo together", async ({
  page,
}) => {
  await page.goto("/builder.html?drawer");
  await page
    .locator('[data-builder-part="inspector"]')
    .getByRole("button", { name: "Edit settings", exact: true })
    .click();
  const drawer = page.getByRole("complementary", {
    name: "Customer rating",
    exact: true,
  });
  const max = drawer.getByLabel("Number of stars", { exact: true });
  await max.fill("6");
  await max.fill("7");
  await expect(
    drawer.getByRole("button", { name: "7 of 7 stars" }),
  ).toBeVisible();
  await drawer
    .getByRole("button", { name: "Close", exact: true })
    .last()
    .click();
  expect(
    await page.evaluate(
      () => window.miniBuilder.builder.getState().history.past.length,
    ),
  ).toBe(1);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByRole("tab", { name: "Preview", exact: true }).click();
  await expect(
    page.locator("#preview").getByRole("button", { name: "5 of 5 stars" }),
  ).toBeVisible();
});

for (const cancel of ["Cancel", "Close", "Escape"]) {
  test(`pending addition ${cancel} discards without schema/history changes and restores selection/focus`, async ({
    page,
  }) => {
    await page.goto("/builder.html");
    const edit = page
      .locator('[data-builder-part="inspector"]')
      .getByRole("button", { name: "Edit settings", exact: true });
    await edit.focus();
    const before = await page.evaluate(() =>
      JSON.stringify(window.miniBuilder.builder.getState()),
    );
    await page
      .locator('[data-builder-part="palette"] [data-type="email"]')
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Label", { exact: true }).fill("Work email");
    expect(
      await page.evaluate(() =>
        JSON.stringify(window.miniBuilder.builder.getState()),
      ),
    ).toBe(before);
    if (cancel === "Escape")
      await dialog.getByLabel("Label", { exact: true }).press("Escape");
    else
      await dialog.getByRole("button", { name: cancel, exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(
      await page.evaluate(() =>
        JSON.stringify(window.miniBuilder.builder.getState()),
      ),
    ).toBe(before);
    await expect(edit).toBeFocused();
  });
}

test("pending addition Save creates one Add command with settings and one-step undo/redo", async ({
  page,
}) => {
  await page.goto("/builder.html");
  const before = await page.evaluate(() =>
    JSON.stringify(window.miniBuilder.builder.getState().definition),
  );
  await page
    .locator('[data-builder-part="palette"] [data-type="email"]')
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Label", { exact: true }).fill("Work email");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  const state = await page.evaluate(() =>
    window.miniBuilder.builder.getState(),
  );
  expect(state.history.past.map((c) => c.type)).toEqual(["AddComponent"]);
  expect(state.definition.components.at(-1)).toMatchObject({
    type: "email",
    label: "Work email",
    key: "workEmail",
  });
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect(
    await page.evaluate(() =>
      JSON.stringify(window.miniBuilder.builder.getState().definition),
    ),
  ).toBe(before);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  expect(
    await page.evaluate(() => window.miniBuilder.builder.getState().definition),
  ).toEqual(state.definition);
});

test("drawer addition commits before edits; closing retains it and edits undo separately", async ({
  page,
}) => {
  await page.goto("/builder.html?drawer");
  await page
    .locator('[data-builder-part="palette"] [data-type="email"]')
    .click();
  const drawer = page.getByRole("complementary", { name: /Email/ });
  expect(
    await page.evaluate(() =>
      window.miniBuilder.builder.getState().history.past.map((c) => c.type),
    ),
  ).toEqual(["AddComponent"]);
  await drawer.getByLabel("Label", { exact: true }).fill("Work email");
  await drawer
    .getByRole("button", { name: "Close", exact: true })
    .last()
    .click();
  expect(
    await page.evaluate(() =>
      window.miniBuilder.builder.getState().history.past.map((c) => c.type),
    ),
  ).toEqual(["AddComponent", "UpdateComponent"]);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect(
    await page.evaluate(
      () =>
        window.miniBuilder.builder.getState().definition.components.at(-1)
          ?.label,
    ),
  ).toBe("Email");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect(
    await page.evaluate(() =>
      window.miniBuilder.builder
        .getState()
        .definition.components.some((n) => n.type === "email"),
    ),
  ).toBe(false);
});

test("openOnAdd false commits defaults without settings; duplicate and wrap never open settings", async ({
  page,
}) => {
  await page.goto("/builder.html?no-open");
  await page
    .locator('[data-builder-part="palette"] [data-type="email"]')
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      window.miniBuilder.builder.getState().history.past.map((c) => c.type),
    ),
  ).toEqual(["AddComponent"]);
  await page.goto("/builder.html");
  await page
    .locator(
      '[data-builder-part="canvas"] [data-of-selected="true"]>.ofb-component-toolbar',
    )
    .getByRole("button", { name: "Duplicate", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      window.miniBuilder.builder.getState().history.past.map((c) => c.type),
    ),
  ).toEqual(["DuplicateComponent"]);
  await page
    .locator(
      '[data-builder-part="canvas"] [data-of-selected="true"]>.ofb-component-toolbar',
    )
    .getByRole("button", { name: "More", exact: true })
    .click();
  await page
    .locator(".ofb-action-menu")
    .getByRole("button", { name: "Wrap in layout", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      window.miniBuilder.builder.getState().history.past.map((c) => c.type),
    ),
  ).toEqual(["DuplicateComponent", "WrapInLayout"]);
});
