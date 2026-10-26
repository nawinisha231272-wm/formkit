import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type {} from "../../apps/playground/builder";

test("workbench modes use the live form and submission schema without remounting controls", async ({
  page,
}) => {
  await page.goto("/builder.html");
  await expect(
    page.getByRole("tab", { name: "Logic", exact: true }),
  ).toBeDisabled();
  const history = await page.evaluate(
    () => window.miniBuilder.builder.getState().history.past.length,
  );
  await page.getByRole("tab", { name: "Preview", exact: true }).click();
  const name = page.locator("#preview").getByRole("textbox", { name: /Name/ });
  await name.fill("Ana");
  const identity = await name.elementHandle();
  await page.getByRole("tab", { name: "Data", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Submission JSON Schema", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".ofb-data-panel pre").first()).toContainText(
    '"additionalProperties": false',
  );
  await expect(page.locator(".ofb-data-panel pre").last()).toContainText(
    '"name": "Ana"',
  );
  await page.getByRole("tab", { name: "JSON", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Form JSON", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Preview", exact: true }).click();
  expect(await name.evaluate((node, old) => node === old, identity)).toBe(true);
  await expect(name).toHaveValue("Ana");
  expect(
    await page.evaluate(
      () => window.miniBuilder.builder.getState().history.past.length,
    ),
  ).toBe(history);
  await page.getByRole("tab", { name: "Build", exact: true }).click();
  await expect(page.locator('[data-builder-part="canvas"]')).toBeVisible();
  await expect(page.locator("#preview")).toBeHidden();
});

test("design canvas shows only the active tab and preserves tab DOM/selection on theme switches", async ({
  page,
}) => {
  await page.goto("/builder.html?fixture");
  const canvas = page.locator('[data-builder-part="canvas"]');
  await expect(canvas.locator('[data-field-id="name"]')).toBeVisible();
  await expect(canvas.locator('[data-field-id="email"]')).toBeHidden();
  const email = canvas.locator('[data-field-id="email"]');
  const identity = await email.elementHandle();
  await canvas.getByRole("tab", { name: "Contact", exact: true }).click();
  await expect(email).toBeVisible();
  await expect(canvas.locator('[data-field-id="name"]')).toBeHidden();
  await email.click();
  await page
    .getByRole("combobox", { name: "Theme", exact: true })
    .selectOption("material");
  await expect(
    canvas.getByRole("tab", { name: "Contact", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  expect(await email.evaluate((node, old) => node === old, identity)).toBe(
    true,
  );
  expect(
    await page.evaluate(() => window.miniBuilder.builder.getState().selection),
  ).toBe("email");
  await expect(canvas).toHaveAttribute("data-of-theme", "material");
});

test("Copy in toolbar More captures a snapshot; keyboard paste commits once without opening settings", async ({
  page,
}) => {
  await page.goto("/builder.html");
  const rating = page.locator(
    '[data-builder-part="canvas"] [data-field-id="cmp_rating"]',
  );
  await rating.getByRole("button", { name: "More", exact: true }).click();
  await page.locator(".ofb-action-menu").getByRole("button", { name: "Copy", exact: true }).click();
  expect(
    await page.evaluate(
      () => window.miniBuilder.builder.getState().history.past.length,
    ),
  ).toBe(0);
  await rating.focus();
  await rating.press("Control+v");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      window.miniBuilder.builder.getState().history.past.map((c) => c.type),
    ),
  ).toEqual(["PasteComponent"]);
  expect(
    await page.evaluate(
      () =>
        window.miniBuilder.builder
          .getState()
          .definition.components.filter((n) => n.type === "rating").length,
    ),
  ).toBe(2);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect(
    await page.evaluate(
      () =>
        window.miniBuilder.builder
          .getState()
          .definition.components.filter((n) => n.type === "rating").length,
    ),
  ).toBe(1);
});

test("context menu and duplicate shortcut share one-step commands; host can cancel deletion", async ({
  page,
}) => {
  await page.goto("/builder.html");
  const rating = page.locator(
    '[data-builder-part="canvas"] [data-field-id="cmp_rating"]',
  );
  await rating.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Duplicate", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      window.miniBuilder.builder.getState().history.past.map((c) => c.type),
    ),
  ).toEqual(["DuplicateComponent"]);
  const selected = page.locator(
    '[data-builder-part="canvas"] [data-of-selected="true"]',
  );
  await selected.focus();
  await selected.press("Control+d");
  expect(
    await page.evaluate(() =>
      window.miniBuilder.builder.getState().history.past.map((c) => c.type),
    ),
  ).toEqual(["DuplicateComponent", "DuplicateComponent"]);
  await page.evaluate(() =>
    document
      .getElementById("builder")!
      .addEventListener("of-before-delete", (e) => e.preventDefault(), {
        once: true,
      }),
  );
  await page
    .locator('[data-builder-part="canvas"] [data-of-selected="true"]')
    .press("Delete");
  expect(
    await page.evaluate(
      () => window.miniBuilder.builder.getState().history.past.length,
    ),
  ).toBe(2);
});

