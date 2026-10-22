import { test, expect } from "@playwright/test";
import type { Page, Locator } from "@playwright/test";

// Exercise the actual Pointer Events pickup and drop path.
async function mouseDrag(
  page: Page,
  source: Locator,
  target: Locator,
): Promise<void> {
  await source.hover();
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error("Drag endpoints must be visible.");
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("Drag tests require a bounded viewport.");
  for (const [name, box] of [
    ["source", from],
    ["target", to],
  ] as const)
    expect(
      box.x >= 0 &&
        box.y >= 0 &&
        box.x + box.width <= viewport.width &&
        box.y + box.height <= viewport.height,
      `${name} must stay on screen after hovering the palette`,
    ).toBe(true);
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 8, from.y + from.height / 2, {
    steps: 3,
  });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
    steps: 12,
  });
  await page.mouse.move(to.x + to.width / 2 + 1, to.y + to.height / 2);
  await page.mouse.up();
}

import AxeBuilder from "@axe-core/playwright";
import type {} from "../../apps/playground/builder";

async function save(page: Page) {
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
const mode = (page: Page, name: string) =>
  page.getByRole("tab", { name, exact: true }).click();

test("mouse drag builds four levels in declared slots with zero container-specific builder code", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1200 });
  await page.goto("/builder.html?empty");
  async function drag(title: string, type: string, parent = "", slot = "") {
    // Search is a real author action and keeps source and destination visible together.
    await page.getByRole("searchbox").fill(title);
    const source = page.getByRole("button", {
      name: `Add ${title}`,
      exact: true,
    });
    const target = page.locator(
      `#canvas .of-builder-drop[data-drop-parent="${parent}"][data-drop-slot="${slot}"][data-drop-index="0"]`,
    );
    await mouseDrag(page, source, target);
    await save(page);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const state = window.nestedBuilder.builder.getState();
          function find(
            nodes: typeof state.definition.components,
          ): string | undefined {
            for (const node of nodes) {
              if (node.id === state.selection) return node.type;
              const nested = find([
                ...(node.components ?? []),
                ...(node.columns ?? []).flatMap((column) => column.components),
              ]);
              if (nested) return nested;
            }
          }
          return find(state.definition.components);
        }),
      )
      .toBe(type);
    return page.evaluate(
      () => window.nestedBuilder.builder.getState().selection!,
    );
  }
  const tabs = await drag("Tabs", "tabs");
  const panel = await drag("Panel", "panel", tabs, "first");
  const columns = await drag("Columns", "columns", panel, "children");
  await drag("Text", "text", columns, "column_0");
  const definition = await page.evaluate(
    () => window.nestedBuilder.builder.getState().definition,
  );
  expect(definition.components[0]?.type).toBe("tabs");
  expect(definition.components[0]?.components?.[0]?.type).toBe("panel");
  expect(definition.components[0]?.components?.[0]?.components?.[0]?.type).toBe(
    "columns",
  );
  expect(
    definition.components[0]?.components?.[0]?.components?.[0]?.columns?.[0]
      ?.components?.[0]?.type,
  ).toBe("text");
  await mode(page, "Preview");
  await page
    .locator("#preview")
    .getByRole("textbox", { name: "Text", exact: true })
    .fill("Nested answer");
  await page
    .getByRole("button", { name: "Submit preview", exact: true })
    .click();
  await expect(page.locator("#builder-result")).toContainText(
    '"text": "Nested answer"',
  );
  const axe = await new AxeBuilder({ page }).analyze();
  expect(
    axe.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
});

