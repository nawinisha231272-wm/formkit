import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import type {} from "../../apps/playground/builder";

const row = (page: Page, id: string) =>
  page.locator(`.of-builder-outline [role=treeitem][data-drag-id="${id}"]`);
const schema = (page: Page) =>
  page.evaluate(() =>
    JSON.stringify(window.miniBuilder.builder.getState().definition),
  );
const selected = (page: Page) =>
  page
    .locator(
      ".of-builder-outline [role=treeitem][data-drag-id][aria-selected=true]",
    )
    .evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLElement).dataset.dragId!),
    );
async function selectPair(page: Page) {
  await row(page, "email").focus();
  await page.keyboard.press("Shift+ArrowDown");
  expect(await selected(page)).toEqual(["email", "customerType"]);
}
async function action(page: Page, label: string) {
  await page.keyboard.press("ControlOrMeta+k");
  const frame = page.getByRole("dialog", { name: "Commands", exact: true });
  await frame.getByRole("searchbox").fill(label);
  await frame
    .getByRole("button", { name: `${label} 2 components`, exact: true })
    .click();
}

test("Duplicate targets the whole focused selection and undo/redo restore both selection snapshots", async ({
  page,
}) => {
  await page.goto("/builder.html?approved&settingsPreload=none");
  const before = await schema(page);
  await selectPair(page);
  await page.keyboard.press("ControlOrMeta+d");
  const after = await schema(page);
  expect(after).not.toBe(before);
  const ids = await selected(page);
  expect(ids).toHaveLength(2);
  expect(ids).not.toContain("email");
  expect(ids).not.toContain("customerType");
  expect(
    await page.evaluate(
      () => window.miniBuilder.builder.getState().history.past.length,
    ),
  ).toBe(1);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect(await schema(page)).toBe(before);
  expect(await selected(page)).toEqual(["email", "customerType"]);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  expect(await schema(page)).toBe(after);
  expect(await selected(page)).toEqual(ids);
});

test("first multi-Copy writes synchronously and Paste inserts the ordered set in a chosen column", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText(text: string) {
          (window as Window & { copied?: string }).copied = text;
          return Promise.resolve();
        },
      },
    });
  });
  await page.goto("/builder.html?approved&settingsPreload=none");
  await selectPair(page);
  await page.keyboard.press("ControlOrMeta+c");
  expect(
    await page.evaluate(() =>
      JSON.parse((window as Window & { copied?: string }).copied!).map(
        (node: { id: string }) => node.id,
      ),
    ),
  ).toEqual(["email", "customerType"]);
  expect(
    await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .some((entry) => entry.name.includes("secondary-tools")),
    ),
  ).toBe(false);
  const before = await schema(page);
  await row(page, "fullName").focus();
  await page.keyboard.press("ControlOrMeta+v");
  const columns = await page.evaluate(
    () =>
      window.miniBuilder.builder.getState().definition.components[0]!
        .components![0]!.components![0]!.columns!,
  );
  expect(columns[0]!.components.slice(1, 3).map((node) => node.label)).toEqual([
    "Email",
    "Customer type",
  ]);
  expect(await selected(page)).toEqual(
    columns[0]!.components.slice(1, 3).map((node) => node.id),
  );
  expect(columns[1]!.components.map((node) => node.id)).toEqual([
    "email",
    "customerType",
  ]);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect(await schema(page)).toBe(before);
});

test("Cut captures the original selection across focus changes and moves it atomically between columns", async ({
  page,
}) => {
  await page.goto("/builder.html?approved&settingsPreload=none");
  const before = await schema(page);
  await selectPair(page);
  await page.keyboard.press("ControlOrMeta+x");
  await row(page, "fullName").focus();
  await page.keyboard.press("ControlOrMeta+v");
  const columns = await page.evaluate(
    () =>
      window.miniBuilder.builder.getState().definition.components[0]!
        .components![0]!.components![0]!.columns!,
  );
  expect(
    columns.map((column) => column.components.map((node) => node.id)),
  ).toEqual([["fullName", "email", "customerType", "phone"], []]);
  expect(await selected(page)).toEqual(["email", "customerType"]);
  expect(
    await page.evaluate(
      () => window.miniBuilder.builder.getState().history.past.length,
    ),
  ).toBe(1);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect(await schema(page)).toBe(before);
  expect(await selected(page)).toEqual(["fullName"]);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  expect(await selected(page)).toEqual(["email", "customerType"]);
});

test("command-bar Wrap retains both ordered siblings in one wrapper and one undo step", async ({
  page,
}) => {
  await page.goto("/builder.html?approved&settingsPreload=none");
  const before = await schema(page);
  await selectPair(page);
  await action(page, "Wrap in layout");
  const column = await page.evaluate(
    () =>
      window.miniBuilder.builder.getState().definition.components[0]!
        .components![0]!.components![0]!.columns![1]!,
  );
  expect(column.components).toHaveLength(1);
  expect(column.components[0]!.type).toBe("panel");
  expect(column.components[0]!.components!.map((node) => node.id)).toEqual([
    "email",
    "customerType",
  ]);
  expect(await selected(page)).toEqual([column.components[0]!.id]);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect(await schema(page)).toBe(before);
  expect(await selected(page)).toEqual(["email", "customerType"]);
});

