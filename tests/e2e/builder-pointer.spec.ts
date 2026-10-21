import { test, expect } from "@playwright/test";
import type {} from "../../apps/playground/builder";

test("Pointer Events drop uses a column slot and keeps the addition private until Save", async ({
  page,
}) => {
  await page.goto("/builder.html?fixture");
  const before = await page.evaluate(() =>
    JSON.stringify(window.miniBuilder.builder.getState().definition),
  );
  const source = page.locator(
    '[data-builder-part="palette"] [data-type="email"]',
  );
  const column = page.locator(
    '[data-builder-part="canvas"] [data-of-slot-owner="columns"][data-of-slot="column_0"]',
  );
  await column.scrollIntoViewIfNeeded();
  const from = (await source.boundingBox())!,
    to = (await column.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height - 12, {
    steps: 12,
  });
  await expect(page.locator(".of-builder")).toHaveAttribute(
    "data-ofb-dragging",
    "true",
  );
  await expect(column).toHaveAttribute("data-ofb-drop-target", "true");
  await page.mouse.up();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  expect(
    await page.evaluate(() =>
      JSON.stringify(window.miniBuilder.builder.getState().definition),
    ),
  ).toBe(before);
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  expect(
    await page.evaluate(() =>
      window.miniBuilder.builder.getState().history.past.map((c) => c.type),
    ),
  ).toEqual(["AddComponent"]);
  const columnTypes = await page.evaluate(() => {
    const tabs =
      window.miniBuilder.builder.getState().definition.components[0]!;
    return tabs.components![0]!.components![0]!.columns![0]!.components.map(
      (n) => n.type,
    );
  });
  expect(columnTypes).toEqual(["text", "email"]);
  await expect(
    page.getByRole("button", { name: "Undo", exact: true }),
  ).toHaveAttribute("title", "Undo Add Email");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect(
    await page.evaluate(() =>
      JSON.stringify(window.miniBuilder.builder.getState().definition),
    ),
  ).toBe(before);
});

test("Escape during palette drag cancels without settings, schema changes or history", async ({
  page,
}) => {
  await page.goto("/builder.html?fixture");
  const source = page.locator(
    '[data-builder-part="palette"] [data-type="email"]',
  );
  const from = (await source.boundingBox())!;
  const before = await page.evaluate(() =>
    JSON.stringify(window.miniBuilder.builder.getState()),
  );
  await page.mouse.move(from.x + 15, from.y + 15);
  await page.mouse.down();
  await page.mouse.move(from.x + 35, from.y + 15);
  await expect(page.locator(".of-builder")).toHaveAttribute(
    "data-ofb-dragging",
    "true",
  );
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      JSON.stringify(window.miniBuilder.builder.getState()),
    ),
  ).toBe(before);
  await expect(page.getByRole("status")).toHaveText("Move cancelled.");
});

test("empty-slot mini palette offers six types and searches registered components before pending Add", async ({
  page,
}) => {
  await page.goto("/builder.html?empty");
  await page.locator('[data-builder-part="canvas"] .ofb-empty-slot').click();
  const palette = page.getByRole("dialog", {
    name: "Add component",
    exact: true,
  });
  await expect(palette.getByRole("button")).toHaveCount(6);
  await palette
    .getByRole("searchbox", { name: "Search components", exact: true })
    .fill("email");
  await expect(palette.getByRole("button")).toHaveCount(1);
  await palette.getByRole("button", { name: "Add Email", exact: true }).click();
  await expect(palette).toHaveCount(0);
  const settings = page.getByRole("dialog");
  await expect(settings).toBeVisible();
  expect(
    await page.evaluate(
      () => window.miniBuilder.builder.getState().history.past.length,
    ),
  ).toBe(0);
  await settings.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(
    await page.evaluate(
      () => window.miniBuilder.builder.getState().definition.components,
    ),
  ).toEqual([]);
  await expect(
    page.locator('[data-builder-part="canvas"] .ofb-empty-slot'),
  ).toBeFocused();
});
