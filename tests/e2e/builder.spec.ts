import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type {} from "../../apps/playground/builder";
const mode = (page: Page, name: string) =>
  page.getByRole("tab", { name, exact: true }).click();
async function edit(page: Page, group = "Display") {
  await mode(page, "Build");
  await page
    .getByRole("button", { name: "Edit settings", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  if (group !== "Display")
    await dialog.getByRole("tab", { name: group, exact: true }).click();
  return dialog;
}
async function save(page: Page) {
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

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
  let dialog = await edit(page);
  await dialog.getByLabel("Number of stars", { exact: true }).fill("7");
  await expect(
    dialog.getByRole("button", { name: "7 of 7 stars" }),
  ).toBeVisible();
  await save(page);
  await mode(page, "Preview");
  await expect(
    page.locator("#preview").getByRole("button", { name: "7 of 7 stars" }),
  ).toBeVisible();
  await mode(page, "JSON");
  await expect(page.locator("#builder-patch")).toContainText('"op": "replace"');
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await mode(page, "Preview");
  await expect(
    page.locator("#preview").getByRole("button", { name: "5 of 5 stars" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(
    page.locator("#preview").getByRole("button", { name: "7 of 7 stars" }),
  ).toBeVisible();
  await mode(page, "Build");
  await page.locator('#palette [data-type="employee"]').click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Search placeholder", { exact: true })
    .fill("Find your colleague");
  await expect(dialog.getByPlaceholder("Find your colleague")).toBeVisible();
  await save(page);
  await mode(page, "Preview");
  await expect(page.getByPlaceholder("Find your colleague")).toBeVisible();
  await page
    .locator("#preview")
    .getByRole("button", { name: "Choose Ana" })
    .click();
  await page.locator('#preview input[type="search"]').press("Tab");
  const nativeState = await page.evaluate(() =>
    window.miniBuilder.preview!.session.getFieldState(
      window.miniBuilder.builder.getState().selection!,
    ),
  );
  expect(nativeState.value).toBe("e1");
  expect(nativeState.touched).toBe(true);
  dialog = await edit(page, "Conditional");
  await dialog.getByLabel("Disabled when", { exact: true }).fill("true");
  await save(page);
  await mode(page, "Preview");
  await expect(page.locator('#preview input[type="search"]')).toBeDisabled();
  await mode(page, "Build");
  await page
    .locator('#canvas [data-of-selected="true"]>.ofb-component-toolbar')
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.locator('#preview input[type="search"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await mode(page, "Preview");
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
  await mode(page, "Preview");
  await page.locator('#preview input[type="text"]').fill("Ana");
  const before = await page.evaluate(() =>
    JSON.stringify(window.miniBuilder.builder.getState()),
  );
  let dialog = await edit(page, "Data");
  await dialog.getByLabel("Data key", { exact: true }).fill("name");
  await expect(dialog.locator(".ofb-editor-error")).toContainText(
    "Duplicate key",
  );
  expect(
    await page.evaluate(() =>
      JSON.stringify(window.miniBuilder.builder.getState()),
    ),
  ).toBe(before);
  await expect(page.locator('#preview input[type="text"]')).toHaveValue("Ana");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.locator('#canvas [data-field-id="cmp_name"]').click();
  dialog = await edit(page, "Accessibility");
  await dialog
    .getByLabel("Accessible label", { exact: true })
    .fill("Customer full name");
  await save(page);
  await mode(page, "Preview");
  await expect(
    page.locator('#preview input[type="text"]'),
  ).toHaveAccessibleName("Customer full name");
  await expect(page.locator('#preview input[type="text"]')).toHaveValue("Ana");
  await mode(page, "Build");
  await page.locator('#palette [data-type="employee"]').click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("tab", { name: "Accessibility", exact: true }).click();
  await dialog
    .getByLabel("Accessible label", { exact: true })
    .fill("Assigned colleague");
  await save(page);
  await mode(page, "Preview");
  await expect(
    page.locator('#preview input[type="search"]'),
  ).toHaveAccessibleName("Assigned colleague");
});

test("all preview themes preserve focused native typing, caret and complete session state", async ({
  page,
}) => {
  await page.goto("/builder.html");
  await page.locator('#palette [data-type="employee"]').click();
  await save(page);
  await mode(page, "Preview");
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
    for (const theme of [
      "bootstrap4",
      "bootstrap5",
      "tailwind",
      "material",
      "base",
    ]) {
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
  await mode(page, "Preview");
  await expect(
    page.getByRole("button", { name: "4 of 5 stars" }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.getByRole("button", { name: "Submit preview" }).click();
  await expect(page.locator("#builder-result")).toContainText('"ok": false');
  await page
    .locator("#preview")
    .getByLabel("Name", { exact: true })
    .fill("Offline user");
  await page.getByRole("button", { name: "4 of 5 stars" }).click();
  await mode(page, "Build");
  await page.locator('#palette [data-type="employee"]').click();
  await save(page);
  await mode(page, "Preview");
  await page
    .locator("#preview")
    .getByRole("button", { name: "Choose Ana" })
    .click();
  await page.locator("#builder-theme").selectOption("bootstrap4");
  await page.getByRole("button", { name: "Submit preview" }).click();
  await expect(page.locator("#builder-result")).toContainText('"ok": true');
  await expect(page.locator("#builder-result")).toContainText(
    '"employeeLookup": "e1"',
  );
  expect(external).toEqual([]);
});

// Spec 10 supersedes the harness's phone editor: small screens expose a read-only preview.
test("phone widths retain usable, accessible form content without exposing the editing UI", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/builder.html");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("tab", { name: "Build", exact: true }),
  ).toBeDisabled();
  await expect(page.locator("#palette")).toBeHidden();
  await expect(page.locator('#preview input[type="text"]')).toBeVisible();
  await expect(page.locator('#preview input[type="text"]')).toHaveAttribute(
    "readonly",
    "",
  );
  await expect(
    page.locator('#preview input[type="text"]'),
  ).toHaveAccessibleName("Name");
});

test("base placeholder, required validation and hidden editors affect the shared preview", async ({
  page,
}) => {
  await page.goto("/builder.html");
  await page.locator('#canvas [data-field-id="cmp_name"]').click();
  let dialog = await edit(page);
  await dialog
    .getByLabel("Placeholder", { exact: true })
    .fill("Your full name");
  await save(page);
  await mode(page, "Preview");
  await expect(page.getByPlaceholder("Your full name")).toBeVisible();
  dialog = await edit(page);
  await dialog.getByLabel("Hidden", { exact: true }).check();
  await save(page);
  await mode(page, "Preview");
  await expect(page.getByPlaceholder("Your full name")).toBeHidden();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByPlaceholder("Your full name")).toBeVisible();
  dialog = await edit(page, "Validation");
  await dialog.getByLabel("Required", { exact: true }).uncheck();
  await save(page);
  await mode(page, "Preview");
  await page.getByRole("button", { name: "Submit preview" }).click();
  await expect(page.locator("#builder-result")).toContainText('"ok": true');
});
