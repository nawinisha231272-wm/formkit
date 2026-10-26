import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type {} from "../../apps/playground/builder";

for (const [property, tab, operation, operator] of [
  ["visibleWhen", "Conditional", "eq", "equals"],
  ["disabledWhen", "Conditional", "eq", "equals"],
  ["calculate.expr", "Logic", "concat", "followed by"],
] as const)
  test(`${property}: searchable sentence rows and raw expression stay synchronized without Apply`, async ({
    page,
  }) => {
    await page.goto("/builder.html?approved");
    const before = await page.evaluate(() =>
      JSON.stringify(window.miniBuilder.builder.getState().definition),
    );
    await page
      .getByRole("button", { name: "Edit settings", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.locator(".ofb-settings-location")).toContainText(
      "Column 2",
    );
    await dialog.getByRole("tab", { name: tab, exact: true }).click();
    const expression = dialog.locator(`[data-expression="${property}"]`);
    await expect(
      expression.getByRole("combobox", {
        name: "Match conditions",
        exact: true,
      }),
    ).toHaveCount(tab === "Logic" ? 0 : 1);
    await expression
      .getByRole("button", { name: "Add condition", exact: true })
      .click();
    const field = expression.getByRole("combobox", {
      name: "Condition field",
      exact: true,
    });
    await field.fill("Full na");
    await expect(
      expression.getByRole("option", { name: "Full name", exact: true }),
    ).toBeVisible();
    await field.press("ArrowDown");
    await field.press("Enter");
    await expect(field).toHaveValue("Full name");
    const op = expression.getByRole("combobox", {
      name: "Operator",
      exact: true,
    });
    await field.press("Tab");
    await expect(op).toBeFocused();
    await op.fill(operator);
    await op.press("Enter");
    await op.press("Tab");
    await expect(
      expression.getByLabel("Comparison value", { exact: true }),
    ).toBeFocused();
    await expression
      .getByLabel("Comparison value", { exact: true })
      .fill("Ada");
    await expect(
      dialog.getByRole("button", { name: "Apply conditions", exact: true }),
    ).toHaveCount(0);
    const raw = expression.locator("textarea");
    await expect(raw).toHaveValue(
      JSON.stringify([operation, { ref: "fullName" }, "Ada"]),
    );
    await expect(raw).toBeHidden();
    if (operation === "eq") {
      await expression
        .getByLabel("Comparison value", { exact: true })
        .fill("42");
      await expect(raw).toHaveValue(
        JSON.stringify([operation, { ref: "fullName" }, "42"]),
      );
      await expression
        .getByLabel("Comparison value", { exact: true })
        .fill("Ada");
    }
    await expression.getByText("Write as expression", { exact: true }).click();
    await raw.fill(JSON.stringify([operation, { ref: "phone" }, "Grace"]));
    await expect(field).toHaveValue("Phone");
    await expect(
      expression.getByLabel("Comparison value", { exact: true }),
    ).toHaveValue("Grace");
    await expression
      .getByLabel("Comparison value", { exact: true })
      .fill("Lin");
    await expect(raw).toHaveValue(
      JSON.stringify([operation, { ref: "phone" }, "Lin"]),
    );
    if (tab === "Conditional") {
      const join = expression.getByRole("combobox", {
        name: "Match conditions",
        exact: true,
      });
      await join.fill("Any");
      await join.press("Enter");
      await expect(raw).toHaveValue(
        JSON.stringify(["or", [operation, { ref: "phone" }, "Lin"]]),
      );
      await join.fill("All");
      await join.press("Enter");
      await expect(raw).toHaveValue(
        JSON.stringify([operation, { ref: "phone" }, "Lin"]),
      );
    }
    expect(
      await page.evaluate(() =>
        JSON.stringify(window.miniBuilder.builder.getState().definition),
      ),
    ).toBe(before);
    const results = await new AxeBuilder({ page })
      .include(".of-builder")
      .analyze();
    expect(
      results.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact ?? ""),
      ),
    ).toEqual([]);
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    const email = await page.evaluate(
      () => window.nestedBuilder.preview!.session.form.byId.email!.node,
    );
    expect(
      property === "calculate.expr" ? email.calculate?.expr : email[property],
    ).toEqual([operation, { ref: "phone" }, "Lin"]);
    expect(
      await page.evaluate(
        () => window.miniBuilder.builder.getState().history.past.length,
      ),
    ).toBe(1);
  });

