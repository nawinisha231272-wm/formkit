import { test, expect } from "@playwright/test";

for (const theme of [
  "base",
  "bootstrap4",
  "bootstrap5",
  "tailwind",
  "material",
])
  test(`${theme}: quick-add stays in the gutter and does not intercept caption editing`, async ({
    page,
  }) => {
    await page.goto(
      `/builder.html?approved&settingsPreload=none&theme=${theme}`,
    );
    const field = page.locator('#canvas [data-field-id="email"]');
    await field.hover();
    const marker = field.locator(
      ':scope > .ofb-quick-add[data-drop-index="0"]',
    );
    await expect(marker).toBeVisible();
    const label = field.locator(":scope > .of-label");
    const a = (await marker.boundingBox())!,
      b = (await label.boundingBox())!;
    expect(
      a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y,
    ).toBe(false);
    await label.dblclick();
    await expect(
      field.getByRole("textbox", { name: "Edit label", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(
      field.getByRole("textbox", { name: "Edit label", exact: true }),
    ).toHaveCount(0);
  });
