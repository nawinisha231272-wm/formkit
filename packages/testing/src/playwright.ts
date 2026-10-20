import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Run against createThemeConformance's fixture with a host-owned native Submit button. */
export async function checkThemeConformance(
  page: Page,
  options: { root?: string; snapshot?: string } = {},
): Promise<void> {
  const selector = options.root ?? "#form";
  const root = page.locator(selector);
  await root.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(root.locator(".of-summary")).toBeFocused();
  await expect(root.getByLabel("Disabled", { exact: true })).toBeDisabled();
  await expect(
    root.getByLabel("Quantity, item A", { exact: true }),
  ).toHaveValue("3");
  const name = root.getByLabel("Name", { exact: true });
  await expect(name).toHaveAttribute("aria-invalid", "true");
  expect(
    (await name.getAttribute("aria-describedby"))?.split(" "),
  ).toHaveLength(3);
  const rating = root.locator('fieldset[data-field-id="rating"]');
  await expect(rating).toHaveAccessibleName("Rating");
  await expect(rating.locator("legend")).toContainText("(required)");
  await expect(rating).toHaveAccessibleDescription(
    "Rating is required (required)",
  );
  await root.getByRole("link", { name: "Rating is required" }).click();
  await expect(
    root.getByRole("button", { name: "1 of 5 stars" }),
  ).toBeFocused();
  await root.getByRole("button", { name: "3 of 5 stars" }).click();
  const hover = root.getByRole("button", { name: "4 of 5 stars" });
  await hover.hover();
  const color = await hover.evaluate((el) => getComputedStyle(el).color);
  await expect(hover).toHaveCSS("border-top-color", color);
  await name.focus();
  await expect(root.locator('[aria-live="polite"]')).toHaveCount(1);
  const results = await new AxeBuilder({ page }).include(selector).analyze();
  expect(
    results.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
  if (options.snapshot)
    await expect(root).toHaveScreenshot(options.snapshot, {
      animations: "disabled",
      scale: "css",
      maxDiffPixelRatio: 0.02,
    });
}

/** Verify native text, boolean and grouped-control read-only behavior, then optionally compare pixels. */
export async function checkReadOnlyTheme(
  page: Page,
  options: { root?: string; snapshot?: string } = {},
): Promise<void> {
  const root = page.locator(options.root ?? "#form");
  const name = root.getByLabel("Name", { exact: true });
  await expect(name).toHaveAttribute("readonly", "");
  await name.focus();
  await page.keyboard.type("ignored");
  await expect(name).toHaveValue("");
  await name.blur();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await root.getByLabel("Accept", { exact: true }).click();
  await expect(root.getByLabel("Accept", { exact: true })).not.toBeChecked();
  await expect(
    root.getByRole("button", { name: "1 of 5 stars" }),
  ).toBeDisabled();
  if (options.snapshot)
    await expect(root).toHaveScreenshot(options.snapshot, {
      animations: "disabled",
      scale: "css",
      maxDiffPixelRatio: 0.02,
    });
}

export interface HostConformanceSample {
  host: string;
  submission: unknown;
  errors: unknown;
  controls: unknown;
}
/** Compare the shared fixture's submission, complete validation errors and normalized control semantics. */
export function checkHostConformance(
  samples: readonly HostConformanceSample[],
): void {
  expect(samples.length).toBeGreaterThan(1);
  const first = samples[0]!;
  for (const sample of samples.slice(1)) {
    expect(sample.submission, `${sample.host} submitted data`).toEqual(
      first.submission,
    );
    expect(sample.errors, `${sample.host} validation errors`).toEqual(
      first.errors,
    );
    expect(sample.controls, `${sample.host} accessible controls`).toEqual(
      first.controls,
    );
  }
}

/** Tier 1 client contract, exercised unchanged through actual DOM/React/Angular adapters. */
export async function checkComponentConformance(
  page: Page,
  options: { root?: string; result?: string; themeSelect?: string } = {},
): Promise<void> {
  const root = page.locator(options.root ?? "#host");
  await root
    .getByRole("button", { name: "Send registration", exact: true })
    .click();
  await expect(
    root.getByRole("region", { name: "Please correct these errors" }),
  ).toBeFocused();
  await root.getByLabel("Full name", { exact: true }).fill("Ana Rivera");
  await root
    .getByLabel("About you", { exact: true })
    .fill("Building useful forms");
  const email = root.getByLabel("Email address", { exact: true });
  await email.fill("invalid");
  await email.press("Tab");
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await email.fill("ana@example.com");
  await email.press("Tab");
  // Let the host's async validator settle before later pointer targets can move.
  await expect(email).toHaveAttribute("aria-busy", "false");
  await expect(email).toHaveAttribute("aria-invalid", "false");
  await root.getByLabel("Password", { exact: true }).fill("test-password");
  await expect(root.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "password",
  );
  await root.getByLabel("Age", { exact: true }).fill("30");
  await root.getByRole("radio", { name: "Email", exact: true }).check();
  await root.getByLabel("Team", { exact: true }).selectOption("engineering");
  await root.getByLabel("Accept terms", { exact: true }).check();
  await expect(root.locator('input[type="hidden"]')).toHaveValue("web");
  await expect(root).toContainText("OurForm team");
  await root
    .getByRole("button", { name: "Send registration", exact: true })
    .click();
  await expect(page.locator(options.result ?? "#tier-result")).toContainText(
    '"ok": true',
  );
  for (const theme of options.themeSelect
    ? ["base", "bootstrap4", "bootstrap5", "tailwind"]
    : [null]) {
    if (theme && options.themeSelect)
      await page.locator(options.themeSelect).selectOption(theme);
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact ?? ""),
      ),
    ).toEqual([]);
  }
}