test("advanced expression survives inspection and invalid raw input cannot corrupt either definition", async ({
  page,
}) => {
  await page.goto("/builder.html?approved");
  await page
    .getByRole("button", { name: "Edit settings", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("tab", { name: "Conditional", exact: true }).click();
  const expression = dialog.locator('[data-expression="visibleWhen"]');
  await expression.getByText("Write as expression", { exact: true }).click();
  const raw = expression.locator("textarea");
  const value = '["not",["empty",{"ref":"fullName"}]]';
  await raw.fill(value);
  await expect(
    expression.getByText(/simple rule rows cannot represent it/),
  ).toBeVisible();
  await expect(
    expression.getByRole("button", { name: "Add condition", exact: true }),
  ).toHaveCount(0);
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit settings", exact: true })
    .click();
  await dialog.getByRole("tab", { name: "Conditional", exact: true }).click();
  await expect(raw).toHaveValue(value);
  await raw.fill("[invalid");
  await expect(
    dialog.getByRole("button", { name: "Save", exact: true }),
  ).toBeDisabled();
  await raw.fill(value);
  await expect(
    dialog.getByRole("button", { name: "Save", exact: true }),
  ).toBeEnabled();
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  expect(
    await page.evaluate(
      () =>
        window.nestedBuilder.preview!.session.form.byId.email!.node.visibleWhen,
    ),
  ).toEqual(JSON.parse(value));
});

test("desktop header stays one row; Theme and persisted Builder look are visible without changing the canvas", async ({
  page,
}) => {
  await page.goto("/builder.html?approved&theme=material");
  for (const width of [1280, 1440, 1800]) {
    await page.setViewportSize({ width, height: 960 });
    const header = page.locator(".ofb-header");
    const bounds = await header.evaluate((el) =>
      [...el.children]
        .map((child) => child.getBoundingClientRect())
        .filter((r) => r.width > 0)
        .map((r) => ({ top: r.top, bottom: r.bottom, right: r.right })),
    );
    expect(Math.max(...bounds.map((b) => b.top))).toBeLessThan(
      Math.min(...bounds.map((b) => b.bottom)),
    );
    expect(Math.max(...bounds.map((b) => b.right))).toBeLessThanOrEqual(width);
  }
  await expect(
    page.getByRole("combobox", { name: "Theme", exact: true }),
  ).toHaveValue("material");
  await expect(
    page.getByRole("combobox", { name: "Insert into", exact: true }),
  ).toBeHidden();
  await expect(
    page.getByRole("combobox", { name: "Layout to wrap in", exact: true }),
  ).toBeHidden();
  await page.locator(".ofb-header-menu > summary").click();
  await page
    .getByRole("combobox", { name: "Builder look", exact: true })
    .selectOption("neutral");
  await expect(page.locator(".of-builder")).toHaveAttribute(
    "data-ofb-theme",
    "neutral",
  );
  await expect(page.locator("#canvas")).toHaveAttribute(
    "data-of-theme",
    "material",
  );
  await expect(
    page.getByRole("combobox", { name: "Insert into", exact: true }),
  ).toHaveCount(0);
  const selected = page.locator('#canvas [data-field-id="email"]');
  await selected.focus();
  await selected.getByRole("button", { name: "More", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Insert into", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Layout to wrap in", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".of-builder")).toHaveAttribute(
    "data-ofb-theme",
    "neutral",
  );
  await page.locator(".ofb-header-menu > summary").click();
  await page
    .getByRole("combobox", { name: "Builder look", exact: true })
    .selectOption("match-form");
  await expect(page.locator(".of-builder")).toHaveAttribute(
    "data-ofb-theme",
    "material",
  );
  await page.evaluate(() =>
    window.nestedBuilder.setChrome({ theme: "neutral" }),
  );
  await expect(
    page.getByRole("combobox", { name: "Builder look", exact: true }),
  ).toHaveValue("neutral");
});

test("palette has frequent fields first and distinct icons; unlabelled Columns keeps its title and zero logic is silent", async ({
  page,
}) => {
  await page.goto("/builder.html?approved");
  const palette = page.locator("#palette");
  expect(
    await palette
      .locator("[data-type]")
      .evaluateAll((nodes) =>
        nodes.slice(0, 7).map((el) => (el as HTMLElement).dataset.type),
      ),
  ).toEqual([
    "text",
    "email",
    "number",
    "select",
    "checkbox",
    "radio",
    "textarea",
  ]);
  const icons = await palette
    .locator("[data-type]")
    .evaluateAll((nodes) =>
      nodes.map((el) => el.querySelector("svg")!.innerHTML),
    );
  expect(new Set(icons).size).toBe(icons.length);
  const columns = page.locator(
    '[role="treeitem"][data-drag-id="contactColumns"]',
  );
  await expect(columns).toHaveAttribute("aria-label", "Columns");
  await columns.locator(":scope > .of-builder-tree-name").click();
  await expect(
    page.locator('[data-builder-part="canvas-panel"] > h2'),
  ).toContainText("Columns");
  await expect(page.locator(".ofb-component-info")).not.toContainText(
    "Controls 0 fields",
  );
});

for (const theme of [
  "base",
  "bootstrap4",
  "bootstrap5",
  "tailwind",
  "material",
])
  test(`${theme}: generated Display properties work in preview and protect stored values`, async ({
    page,
  }) => {
    await page.goto(`/builder.html?theme=${theme}`);
    await page.getByRole("treeitem", { name: "Name", exact: true }).click();
    await page
      .getByRole("button", { name: "Edit settings", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.locator(".ofb-settings-header h2 svg")).toHaveCount(1);
    await expect(dialog.locator(".ofb-settings-location")).toContainText(
      "Name",
    );
    await dialog
      .getByLabel("Tooltip", { exact: true })
      .fill("Customer identifier");
    await dialog.getByLabel("Prefix", { exact: true }).fill("ID");
    await dialog.getByLabel("Suffix", { exact: true }).fill("verified");
    await dialog
      .getByRole("switch", { name: "Read-only", exact: true })
      .check();
    await expect(
      dialog.locator(
        '[data-builder-part="editor-preview"] [data-field-id="cmp_name"]',
      ),
    ).toHaveAttribute("title", "Customer identifier");
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("tab", { name: "Preview", exact: true }).click();
    const input = page.locator('#preview [data-field-id="cmp_name"] input');
    await expect(input).toHaveAttribute("readonly", "");
    await expect(
      page.locator('#preview [data-field-id="cmp_name"] .of-prefix'),
    ).toHaveText("ID");
    await expect(
      page.locator('#preview [data-field-id="cmp_name"] .of-suffix'),
    ).toHaveText("verified");
    await page.evaluate(() => {
      window.nestedBuilder.preview!.session.setValue("name", "stored");
      const input = document.querySelector<HTMLInputElement>(
        '#preview [data-field-id="cmp_name"] input',
      )!;
      input.value = "blocked";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await expect(input).toHaveValue("stored");
    if (theme === "material") {
      await expect(input).toHaveCSS("border-top-style", "solid");
      expect(
        await input.evaluate((el) => getComputedStyle(el).backgroundColor),
      ).not.toBe("rgba(0, 0, 0, 0)");
    }
    await page.getByRole("tab", { name: "Build", exact: true }).click();
    await page
      .getByRole("button", { name: "Edit settings", exact: true })
      .click();
    await dialog.getByRole("switch", { name: "Disabled", exact: true }).check();
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("tab", { name: "Preview", exact: true }).click();
    await expect(input).toBeDisabled();
  });

test("Select additions have editable choices and empty Select/Radio options appear in Issues", async ({
  page,
}) => {
  await page.goto("/builder.html?empty");
  await page.getByRole("button", { name: "Add Select", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Options", { exact: true })).toHaveValue(
    JSON.stringify([
      { value: "option1", label: "Option 1" },
      { value: "option2", label: "Option 2" },
    ]),
  );
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("tab", { name: "Preview", exact: true }).click();
  await expect(
    page
      .locator("#preview")
      .getByRole("option", { name: "Option 1", exact: true }),
  ).toHaveCount(1);
  await page.getByRole("tab", { name: "Build", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit settings", exact: true })
    .click();
  await dialog.getByLabel("Options", { exact: true }).fill("[]");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "Add Radio", exact: true }).click();
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await page
    .locator(".ofb-header-actions")
    .getByRole("button", { name: "Issues (2)", exact: true })
    .click();
  await expect(page.locator(".ofb-sidebar-issues")).toContainText(
    "Select has no options",
  );
  await expect(page.locator(".ofb-sidebar-issues")).toContainText(
    "Radio has no options",
  );
  await page
    .locator(".ofb-sidebar-issues")
    .getByRole("button", { name: /Select has no options/ })
    .click();
  await expect(page.locator(".ofb-component-info h3")).toHaveText("Select");
});

test("Save waits for host acknowledgement, reports failure, and never marks newer changes saved", async ({
  page,
}) => {
  await page.goto("/builder.html?manual-save");
  await page.evaluate(() => {
    (window as unknown as { savedDefinition: unknown }).savedDefinition =
      undefined;
    document.getElementById("builder")!.addEventListener("of-save", (event) => {
      (window as unknown as { savedDefinition: unknown }).savedDefinition = (
        event as CustomEvent
      ).detail.definition;
    });
  });
  const save = page
    .locator(".ofb-header-actions")
    .getByRole("button", { name: "Save", exact: true });
  const status = page.locator('.ofb-header > [data-ofb-primitive="Chip"]');
  await save.click();
  await expect(status).toHaveText("Saving…");
  await expect(save).toBeDisabled();
  expect(
    await page.evaluate(
      () => (window as unknown as { savedDefinition: unknown }).savedDefinition,
    ),
  ).toEqual(
    await page.evaluate(() => window.miniBuilder.builder.getState().definition),
  );
  await page.evaluate(() => window.nestedBuilder.markSaveFailed("Disk full"));
  await expect(status).toHaveText("Save failed: Disk full");
  await save.click();
  await page.evaluate(() => window.nestedBuilder.markSaved());
  await expect(status).toHaveText(/^Saved /);
  await expect(save).toBeEnabled();
  await save.click();
  await page.locator('#canvas [data-field-id="cmp_rating"]').focus();
  await page.keyboard.press("ControlOrMeta+d");
  await page.evaluate(() => window.nestedBuilder.markSaved());
  await expect(status).toHaveText("Unsaved changes");
  await expect(page.locator("#diagnostics")).toHaveText(/earlier version/);
  await page.goto("/builder.html");
  await save.click();
  await expect(status).toHaveText(/^Saved /);
});
