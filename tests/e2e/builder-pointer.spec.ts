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

test("outline exposes per-column slots and keyboard paste moves into the selected column with one undo step", async ({
  page,
}) => {
  await page.goto("/builder.html?fixture");
  const tree = page.getByRole("tree", { name: "Outline", exact: true });
  const name = tree.getByRole("treeitem", { name: "Full name", exact: true });
  await name.click();
  await name.press("Control+x");
  const column = tree.getByRole("treeitem", { name: "Column 2", exact: true });
  await column.click();
  await column.press("Enter");
  await column.press("Control+v");
  const values = await page.evaluate(() => {
    const columns =
      window.miniBuilder.builder.getState().definition.components[0]!
        .components![0]!.components![0]!.columns!;
    return columns.map((column) => column.components.map((n) => n.id));
  });
  expect(values).toEqual([[], ["rating", "name"]]);
  expect(
    await page.evaluate(() =>
      window.miniBuilder.builder.getState().history.past.map((c) => c.type),
    ),
  ).toEqual(["MoveComponent"]);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect(
    await page.evaluate(
      () =>
        window.miniBuilder.builder.getState().definition.components[0]!
          .components![0]!.components![0]!.columns![0]!.components[0]!.id,
    ),
  ).toBe("name");
});

test("virtual outline slots collapse and expand by keyboard without editing their owner", async ({
  page,
}) => {
  await page.goto("/builder.html?fixture");
  const column = page.getByRole("treeitem", { name: "Column 2", exact: true });
  const before = await page.evaluate(() =>
    JSON.stringify(window.miniBuilder.builder.getState().definition),
  );
  await column.locator(":scope > .of-builder-tree-name").click();
  await column.press("ArrowLeft");
  await expect(column).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("treeitem", { name: "Experience", exact: true }),
  ).toBeHidden();
  await column.press("ArrowRight");
  await expect(column).toHaveAttribute("aria-expanded", "true");
  await column.press("ArrowRight");
  await expect(
    page.getByRole("treeitem", { name: "Experience", exact: true }),
  ).toBeFocused();
  await column.click({ button: "right" });
  await expect(page.getByRole("menu")).toHaveCount(0);
  await column.press("Delete");
  await expect(page.getByRole("status")).toHaveText(
    "Select a component for this action. You can paste into this slot.",
  );
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
});

test("outline End and Up select the action target before keyboard Copy or Duplicate", async ({
  page,
}) => {
  await page.goto("/builder.html?approved");
  const before = await page.evaluate(() =>
    JSON.stringify(window.miniBuilder.builder.getState().definition),
  );
  for (const action of ["copy-paste", "duplicate"]) {
    await page
      .locator(
        '[role="treeitem"][data-drag-id="email"] > .of-builder-tree-name',
      )
      .click();
    await page.keyboard.press("End");
    await page.keyboard.press("ArrowUp");
    await expect(
      page.locator('[role="treeitem"][data-drag-id="notes"]'),
    ).toBeFocused();
    expect(
      await page.evaluate(
        () => window.miniBuilder.builder.getState().selection,
      ),
    ).toBe("notes");
    if (action === "copy-paste") {
      await page.keyboard.press("ControlOrMeta+c");
      await page.keyboard.press("ControlOrMeta+v");
    } else await page.keyboard.press("ControlOrMeta+d");
    const changed = await page.evaluate(() => ({
      definition: JSON.stringify(
        window.miniBuilder.builder.getState().definition,
      ),
      steps: window.miniBuilder.builder.getState().history.past.length,
    }));
    expect(changed.steps).toBe(1);
    expect(changed.definition.match(/"label":"Notes"/g)).toHaveLength(2);
    expect(
      changed.definition.match(/"type":"acme.customer-reference"/g),
    ).toHaveLength(1);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    expect(
      await page.evaluate(() =>
        JSON.stringify(window.miniBuilder.builder.getState().definition),
      ),
    ).toBe(before);
  }
});