test("bulk Required edits the exact set and retains selection through undo and redo", async ({
  page,
}) => {
  await page.goto("/builder.html?approved&settingsPreload=none");
  const before = await schema(page);
  await selectPair(page);
  await action(page, "Required");
  const fields = await page.evaluate(
    () =>
      window.miniBuilder.builder.getState().definition.components[0]!
        .components![0]!.components![0]!.columns![1]!.components,
  );
  expect(fields.map((node) => node.validation?.required)).toEqual([true, true]);
  expect(await selected(page)).toEqual(["email", "customerType"]);
  const after = await schema(page);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect(await schema(page)).toBe(before);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  expect(await schema(page)).toBe(after);
  expect(await selected(page)).toEqual(["email", "customerType"]);
});

test("cancelling any before-delete event refuses the whole selection without history", async ({
  page,
}) => {
  await page.goto("/builder.html?approved&settingsPreload=none");
  const before = await schema(page);
  await page.evaluate(() =>
    document
      .getElementById("builder")!
      .addEventListener("of-before-delete", (event) => {
        if ((event as CustomEvent).detail.componentId === "email")
          event.preventDefault();
      }),
  );
  await selectPair(page);
  await page.keyboard.press("Delete");
  expect(await schema(page)).toBe(before);
  expect(
    await page.evaluate(
      () => window.miniBuilder.builder.getState().history.past.length,
    ),
  ).toBe(0);
  await expect(page.locator(".of-builder-status")).toHaveText(
    "delete-cancelled: Deletion cancelled by your app.",
  );
  expect(await selected(page)).toEqual(["email", "customerType"]);
});

test("bulk keyboard Move moves the whole block one sibling and preserves its selection", async ({
  page,
}) => {
  await page.goto("/builder.html?empty&settingsPreload=none");
  await page.evaluate(() =>
    window.nestedBuilder.load({
      $formVersion: "1.0",
      id: "move-block",
      display: "form",
      components: ["a", "b", "c", "d"].map((id) => ({
        id,
        type: "text",
        key: id,
        label: id,
      })),
    }),
  );
  await row(page, "b").focus();
  await page.keyboard.press("Shift+ArrowDown");
  const before = await schema(page);
  await page.keyboard.press("Alt+ArrowDown");
  expect(
    await page.evaluate(() =>
      window.miniBuilder.builder
        .getState()
        .definition.components.map((node) => node.id),
    ),
  ).toEqual(["a", "d", "b", "c"]);
  expect(await selected(page)).toEqual(["b", "c"]);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect(await schema(page)).toBe(before);
  expect(await selected(page)).toEqual(["b", "c"]);
  await row(page, "b").focus();
  await page.keyboard.press("Shift+ArrowDown");
  await page.keyboard.press("Alt+ArrowUp");
  expect(
    await page.evaluate(() =>
      window.miniBuilder.builder
        .getState()
        .definition.components.map((node) => node.id),
    ),
  ).toEqual(["b", "c", "a", "d"]);
});

test("bulk cross-scope Cut/Paste refuses the whole set without modifying history or selection", async ({
  page,
}) => {
  await page.goto("/builder.html?approved&settingsPreload=none");
  const before = await schema(page);
  await selectPair(page);
  await page.keyboard.press("ControlOrMeta+x");
  await row(page, "companyScope").focus();
  await page.keyboard.press("ControlOrMeta+v");
  expect(await schema(page)).toBe(before);
  expect(await selected(page)).toEqual(["companyScope"]);
  await expect(page.locator(".of-builder-status")).toContainText(
    "all selected components must stay in the same data scope",
  );
  expect(
    await page.evaluate(
      () => window.miniBuilder.builder.getState().history.past.length,
    ),
  ).toBe(0);
});

test("bulk property edit includes both a selected ancestor and descendant while Required refuses the unsupported layout", async ({
  page,
}) => {
  await page.goto("/builder.html?empty&settingsPreload=none");
  await page.evaluate(() =>
    window.nestedBuilder.load({
      $formVersion: "1.0",
      id: "ancestor-properties",
      display: "form",
      components: [
        {
          id: "parent",
          type: "panel",
          label: "Parent",
          components: [
            { id: "child", type: "text", key: "child", label: "Child" },
          ],
        },
      ],
    }),
  );
  await row(page, "parent").focus();
  await page.keyboard.press("Shift+ArrowDown");
  const before = await schema(page);
  await action(page, "Required");
  await expect(page.locator(".of-builder-status")).toHaveText(
    "A selected component does not support this property.",
  );
  expect(await schema(page)).toBe(before);
  await action(page, "Edit");
  const editor = page.getByRole("dialog", {
    name: "Edit selected components",
    exact: true,
  });
  await editor
    .getByLabel("Description", { exact: true })
    .fill("Both exact members");
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  expect(
    await page.evaluate(() => {
      const node =
        window.miniBuilder.builder.getState().definition.components[0]!;
      return [node.description, node.components![0]!.description];
    }),
  ).toEqual(["Both exact members", "Both exact members"]);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect(await schema(page)).toBe(before);
  expect(await selected(page)).toEqual(["parent", "child"]);
});

test("locked bulk refusal names its members and offers Deselect locked components", async ({
  page,
}) => {
  await page.goto("/builder.html?locks&settingsPreload=none");
  const before = await schema(page);
  await row(page, "cmp_name").focus();
  await page.keyboard.press("Shift+ArrowDown");
  await page.keyboard.press("Delete");
  expect(await schema(page)).toBe(before);
  await expect(page.locator(".of-builder-toast")).toContainText(
    "Name, Customer rating",
  );
  await page
    .getByRole("button", { name: "Deselect locked components", exact: true })
    .click();
  expect(await selected(page)).toEqual([]);
  expect(
    await page.evaluate(
      () => window.miniBuilder.builder.getState().history.past.length,
    ),
  ).toBe(0);
});
