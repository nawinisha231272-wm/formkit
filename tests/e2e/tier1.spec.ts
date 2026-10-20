import { test, expect } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";
import { createConformanceEngine, themeNames } from "@ourform/testing";
import { checkComponentConformance } from "@ourform/testing/playwright";
import { validateSubmission } from "@ourform/validation";
const good = JSON.parse(
  readFileSync(
    new URL(
      "../../fixtures/forms/tier1/registration.data.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
import type {} from "../../apps/playground/tier1";
for (const host of ["dom", "react", "angular"]) {
  test(`${host}: every Tier 1 field passes shared conformance, actions and reset`, async ({
    page,
  }) => {
    await page.goto(`/tier1.html?host=${host}`);
    await page.waitForFunction(() => !!window.tier1Demo?.form);
    await checkComponentConformance(page, { themeSelect: "#tier-theme" });
    expect(
      await page.evaluate(() => window.tier1Demo.form.session.getData()),
    ).toEqual(good);
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(page.locator("#tier-result")).toContainText(
      '"name": "save-draft"',
    );
    await page.getByLabel("Full name", { exact: true }).focus();
    await page
      .getByRole("button", { name: "Clear registration", exact: true })
      .click();
    await expect(page.getByLabel("Full name", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("Team", { exact: true })).toHaveValue("");
    await expect(
      page.getByRole("radio", { name: "Email", exact: true }),
    ).not.toBeChecked();
    await expect(page.locator('input[type="hidden"]')).toHaveValue("web");
    expect(
      await page.evaluate(async () => {
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
        const session = window.tier1Demo.form.session;
        return session.form.nodes.some(
          (entry) => session.getFieldState(entry.node.id).touched,
        );
      }),
    ).toBe(false);
  });
  test(`${host}: async pending, superseding signals and stale-result protection`, async ({
    page,
  }) => {
    await page.goto(`/tier1.html?host=${host}&manual`);
    await page.waitForFunction(() => !!window.tier1Demo?.form);
    const email = page.getByLabel("Email address", { exact: true });
    await email.fill("old@example.com");
    await email.press("Tab");
    await expect(email).toHaveAttribute("aria-busy", "true");
    await page.evaluate(() =>
      window.tier1Demo.form.session.setValue("email", "new@example.com"),
    );
    expect(
      await page.evaluate(() => window.tier1Demo.lookups[0]!.signal.aborted),
    ).toBe(true);
    await page.evaluate(() => {
      const jobs = window.tier1Demo.lookups;
      jobs.at(-1)!.resolve(false);
      jobs[0]!.resolve(true);
    });
    await expect(email).toHaveAttribute("aria-busy", "false");
    await expect(email).toHaveAttribute("aria-invalid", "false");
    const result = await page.evaluate(async () => {
      const pending = window.tier1Demo.form.validate();
      window.tier1Demo.lookups.at(-1)!.resolve(true);
      return pending;
    });
    expect(
      result.errors.some(
        (e) => e.componentId === "email" && e.error.code === "taken",
      ),
    ).toBe(true);
    await expect(
      page.locator('[data-field-id="email"] .of-errors'),
    ).toContainText("already in use");
  });
  test(`${host}: read-only controls retain data and all four themes retain identity/focus/caret`, async ({
    page,
  }) => {
    await page.goto(`/tier1.html?host=${host}&readonly`);
    await page.waitForFunction(() => !!window.tier1Demo?.form);
    for (const label of [
      "Full name",
      "About you",
      "Email address",
      "Password",
      "Age",
    ])
      await expect(page.getByLabel(label, { exact: true })).toHaveAttribute(
        "readonly",
        "",
      );
    await expect(page.getByLabel("Team", { exact: true })).toBeDisabled();
    await expect(
      page.getByRole("radio", { name: "Phone", exact: true }),
    ).toBeDisabled();
    await page.getByLabel("Accept terms", { exact: true }).click();
    await expect(
      page.getByLabel("Accept terms", { exact: true }),
    ).toBeChecked();
    await expect(
      page.getByRole("button", { name: "Send registration", exact: true }),
    ).toBeDisabled();
    const state = await page.evaluate(
      (themes) => {
        const form = window.tier1Demo.form;
        const input = document.querySelector<HTMLInputElement>(
          '[data-field-id="name"] input',
        )!;
        input.focus();
        input.setSelectionRange(3, 3);
        const before = JSON.stringify(
          form.session.form.nodes.map((n) =>
            form.session.getFieldState(n.node.id),
          ),
        );
        for (const theme of themes) {
          form.view.setTheme(theme);
          form.view.setMode("dark");
        }
        return {
          identity:
            input === document.querySelector('[data-field-id="name"] input'),
          focus: input === document.activeElement,
          caret: input.selectionStart,
          state:
            before ===
            JSON.stringify(
              form.session.form.nodes.map((n) =>
                form.session.getFieldState(n.node.id),
              ),
            ),
          data: form.session.getData(),
        };
      },
      [...themeNames],
    );
    expect(state).toEqual({
      identity: true,
      focus: true,
      caret: 3,
      state: true,
      data: good,
    });
  });
  test(`${host}: disabled state and unmount release every new control listener`, async ({
    page,
  }) => {
    await page.goto(`/tier1.html?host=${host}&disabled`);
    await page.waitForFunction(() => !!window.tier1Demo?.form);
    for (const label of [
      "Full name",
      "About you",
      "Email address",
      "Password",
      "Age",
      "Team",
      "Accept terms",
    ])
      await expect(page.getByLabel(label, { exact: true })).toBeDisabled();
    await expect(
      page.getByRole("radio", { name: "Email", exact: true }),
    ).toBeDisabled();
    const result = await page.evaluate(() => {
      const controller = window.tier1Demo.form;
      const input = document.querySelector<HTMLInputElement>(
        '[data-field-id="name"] input',
      )!;
      const button = document.querySelector<HTMLButtonElement>(
        '[data-field-id="custom"] button',
      )!;
      const before = JSON.stringify(controller.session.getData());
      let actions = 0;
      document
        .querySelector("#host")!
        .addEventListener("of-action", () => actions++);
      window.tier1Demo.unmount();
      input.value = "orphan";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      button.click();
      return {
        empty: !document.querySelector("#host input"),
        unchanged: before === JSON.stringify(controller.session.getData()),
        actions,
      };
    });
    expect(result).toEqual({ empty: true, unchanged: true, actions: 0 });
  });
}
test("all shared fixtures yield byte-equivalent validation results in browser and customer Node", async ({
  page,
}) => {
  const cases: { definition: unknown; data?: unknown }[] = readdirSync(
    new URL("../../fixtures/forms/", import.meta.url),
  )
    .filter((name) => name.endsWith(".json"))
    .map((name) => ({
      definition: JSON.parse(
        readFileSync(
          new URL(`../../fixtures/forms/${name}`, import.meta.url),
          "utf8",
        ),
      ),
    }));
  for (const name of readdirSync(
    new URL("../../fixtures/forms/", import.meta.url),
  ).filter((f) => f.endsWith(".json") && !f.includes(".invalid"))) {
    const definition = JSON.parse(
      readFileSync(
        new URL(`../../fixtures/forms/${name}`, import.meta.url),
        "utf8",
      ),
    );
    const stem = name.slice(0, -5);
    const data = JSON.parse(
      readFileSync(
        new URL(
          `../../fixtures/submissions/${stem}.data.json`,
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const invalid = JSON.parse(
      readFileSync(
        new URL(
          `../../fixtures/submissions/${stem}.invalid.json`,
          import.meta.url,
        ),
        "utf8",
      ),
    ) as unknown[];
    cases.push(
      { definition, data },
      ...invalid.map((data) => ({ definition, data })),
    );
  }
  const registration = JSON.parse(
    readFileSync(
      new URL("../../fixtures/forms/tier1/registration.json", import.meta.url),
      "utf8",
    ),
  );
  const bad = JSON.parse(
    readFileSync(
      new URL(
        "../../fixtures/forms/tier1/registration.invalid.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as unknown[];
  cases.push(
    { definition: registration, data: good },
    ...bad.map((data) => ({ definition: registration, data })),
  );
  const expected = [];
  for (const item of cases) {
    const engine = createConformanceEngine();
    const compiled = engine.compile(item.definition);
    if (!compiled.ok) {
      expected.push({ compile: compiled.diagnostics });
      continue;
    }
    const session = engine.createSession(compiled.form);
    const data = item.data ?? session.getData();
    session.dispose();
    expected.push({
      compile: compiled.diagnostics,
      result: await validateSubmission(compiled.form, data),
    });
  }
  await page.goto("/tier1.html");
  await page.waitForFunction(() => !!window.tier1Demo?.form);
  expect(
    await page.evaluate(
      (cases) => window.tier1Demo.validateCases(cases),
      cases,
    ),
  ).toEqual(expected);
});
test("localization provider renders Spanish validation with English fallback and Content cannot execute markup", async ({
  page,
}) => {
  await page.goto("/tier1.html?locale=es");
  await page.waitForFunction(() => !!window.tier1Demo?.form);
  await page
    .getByRole("button", { name: "Send registration", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Corrige estos errores" }),
  ).toBeVisible();
  await expect(page.locator('[data-field-id="name"] .of-errors')).toContainText(
    "Full name es obligatorio",
  );
  await expect(page.getByLabel("Team", { exact: true })).toContainText(
    "Elige una opción",
  );
  expect(await page.locator('[data-field-id="intro"] script').count()).toBe(0);
});

for (const host of ["dom", "react", "angular"])
  test(`${host}: Content strips executable markup and unsafe URLs in the real DOM`, async ({
    page,
  }) => {
    await page.goto(`/tier1.html?host=${host}&unsafe`);
    await page.waitForFunction(() => !!window.tier1Demo?.form);
    const content = page.locator('[data-field-id="intro"]');
    await expect(content).toContainText("Safe content");
    await expect(
      content.locator("script,img,svg,iframe,[onclick],[onerror]"),
    ).toHaveCount(0);
    await expect(
      content.getByRole("link", { name: "Allowed" }),
    ).toHaveAttribute("href", "https://example.com");
    expect(
      await content.getByText("Blocked", { exact: true }).getAttribute("href"),
    ).toBeNull();
    expect(
      await page.evaluate(() => Reflect.get(window, "m06Xss")),
    ).toBeUndefined();
  });

test("browser and Node enforce reject/strip identically for nested unknown keys and unsafe data", async ({
  page,
}) => {
  const definition = {
    $formVersion: "1.0",
    id: "unknown-policy",
    display: "form",
    components: [
      {
        id: "group",
        type: "container",
        key: "group",
        components: [
          {
            id: "name",
            type: "text",
            key: "name",
            validation: { required: true },
          },
        ],
      },
    ],
  };
  const cases: {
    definition: unknown;
    data: unknown;
    unknownKeys?: "reject" | "strip";
  }[] = [];
  const data = { group: { name: "Ada", extra: "discard" }, extra: 123 };
  cases.push(
    { definition, data },
    { definition, data, unknownKeys: "reject" },
    { definition, data, unknownKeys: "strip" },
  );
  for (const data of [
    { group: [] },
    { group: { name: 5 } },
    { group: {} },
    JSON.parse('{"group":{"name":"Ada"},"constructor":{}}'),
  ])
    cases.push({ definition, data, unknownKeys: "strip" });
  const engine = createConformanceEngine();
  const compiled = engine.compile(definition);
  if (!compiled.ok) throw new Error("compile");
  const expected = [];
  for (const item of cases)
    expected.push({
      compile: compiled.diagnostics,
      result: await validateSubmission(compiled.form, item.data, {
        ...(item.unknownKeys ? { unknownKeys: item.unknownKeys } : {}),
      }),
    });
  expect(expected.map((item) => item.result.valid)).toEqual([
    false,
    false,
    true,
    false,
    false,
    false,
    false,
  ]);
  await page.goto("/tier1.html");
  await page.waitForFunction(() => !!window.tier1Demo?.form);
  expect(
    await page.evaluate(
      (cases) => window.tier1Demo.validateCases(cases),
      cases,
    ),
  ).toEqual(expected);
});

test("playground demonstrates default rejection and opt-in strip without mutating data", async ({
  page,
}) => {
  await page.goto("/tier1.html");
  await page.waitForFunction(() => !!window.tier1Demo?.form);
  await expect(page.getByLabel("Unknown key policy")).toHaveValue("reject");
  await page
    .getByRole("button", { name: "Validate a sample with extra keys" })
    .click();
  const result = page.getByRole("region", {
    name: "Unknown key validation result",
  });
  await expect(result).toContainText('"valid": false');
  await page.getByLabel("Unknown key policy").selectOption("strip");
  await page
    .getByRole("button", { name: "Validate a sample with extra keys" })
    .click();
  await expect(result).toContainText('"valid": true');
  await expect(result).toContainText('"originalExtra": "host metadata"');
});