test("keyboard alone adds, configures, cuts into a slot, reparents, deletes and undoes", async ({
  page,
  browserName,
}) => {
  await page.goto("/builder.html?empty");
  const tabKey =
    browserName === "webkit" && process.platform === "darwin"
      ? "Alt+Tab"
      : "Tab";
  async function tabTo(
    locator: import("@playwright/test").Locator,
    backwards = false,
  ) {
    for (let i = 0; i < 180; i++) {
      if (await locator.evaluate((el) => el === el.ownerDocument.activeElement))
        return;
      await page.keyboard.press(backwards ? `Shift+${tabKey}` : tabKey);
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve()),
          ),
      );
    }
    throw new Error(
      `Keyboard could not reach ${await locator.getAttribute("aria-label")}`,
    );
  }
  for (const title of ["Tabs", "Panel", "Columns", "Text"]) {
    const add = page.getByRole("button", { name: `Add ${title}`, exact: true });
    await tabTo(add, title !== "Tabs");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("ControlOrMeta+Enter");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  const field = page.getByRole("treeitem", { name: "Text", exact: true });
  await tabTo(field);
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("dialog").getByLabel("Label", { exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("Keyboard answer");
  await page.keyboard.press("ControlOrMeta+Enter");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const renamed = page.getByRole("treeitem", {
    name: "Keyboard answer",
    exact: true,
  });
  await tabTo(renamed);
  await page.keyboard.press("ControlOrMeta+x");
  const second = page.getByRole("treeitem", {
    name: "Second tab",
    exact: true,
  });
  // Arrow navigation reaches virtual slots, including the inactive tab's slot.
  for (
    let step = 0;
    step < 30 &&
    !(await second.evaluate((el) => el === el.ownerDocument.activeElement));
    step++
  )
    await page.keyboard.press("ArrowDown");
  await expect(second).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ControlOrMeta+v");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.nestedBuilder.builder
            .getState()
            .definition.components[0]?.components?.at(-1)?.slot,
      ),
    )
    .toBe("second");
  // The outline precedes the canvas; Shift+Tab avoids leaving the document into browser chrome.
  await tabTo(renamed, true);
  await page.keyboard.press("Alt+ArrowLeft");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.nestedBuilder.builder.getState().definition.components[1]
            ?.label,
      ),
    )
    .toBe("Keyboard answer");
  await page.keyboard.press("Alt+ArrowRight");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.nestedBuilder.builder.getState().definition.components.length,
      ),
    )
    .toBe(1);
  await page.keyboard.press("Delete");
  await expect(renamed).toHaveCount(0);
  await page.keyboard.press("ControlOrMeta+z");
  await expect(renamed).toBeVisible();
  const types = await page.evaluate(() => {
    const n = window.nestedBuilder.builder.getState().definition.components[0]!;
    return [
      n.type,
      n.components![0]!.type,
      n.components![0]!.components![0]!.type,
    ];
  });
  expect(types).toEqual(["tabs", "panel", "columns"]);
});

test("illegal generic slot drops are visible and atomic; theme preserves authoring controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1200 });
  await page.goto("/builder.html?empty&demos");
  await page.getByRole("button", { name: "Add SDK card", exact: true }).click();
  await save(page);
  const state = () =>
    page.evaluate(() =>
      JSON.stringify(window.nestedBuilder.builder.getState()),
    );
  const id = await page.evaluate(
    () => window.nestedBuilder.builder.getState().selection!,
  );
  const slot = page.locator(
    `#canvas .of-builder-drop[data-drop-parent="${id}"][data-drop-slot="body"][data-drop-index="0"]`,
  );
  const before = await state();
  await page.getByRole("searchbox").fill("Panel");
  await mouseDrag(
    page,
    page.getByRole("button", { name: "Add Panel", exact: true }),
    slot,
  );
  await expect(page.locator("#diagnostics")).toContainText(
    "does not accept Panel",
  );
  expect(await state()).toBe(before);
  await page.getByRole("searchbox").fill("");
  await slot.click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Add Text", exact: true }).click();
  await save(page);
  await page.getByRole("button", { name: "Add Text", exact: true }).click();
  await save(page);
  const full = await state();
  await page.getByRole("button", { name: "Add Text", exact: true }).click();
  await expect(page.locator("#diagnostics")).toContainText("slot-capacity");
  expect(await state()).toBe(full);
  const handle = page.locator(`#canvas .of-builder-handle[data-id="${id}"]`);
  await page
    .locator(`[role="treeitem"][data-drag-id="${id}"] > .of-builder-tree-name`)
    .click();
  await handle.focus();
  await expect(handle).toBeFocused();
  const original = await handle.elementHandle();
  await page.evaluate(() => window.nestedBuilder.setTheme("bootstrap5"));
  await expect(handle).toBeFocused();
  expect(await handle.evaluate((el, old) => el === old, original)).toBe(true);
});

