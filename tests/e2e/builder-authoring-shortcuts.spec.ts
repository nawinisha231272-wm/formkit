import { expect, test } from "@playwright/test";
import type {} from "../../apps/playground/builder";

test("inline label edit is one command, preserves the key and supports keyboard cancel", async ({
  page,
}) => {
  await page.goto("/builder.html?approved&settingsPreload=none");
  const field = page.locator('#canvas [data-field-id="email"]');
  const label = field.locator(":scope > .of-label");
  const before = await page.evaluate(() =>
    JSON.stringify(window.miniBuilder.builder.getState().definition),
  );
  await label.dblclick();
  const input = field.getByRole("textbox", { name: "Edit label", exact: true });
  await expect(input).toBeFocused();
  await input.fill("Work email");
  await input.press("Enter");
  await expect(field.locator('[id="design-email_label"]')).toContainText(
    "Work email",
  );
  const state = await page.evaluate(() => {
    const builder = window.miniBuilder.builder;
    const node = builder
      .getState()
      .definition.components.flatMap(
        function walk(component): (typeof component)[] {
          return [
            component,
            ...(component.components ?? []).flatMap(walk),
            ...(component.columns ?? []).flatMap((column) =>
              column.components.flatMap(walk),
            ),
          ];
        },
      )
      .find((component) => component.id === "email")!;
    return {
      label: node.label,
      key: node.key,
      history: builder.getState().history.past.length,
    };
  });
  expect(state).toEqual({ label: "Work email", key: "email", history: 1 });

  await field.focus();
  await page.keyboard.press("Shift+F2");
  await expect(input).toBeFocused();
  await input.fill("Cancelled");
  await input.press("Escape");
  await expect(field.locator('[id="design-email_label"]')).toContainText(
    "Work email",
  );

  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect(
    await page.evaluate(() =>
      JSON.stringify(window.miniBuilder.builder.getState().definition),
    ),
  ).toBe(before);
});

test("a translated label opens generated Settings instead of overwriting the message key", async ({
  page,
}) => {
  await page.goto("/builder.html?approved&settingsPreload=none");
  await page.evaluate(() => {
    const controller = window.nestedBuilder;
    const definition = structuredClone(
      controller.builder.getState().definition,
    );
    const walk = (nodes: typeof definition.components): void => {
      for (const node of nodes) {
        if (node.id === "email") node.labelKey = "ofb.edit";
        walk(node.components ?? []);
        for (const column of node.columns ?? []) walk(column.components);
      }
    };
    walk(definition.components);
    controller.load(definition);
  });
  const field = page.locator('#canvas [data-field-id="email"]');
  await field.locator(":scope > .of-label").dblclick();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(field.getByRole("textbox", { name: "Edit label" })).toHaveCount(
    0,
  );
  await expect(
    page.getByLabel("Label message key", { exact: true }),
  ).toHaveValue("ofb.edit");
});

test("precise quick-add is lazy, filters by the destination slot and inserts at its exact index", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/builder.html?approved&settingsPreload=none");
  const marker = page.locator(
    '#canvas [data-field-id="fullName"] > .ofb-quick-add[data-drop-slot="column_0"][data-drop-index="0"]',
  );
  await page.locator('#canvas [data-field-id="fullName"]').hover();
  await marker.click();
  const popup = page.getByRole("dialog", {
    name: "Add component",
    exact: true,
  });
  await expect(
    popup.getByRole("searchbox", { name: "Search components" }),
  ).toBeFocused();
  expect(requests.some((url) => url.includes("quick-add"))).toBe(true);
  await expect(
    popup.getByRole("button", { name: "Add Text", exact: true }),
  ).toBeVisible();
  await expect(popup.getByRole("button", { name: "Add Panel" })).toHaveCount(0);
  await popup.getByRole("button", { name: "Add Text", exact: true }).click();
  const settings = page.getByRole("dialog");
  await settings.getByLabel("Label", { exact: true }).fill("First in column");
  await settings.getByRole("button", { name: "Save", exact: true }).click();
  const column = await page.evaluate(() => {
    const definition = window.miniBuilder.builder.getState().definition;
    const walk = (
      nodes: typeof definition.components,
    ): (typeof nodes)[number][] =>
      nodes.flatMap((node) => [
        node,
        ...walk(node.components ?? []),
        ...(node.columns ?? []).flatMap((item) => walk(item.components)),
      ]);
    const columns = walk(definition.components).find(
      (node) => node.type === "columns",
    )!;
    return columns.columns?.[0]?.components.map((node) => node.label);
  });
  expect(column?.[0]).toBe("First in column");
});
