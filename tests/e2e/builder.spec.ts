import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type {} from "../../apps/playground/builder";

test("registry palette and generated Rating/native editors drive JSON, preview, patches and history", async ({
  page,
}) => {
  await page.goto("/builder.html");
  await expect(page.locator('#palette [data-type="rating"]')).toHaveText(
    "Rating",
  );
  await expect(page.locator('#palette [data-type="employee"]')).toHaveText(
    "Employee lookup",
  );
  const max = page.getByLabel("Number of stars", { exact: true });
  await max.fill("7");
  await max.press("Tab");
  await expect(
    page.getByRole("button", { name: "7 of 7 stars" }),
  ).toBeVisible();
  await expect(page.locator("#builder-patch")).toContainText('"op": "replace"');
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "5 of 5 stars" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "7 of 7 stars" }),
  ).toBeVisible();
  await page.locator('#palette [data-type="employee"]').click();
  const placeholder = page.getByLabel("Search placeholder", { exact: true });
  await placeholder.fill("Find your colleague");
  await placeholder.press("Tab");
  await expect(page.getByPlaceholder("Find your colleague")).toBeVisible();
  await page.getByRole("button", { name: "Choose Ana" }).click();
  await page.locator('#preview input[type="search"]').press("Tab");
  const nativeState = await page.evaluate(() => {
    const id = window.miniBuilder.builder.getState().selection!;
    return window.miniBuilder.preview!.session.getFieldState(id);
  });
  expect(nativeState.value).toBe("e1");
  expect(nativeState.touched).toBe(true);
  const disabled = page.getByLabel("Disabled when", { exact: true });
  await disabled.fill("true");
  await disabled.press("Tab");
  await expect(page.locator('#preview input[type="search"]')).toBeDisabled();
  await page.getByRole("button", { name: "Remove selected field" }).click();
  await expect(page.locator('#preview input[type="search"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator('#preview input[type="search"]')).toBeDisabled();
  const result = await new AxeBuilder({ page }).analyze();
  expect(
    result.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
});

test("invalid authoring edits preserve schema/history/data and accessible labels reach portable and native controls", async ({
  page,
}) => {
  await page.goto("/builder.html");
  await page.locator('#preview input[type="text"]').fill("Ana");
  const before = await page.evaluate(() =>
    JSON.stringify(window.miniBuilder.builder.getState().definition),
  );
  const key = page.getByLabel("Data key", { exact: true });
  await key.fill("name");
  await key.press("Tab");
  await expect(page.locator("#diagnostics")).toContainText("Duplicate key");
  expect(
    await page.evaluate(() =>
      JSON.stringify(window.miniBuilder.builder.getState().definition),
    ),
  ).toBe(before);
  await expect(page.locator('#preview input[type="text"]')).toHaveValue("Ana");
  await page.locator('#canvas [data-id="cmp_name"]').click();
  const label = page.getByLabel("Accessible label", { exact: true });
  await label.fill("Customer full name");
  await label.press("Tab");
  await expect(
    page.locator('#preview input[type="text"]'),
  ).toHaveAccessibleName("Customer full name");
  await expect(page.locator('#preview input[type="text"]')).toHaveValue("Ana");
  await page.locator('#palette [data-type="employee"]').click();
  await label.fill("Assigned colleague");
  await label.press("Tab");
  await expect(
    page.locator('#preview input[type="search"]'),
  ).toHaveAccessibleName("Assigned colleague");
});

test("all preview themes preserve focused native typing, caret and complete session state", async ({
  page,
}) => {
  await page.goto("/builder.html");
  await page.locator('#palette [data-type="employee"]').click();
  const input = page.locator('#preview input[type="search"]');
  await input.fill("abcd");
  await input.press("ArrowLeft");
  const result = await page.evaluate(() => {
    const form = window.miniBuilder.preview!;
    const input = document.querySelector<HTMLInputElement>(
      '#preview input[type="search"]',
    )!;
    const data = JSON.stringify(form.session.getData());
    const state = JSON.stringify(
      form.session.form.nodes.map((n) => form.session.getFieldState(n.node.id)),
    );
    const appearance = document.getElementById(
      "builder-theme",
    ) as HTMLSelectElement;
    for (const theme of ["bootstrap4", "bootstrap5", "tailwind", "base"]) {
      appearance.value = theme;
      appearance.dispatchEvent(new Event("change"));
    }
    return {
      stable: input === document.querySelector('#preview input[type="search"]'),
      focus: input === document.activeElement,
      caret: input.selectionStart,
      query: input.value,
      data: data === JSON.stringify(form.session.getData()),
      state:
        state ===
        JSON.stringify(
          form.session.form.nodes.map((n) =>
            form.session.getFieldState(n.node.id),
          ),
        ),
    };
  });
  expect(result).toEqual({
    stable: true,
    focus: true,
    caret: 3,
    query: "abcd",
    data: true,
    state: true,
  });
});

test("offline runtime: native builder editing and client validation/submission need no backend or licensing endpoint", async ({
  page,
  context,
}) => {
  const external: string[] = [];
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (["127.0.0.1", "localhost"].includes(url.hostname))
      return route.continue();
    external.push(url.origin);
    return route.abort();
  });
  await page.goto("/builder.html");
  await expect(
    page.getByRole("button", { name: "4 of 5 stars" }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.getByRole("button", { name: "Submit preview" }).click();
  await expect(page.locator("#builder-result")).toContainText('"ok": false');
  await page.getByLabel("Name", { exact: true }).fill("Offline user");
  await page.getByRole("button", { name: "4 of 5 stars" }).click();
  await page.locator('#palette [data-type="employee"]').click();
  await page.getByRole("button", { name: "Choose Ana" }).click();
  await page.locator("#builder-theme").selectOption("bootstrap4");
  await page.getByRole("button", { name: "Submit preview" }).click();
  await expect(page.locator("#builder-result")).toContainText('"ok": true');
  await expect(page.locator("#builder-result")).toContainText(
    '"employee_lookup": "e1"',
  );
  expect(external).toEqual([]);
});

test("mini builder remains usable at a phone width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/builder.html");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator('#palette [data-type="rating"]').click();
  await expect(page.getByLabel("Number of stars")).toBeVisible();
});

test("base placeholder, required validation and hidden editors affect the shared preview", async ({
  page,
}) => {
  await page.goto("/builder.html");
  await page.locator('#canvas [data-id="cmp_name"]').click();
  const placeholder = page.getByLabel("Placeholder", { exact: true });
  await placeholder.fill("Your full name");
  await placeholder.press("Tab");
  await expect(page.getByPlaceholder("Your full name")).toBeVisible();
  await page.getByLabel("Hidden", { exact: true }).check();
  await expect(page.getByPlaceholder("Your full name")).toBeHidden();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByPlaceholder("Your full name")).toBeVisible();
  await page.getByLabel("Required", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Submit preview" }).click();
  await expect(page.locator("#builder-result")).toContainText('"ok": true');
});