test("workbench chrome and active-tab canvas have no serious/critical axe issues", async ({
  page,
}) => {
  await page.goto("/builder.html?fixture");
  const result = await new AxeBuilder({ page }).analyze();
  expect(
    result.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
});

test("React native settings preview receives its draft form context and hook writes remain isolated", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4182/builder.html?context-trial");
  await page
    .getByRole("button", { name: "Add Native text", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("input[data-builder-native]")).toBeVisible();
  await expect(dialog.locator("[data-builder-context]")).toHaveText(
    "react-builder-context",
  );
  await expect(dialog.locator("[data-builder-session-native]")).not.toHaveText(
    "missing",
  );
  await dialog
    .getByRole("button", { name: "Write through form hook", exact: true })
    .click();
  await expect(dialog.locator("input[data-builder-native]")).toHaveValue(
    "Written through draft hook",
  );
  expect(
    await page.evaluate(() =>
      window
        .builderHost!.builder.getState()
        .definition.components.some((n) => n.type === "acme.native"),
    ),
  ).toBe(false);
  expect(await page.evaluate(() => window.builderChanges.length)).toBe(0);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(await page.evaluate(() => window.builderChanges.length)).toBe(0);
});

test("approved demo is a real twelve-field nested form with a custom SDK field and existing conditional logic", async ({
  page,
}) => {
  await page.goto("/builder.html?approved&theme=material");
  const canvas = page.locator('[data-builder-part="canvas"]');
  await expect(canvas).toHaveAttribute("data-of-theme", "material");
  await expect(
    page.getByRole("button", { name: "Edit settings", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        window.miniBuilder.preview!.session.form.nodes.filter(
          (e) => e.model.value,
        ).length,
    ),
  ).toBe(12);
  await expect(
    canvas.locator('[data-field-id="contactColumns"] [data-field-id="email"]'),
  ).toBeVisible();
  await expect(canvas.locator('[data-field-id="customerType"]')).toContainText(
    "Controls 4 fields",
  );
  await expect(
    canvas.locator('[data-field-id="companyDetails"]'),
  ).toContainText("Shown when Customer type is business");
  await page.getByRole("tab", { name: "Preview", exact: true }).click();
  const preview = page.locator('[data-builder-part="preview"]');
  await expect(
    preview.getByRole("textbox", { name: "Email", exact: true }),
  ).toHaveValue("ana@example.com");
  await expect(
    preview.getByRole("textbox", { name: "Customer reference", exact: true }),
  ).toHaveValue("CRM-1042");
  await preview.getByRole("radio", { name: "Individual", exact: true }).check();
  await expect(
    preview.getByRole("textbox", { name: "Company name", exact: true }),
  ).toBeHidden();
  await preview.getByRole("radio", { name: "Business", exact: true }).check();
  await expect(
    preview.getByRole("textbox", { name: "Customer reference", exact: true }),
  ).toHaveValue("");
});

test("public browser factory builds registered components without a framework wrapper", async ({
  page,
}) => {
  await page.goto("/builder.html?factory&approved&theme=material");
  await expect(
    page.getByRole("button", { name: "Edit settings", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        window.miniBuilder.preview!.session.form.nodes.filter(
          (e) => e.model.value,
        ).length,
    ),
  ).toBe(12);
  await page
    .getByRole("button", { name: "Add Customer reference", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Label", { exact: true }).fill("External reference");
  await dialog.getByRole("tab", { name: "Reference", exact: true }).click();
  await dialog
    .getByLabel("Reference hint", { exact: true })
    .fill("ERP reference");
  await expect(
    dialog.getByRole("textbox", { name: "External reference", exact: true }),
  ).toHaveAttribute("placeholder", "ERP reference");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  expect(
    await page.evaluate(() =>
      window.miniBuilder.builder.getState().history.past.map((c) => c.type),
    ),
  ).toEqual(["AddComponent"]);
});

test("phone widths expose an accessible read-only preview and retain schema/history when resized", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/builder.html");
  await expect(
    page.getByRole("tab", { name: "Build", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("tab", { name: "Preview", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  const input = page.locator('#preview input[type="text"]');
  await expect(input).toHaveAttribute("readonly", "");
  await expect(input).toHaveAccessibleName("Name");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const before = await page.evaluate(() =>
    JSON.stringify(window.miniBuilder.builder.getState()),
  );
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(input).not.toHaveAttribute("readonly", "");
  expect(
    await page.evaluate(() =>
      JSON.stringify(window.miniBuilder.builder.getState()),
    ),
  ).toBe(before);
  await input.fill("Mobile reader");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(input).toHaveAttribute("readonly", "");
  await expect(input).toHaveValue("Mobile reader");
  const result = await new AxeBuilder({ page }).analyze();
  expect(
    result.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
});

test("design controls retain real enabled appearance while inert, and signals do not accumulate on restyle", async ({
  page,
}) => {
  await page.goto("/builder.html?approved");
  const canvas = page.locator("#canvas"),
    name = canvas.locator('[data-field-id="fullName"] input');
  await expect(name).not.toHaveAttribute("readonly");
  await expect(name.locator("xpath=ancestor::*[@inert][1]")).toHaveCount(1);
  const type = canvas.locator('[data-field-id="customerType"]');
  await expect(type.locator(".ofb-signal-row")).toHaveCount(1);
  for (const theme of ["bootstrap4", "material", "base"])
    await page.evaluate((t) => window.nestedBuilder.setTheme(t), theme);
  await expect(type.locator(".ofb-signal-row")).toHaveCount(1);
  await expect(
    type.getByText("Controls 4 fields", { exact: true }),
  ).toHaveCount(1);
  const company = canvas.locator('[data-field-id="companyDetails"]');
  await company.locator(":scope > .of-layout-title").click({ button: "right" });
  await page
    .getByRole("menuitem", { name: "Collapse or expand", exact: true })
    .click();
  await expect(company.locator('[data-field-id="companyName"]')).toBeHidden();
  await expect(
    company.getByText("Shown when Customer type is business", { exact: true }),
  ).toBeVisible();
});

test("Material uses elevated rounded cards and a larger outer Tabs title", async ({
  page,
}) => {
  await page.goto("/builder.html?approved&theme=material");
  const panel = page.locator('#canvas [data-field-id="contactPanel"]');
  await expect(panel).toHaveCSS("border-radius", "12px");
  await expect(panel).not.toHaveCSS("box-shadow", "none");
  const submit = page.locator(
    '#canvas [data-field-id="submit"] > button.of-control',
  );
  await expect(submit).toHaveJSProperty("inert", true);
  await expect(submit).toHaveCSS("background-color", "rgb(103, 80, 164)");
  await expect(
    page.locator('#canvas [data-field-id="customerTabs"] > .of-layout-title'),
  ).toHaveCSS("font-size", "26px");
});

test("generated Select options populate the live Material preview and saved form", async ({
  page,
}) => {
  await page.goto("/builder.html?empty&theme=material");
  await page.getByRole("button", { name: "Add Select", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Label", { exact: true }).fill("Industry");
  await expect(dialog.getByLabel("Options", { exact: true })).toHaveValue(
    JSON.stringify([
      { value: "option1", label: "Option 1" },
      { value: "option2", label: "Option 2" },
    ]),
  );
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  const before = await page.evaluate(() =>
    JSON.stringify(window.miniBuilder.builder.getState().definition),
  );
  await page
    .getByRole("button", { name: "Edit settings", exact: true })
    .click();
  await dialog.getByLabel("Options", { exact: true }).fill(
    JSON.stringify([
      { value: "software", label: "Software" },
      { value: "services", label: "Services" },
    ]),
  );
  const live = dialog.locator('[data-builder-part="editor-preview"]');
  await expect(
    live.getByRole("option", { name: "Software", exact: true }),
  ).toHaveCount(1);
  await expect(
    live.getByRole("option", { name: "Services", exact: true }),
  ).toHaveCount(1);
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  expect(
    await page.evaluate(
      () => window.miniBuilder.builder.getState().history.past.length,
    ),
  ).toBe(2);
  await page.getByRole("tab", { name: "Preview", exact: true }).click();
  const choice = page.getByRole("combobox", { name: "Industry", exact: true });
  await choice.selectOption("software");
  await expect(choice).toHaveValue("software");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect(
    await page.evaluate(() =>
      JSON.stringify(window.miniBuilder.builder.getState().definition),
    ),
  ).toBe(before);
});