test("JSON import and generated expression rows commit replayable changes; invalid input is atomic", async ({
  page,
}) => {
  await page.goto("/builder.html?fixture");
  await mode(page, "JSON");
  const json = page.locator("#builder-json");
  const before = await page.evaluate(() =>
    JSON.stringify(window.nestedBuilder.builder.getState()),
  );
  await json.fill("{bad");
  await page.getByRole("button", { name: "Apply JSON", exact: true }).click();
  await expect(page.locator("#diagnostics")).toContainText(
    "Enter a valid form definition",
  );
  expect(
    await page.evaluate(() =>
      JSON.stringify(window.nestedBuilder.builder.getState()),
    ),
  ).toBe(before);
  await mode(page, "Build");
  await page.getByRole("treeitem", { name: "Full name", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit settings", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("tab", { name: "Conditional", exact: true })
    .click();
  const expr = page.locator('[data-expression="visibleWhen"]');
  await expr.locator("summary").click();
  await expr
    .getByRole("button", { name: "Add condition", exact: true })
    .click();
  await expr
    .getByRole("combobox", { name: "Condition field", exact: true })
    .selectOption("email");
  await expr.getByLabel("Comparison value", { exact: true }).fill('"show"');
  await expr
    .getByRole("button", { name: "Apply conditions", exact: true })
    .click();
  await save(page);
  await expect
    .poll(() =>
      page.evaluate(() =>
        JSON.stringify(
          window.nestedBuilder.builder.getState().definition.components[0]
            ?.components?.[0]?.components?.[0]?.columns?.[0]?.components?.[0]
            ?.visibleWhen,
        ),
      ),
    )
    .toBe('["eq",{"ref":"email"},"show"]');
  await expect(page.locator("#builder-patch")).toContainText("visibleWhen");
  const changed = await page.evaluate(() =>
    JSON.stringify(window.nestedBuilder.builder.getState().definition),
  );
  await page
    .getByRole("button", { name: "Edit settings", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("tab", { name: "Conditional", exact: true })
    .click();
  await page.locator('[data-property="visibleWhen"]').fill('["unknown",1]');
  await page.locator('[data-property="visibleWhen"]').dispatchEvent("change");
  await expect(
    page.getByRole("dialog").locator(".ofb-editor-error"),
  ).not.toBeEmpty();
  expect(
    await page.evaluate(() =>
      JSON.stringify(window.nestedBuilder.builder.getState().definition),
    ),
  ).toBe(changed);
});

test("cut/paste refuses descendant cycles and root-only nesting with visible reasons; unknown destination is atomic", async ({
  page,
}) => {
  await page.goto("/builder.html?fixture&demos");
  await page.locator('[data-tree-toggle="tabs"]').click();
  await expect(
    page.getByRole("treeitem", { name: "Customer details", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("treeitem", { name: "Full name", exact: true }),
  ).toBeHidden();
  await page.locator('[data-tree-toggle="tabs"]').click();
  await expect(
    page.getByRole("treeitem", { name: "Full name", exact: true }),
  ).toBeVisible();
  const tabsItem = page.getByRole("treeitem", {
    name: "Customer details",
    exact: true,
  });
  await tabsItem.locator(":scope > .of-builder-tree-name").click();
  await expect(tabsItem).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ControlOrMeta+x");
  await page
    .getByRole("treeitem", { name: "Column 1", exact: true })
    .locator(":scope > .of-builder-tree-name")
    .click();
  const before = await page.evaluate(() =>
    JSON.stringify(window.nestedBuilder.builder.getState()),
  );
  await page.keyboard.press("ControlOrMeta+v");
  await expect(page.locator("#diagnostics")).toContainText(
    "cannot be dropped into itself or a descendant",
  );
  expect(
    await page.evaluate(() =>
      JSON.stringify(window.nestedBuilder.builder.getState()),
    ),
  ).toBe(before);
  await page
    .getByRole("button", { name: "Add Root section", exact: true })
    .click();
  await expect(page.locator("#diagnostics")).toContainText("root-only");
  expect(
    await page.evaluate(() =>
      JSON.stringify(window.nestedBuilder.builder.getState()),
    ),
  ).toBe(before);
  const diagnostics = await page.evaluate(() =>
    window.nestedBuilder.selectSlot({ parentId: "columns", slot: "missing" }),
  );
  expect(diagnostics[0]?.code).toBe("invalid-slot");
  await expect(page.locator("#diagnostics")).toHaveText(
    "Choose an existing slot and insertion position.",
  );
  expect(
    await page.evaluate(() =>
      JSON.stringify(window.nestedBuilder.builder.getState()),
    ),
  ).toBe(before);
});

test("column keyboard paste uses the selected collection, replays changes and restores history", async ({
  page,
  browserName,
}) => {
  await page.goto("/builder.html?empty");
  await page.getByRole("button", { name: "Add Columns", exact: true }).click();
  await save(page);
  const grid = await page.evaluate(
    () => window.nestedBuilder.builder.getState().selection!,
  );
  await page.getByRole("button", { name: "Add Text", exact: true }).click();
  await save(page);
  const id = await page.evaluate(
    () => window.nestedBuilder.builder.getState().selection!,
  );
  const before = await page.evaluate(() =>
    JSON.stringify(window.nestedBuilder.builder.getState().definition),
  );
  await page.locator(`#canvas .of-builder-handle[data-id="${id}"]`).focus();
  await page.keyboard.press("ControlOrMeta+x");
  const destination = page.locator(
    `#canvas [data-drop-parent="${grid}"][data-drop-slot="column_1"][data-drop-index="0"]`,
  );
  const tab =
    browserName === "webkit" && process.platform === "darwin"
      ? "Alt+Tab"
      : "Tab";
  for (
    let step = 0;
    step < 30 &&
    !(await destination.evaluate(
      (el) => el === el.ownerDocument.activeElement,
    ));
    step++
  )
    await page.keyboard.press(tab);
  await expect(destination).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ControlOrMeta+v");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.nestedBuilder.builder.getState().definition.components[0]
            ?.columns?.[1]?.components[0]?.id,
      ),
    )
    .toBe(id);
  const after = await page.evaluate(() =>
    JSON.stringify(window.nestedBuilder.builder.getState().definition),
  );
  expect(after).not.toBe(before);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect(
    await page.evaluate(() =>
      JSON.stringify(window.nestedBuilder.builder.getState().definition),
    ),
  ).toBe(before);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  expect(
    await page.evaluate(() =>
      JSON.stringify(window.nestedBuilder.builder.getState().definition),
    ),
  ).toBe(after);
  await expect(page.locator("#builder-patch")).toContainText('"columns"');
});

test("default workbench palette hides demos and opt-in restores their engine checks", async ({
  page,
}) => {
  await page.goto("/builder.html?empty");
  await expect(
    page.getByRole("button", { name: "Add Rating", exact: true }),
  ).toBeVisible();
  for (const type of ["employeeObject", "acme.card", "acme.root-section"])
    await expect(page.locator(`#palette [data-type="${type}"]`)).toHaveCount(0);
  await page.goto("/builder.html?empty&demos");
  for (const type of ["employeeObject", "acme.card", "acme.root-section"])
    await expect(page.locator(`#palette [data-type="${type}"]`)).toHaveCount(1);
});
