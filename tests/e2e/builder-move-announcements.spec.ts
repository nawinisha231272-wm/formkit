import { test, expect } from "@playwright/test";
import type {} from "../../apps/playground/builder";

for (const scenario of [
  {
    name: "within a slot",
    target: "Columns / Column 2",
    parent: "contactColumns",
    column: 1,
    position: 2,
    count: 2,
    ids: ["customerType", "email"],
  },
  {
    name: "between slots",
    target: "Company details / Contents",
    parent: "companyDetails",
    position: 2,
    count: 5,
    ids: ["companyName", "email", "taxId", "customerReference", "satisfaction"],
  },
  {
    name: "between columns",
    target: "Columns / Column 1",
    parent: "contactColumns",
    column: 0,
    position: 2,
    count: 3,
    ids: ["fullName", "email", "phone"],
  },
])
  test(`move ${scenario.name} announces the exact destination position and count`, async ({
    page,
  }) => {
    await page.goto("/builder.html?approved");
    const field = page.locator('#canvas [data-field-id="email"]');
    const live = page.locator("#diagnostics");
    const before = await page.evaluate(() =>
      JSON.stringify(window.miniBuilder.builder.getState().definition),
    );
    await field.focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("Home");
    const destination = `Email, ${scenario.target}, position ${scenario.position} of ${scenario.count}.`;
    // Walk the public keyboard drop targets rather than dispatching a command directly.
    for (let position = 0; position < 64; position++) {
      if ((await live.textContent()) === destination) break;
      await page.keyboard.press("ArrowDown");
    }
    await expect(live).toHaveText(destination);
    await page.keyboard.press("Enter");
    const moved = `Moved Email into ${scenario.target}, position ${scenario.position} of ${scenario.count}.`;
    await expect(live).toHaveText(moved);
    await expect(page.locator(".of-builder-toast")).toHaveText(moved);
    const ids = await page.evaluate(
      ({ parent, column }) => {
        const panels =
          window.miniBuilder.builder.getState().definition.components[0]!
            .components!;
        const node = panels
          .flatMap((panel) => [panel, ...(panel.components ?? [])])
          .find((node) => node.id === parent)!;
        return (
          column === undefined
            ? node.components!
            : node.columns![column]!.components
        ).map((node) => node.id);
      },
      {
        parent: scenario.parent,
        column: "column" in scenario ? scenario.column : undefined,
      },
    );
    expect(ids).toEqual(scenario.ids);
    await page.keyboard.press("ControlOrMeta+z");
    await expect(live).toHaveText("Undid move of Email");
    expect(
      await page.evaluate(() =>
        JSON.stringify(window.miniBuilder.builder.getState().definition),
      ),
    ).toBe(before);
    await page.keyboard.press("ControlOrMeta+Shift+z");
    await expect(live).toHaveText("Redid move of Email");
  });