export interface PropertyEditorCase {
  key: string;
  value: string | number | boolean | object | null;
  verify(preview: import("@playwright/test").Locator): Promise<void>;
}
/** Exercise every component-specific metadata editor, with an observable preview assertion per edit. */
export async function checkPropertyEditors(
  page: Page,
  cases: readonly PropertyEditorCase[],
  options: { root?: string } = {},
): Promise<void> {
  const root = page.locator(options.root ?? "#builder");
  const editors = root.locator(
    '[data-author-properties] [data-property^="properties."]',
  );
  const keys = await editors.evaluateAll((nodes) =>
    nodes
      .map((node) =>
        node.getAttribute("data-property")!.slice("properties.".length),
      )
      .sort(),
  );
  expect(
    cases.map((sample) => sample.key).sort(),
    "Supply exactly one preview assertion for every generated component property",
  ).toEqual(keys);
  const preview = root.locator("[data-author-preview]");
  for (const sample of cases) {
    // Filter by the observed dataset rather than interpolating a customer key into CSS.
    const index = await editors.evaluateAll(
      (nodes, key) =>
        nodes.findIndex(
          (node) => node.getAttribute("data-property") === `properties.${key}`,
        ),
      sample.key,
    );
    const target = editors.nth(index);
    const kind = await target.evaluate((node) =>
      node.tagName === "TEXTAREA"
        ? "json"
        : node.tagName === "SELECT"
          ? "select"
          : (node as HTMLInputElement).type,
    );
    const before =
      kind === "checkbox"
        ? await target.isChecked()
        : kind === "number"
          ? Number(await target.inputValue())
          : kind === "json"
            ? JSON.parse(await target.inputValue())
            : await target.inputValue();
    expect(
      before,
      `Choose a different value for property ${sample.key}`,
    ).not.toEqual(sample.value);
    if (kind === "checkbox") {
      if (typeof sample.value !== "boolean")
        throw new Error("Checkbox editor requires a boolean");
      await target.setChecked(sample.value);
    } else if (kind === "select")
      await target.selectOption(String(sample.value));
    else {
      await target.fill(
        kind === "json" ? JSON.stringify(sample.value) : String(sample.value),
      );
      await target.dispatchEvent("change");
    }
    await sample.verify(preview);
  }
}
