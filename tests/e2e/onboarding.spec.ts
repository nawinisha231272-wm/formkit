import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import type { ComponentNode } from "@ourform/schema";
import type {} from "../../apps/playground/onboarding";
import type {} from "../../apps/vanilla-example/src/data";
const fixture = JSON.parse(
  readFileSync(
    new URL("../../fixtures/forms/onboarding/customer.json", import.meta.url),
    "utf8",
  ),
) as { components: ComponentNode[] };
const good = JSON.parse(
  readFileSync(
    new URL(
      "../../fixtures/forms/onboarding/customer.data.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
function fields(nodes: ComponentNode[]): ComponentNode[] {
  return nodes.flatMap((node) =>
    node.components
      ? fields(node.components)
      : node.type === "button"
        ? []
        : [node],
  );
}
async function fill(page: Page) {
  for (const node of fields(fixture.components)) {
    const scope = node.id.split("-")[0]!;
    const value = good[scope][node.key!];
    const field = page.locator(`[data-field-id="${node.id}"]`);
    if (node.type === "hidden")
      await expect(field.locator("input")).toHaveValue(value);
    else if (node.type === "select")
      await field.locator("select").selectOption(value);
    else if (node.type === "checkbox")
      await field.locator("input").setChecked(value);
    else if (node.type === "radio")
      await field.locator(`input[value="${value}"]`).check();
    else await field.locator("input,textarea").fill(String(value));
  }
}
for (const host of [
  { name: "vanilla", port: 4181 },
  { name: "react", port: 4182 },
  { name: "angular22", port: 4183 },
  { name: "angular21", port: 4184 },
]) {
  for (const mode of ["controlled", "uncontrolled"])
    test(`${host.name} ${mode}: 40-field onboarding, rapid typing, scoped submit and public reset`, async ({
      page,
    }) => {
      test.setTimeout(60000);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(
        `http://127.0.0.1:${host.port}/?onboarding${mode === "uncontrolled" ? "&uncontrolled" : ""}`,
      );
      await page.waitForFunction(() => !!window.hostDemo?.form);
      await page
        .getByRole("button", { name: "Submit onboarding", exact: true })
        .click();
      await expect(
        page.getByRole("region", { name: "Please correct these errors" }),
      ).toBeFocused();
      await fill(page);
      const name = page.getByLabel("First name", { exact: true });
      await name.focus();
      await name.press("End");
      await name.pressSequentially(" Rivera-rapid-0123456789", { delay: 0 });
      await expect(name).toHaveValue("Ana Rivera-rapid-0123456789");
      await name.fill("Ana");
      await page
        .getByRole("button", { name: "Submit onboarding", exact: true })
        .click();
      await expect(page.locator("#result")).toContainText('"ok":true');
      expect(
        await page.evaluate(() => window.hostDemo.form.session.getData()),
      ).toEqual(good);
      await page.evaluate(() => window.hostDemo.form.reset());
      await expect(name).toHaveValue("");
      await expect(page.locator(".of-summary")).toBeHidden();
      expect(
        await page.evaluate(() =>
          window.hostDemo.form.session.form.nodes.some(
            (entry) =>
              window.hostDemo.form.session.getFieldState(entry.node.id).touched,
          ),
        ),
      ).toBe(false);
      expect(errors).toEqual([]);
    });
  for (const theme of ["base", "bootstrap4", "bootstrap5", "tailwind"])
    test(`${host.name} ${theme}: onboarding read-only preserves nested layout controls`, async ({
      page,
    }) => {
      await page.goto(`http://127.0.0.1:${host.port}/?onboarding&readonly`);
      await page.waitForFunction(() => !!window.hostDemo?.form);
      await expect(
        page.getByLabel("First name", { exact: true }),
      ).toHaveAttribute("readonly", "");
      await expect(
        page.getByLabel("Service plan", { exact: true }),
      ).toBeDisabled();
      const preserved = await page.evaluate((theme) => {
        const form = window.hostDemo.form,
          input = document.querySelector<HTMLInputElement>(
            '[data-field-id="contact-firstName"] input',
          )!;
        input.focus();
        input.setSelectionRange(1, 1);
        form.view.setTheme(theme);
        return {
          identity: input === document.activeElement,
          caret: input.selectionStart,
          data: form.session.getData(),
        };
      }, theme);
      expect(preserved).toEqual({ identity: true, caret: 1, data: good });
      const axe = await new AxeBuilder({ page }).analyze();
      expect(
        axe.violations.filter((v) =>
          ["serious", "critical"].includes(v.impact ?? ""),
        ),
      ).toEqual([]);
    });
}
test("responsive columns retain document order and child identity on resize and theme updates", async ({
  page,
}) => {
  await page.goto("/onboarding.html");
  await page.waitForFunction(() => !!window.onboardingDemo);
  const field = page.locator('[data-field-id="contact-firstName"]'),
    next = page.locator('[data-field-id="contact-lastName"]');
  await page.setViewportSize({ width: 1200, height: 900 });
  expect((await field.boundingBox())!.y).toBeCloseTo(
    (await next.boundingBox())!.y,
    0,
  );
  await page.getByLabel("First name", { exact: true }).fill("Typing");
  await page.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>(
      '[data-field-id="contact-firstName"] input',
    )!;
    input.focus();
    input.setSelectionRange(3, 3);
    Reflect.set(window, "m07Input", input);
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect((await next.boundingBox())!.y).toBeGreaterThan(
    (await field.boundingBox())!.y,
  );
  expect(
    await page.evaluate(
      () => Reflect.get(window, "m07Input") === document.activeElement,
    ),
  ).toBe(true);
  await expect(page.getByLabel("First name", { exact: true })).toHaveValue(
    "Typing",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("built static SSR is readable without JS and client remount replaces it without duplicate controls", async ({
  browser,
  page,
}) => {
  const noJS = await browser.newContext({ javaScriptEnabled: false });
  const server = await noJS.newPage();
  await server.goto("http://127.0.0.1:4174/onboarding.html");
  await expect(server.getByLabel("First name", { exact: true })).toBeVisible();
  await expect(
    server.locator('fieldset[data-field-id="address-panel"] legend'),
  ).toContainText("Address");
  await expect(
    server.locator('[data-field-id="contact-firstName"]'),
  ).toHaveCount(1);
  await noJS.close();
  await page.goto("http://127.0.0.1:4174/onboarding.html");
  await page.waitForFunction(() => !!window.onboardingDemo);
  expect(await page.evaluate(() => window.onboardingDemo.replaced)).toBe(true);
  await expect(page.locator('[data-field-id="contact-firstName"]')).toHaveCount(
    1,
  );
  await expect(page.locator('[aria-live="polite"].of-sr-only')).toHaveCount(1);
});
test("Phase 1 gate: built onboarding edits, themes, validates, submits and resets with networking disabled", async ({
  page,
  context,
}) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (!new URL(request.url()).hostname.startsWith("127.0.0.1"))
      external.push(request.url());
  });
  await page.goto("http://127.0.0.1:4174/onboarding.html");
  await page.waitForFunction(() => !!window.onboardingDemo);
  await context.setOffline(true);
  await page
    .getByRole("button", { name: "Submit onboarding", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Please correct these errors" }),
  ).toBeFocused();
  await fill(page);
  await page.locator("#onboarding-theme").selectOption("bootstrap4");
  await page.locator("#onboarding-theme").selectOption("bootstrap5");
  await page
    .getByRole("button", { name: "Submit onboarding", exact: true })
    .click();
  await expect(page.locator("#onboarding-result")).toContainText('"ok": true');
  expect(
    await page.evaluate(() => window.onboardingDemo.form.session.getData()),
  ).toEqual(good);
  await page
    .getByRole("button", { name: "Reset onboarding", exact: true })
    .click();
  await expect(page.getByLabel("First name", { exact: true })).toHaveValue("");
  expect(external).toEqual([]);
});
test("custom element attributes/properties sync data, theme and read-only without losing reconnect state", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4181/");
  await page.waitForFunction(() => !!window.hostDemo);
  await page.evaluate(() => {
    const element = document.createElement(
      "our-form",
    ) as import("@ourform/element").OurFormElement;
    element.themes = window.hostThemes;
    element.id = "attribute-form";
    element.setAttribute(
      "schema",
      JSON.stringify({
        $formVersion: "1.0",
        id: "attributes",
        display: "form",
        components: [
          {
            id: "attribute-name",
            type: "text",
            key: "name",
            label: "Attribute name",
            validation: { required: true },
          },
        ],
      }),
    );
    element.setAttribute("data", JSON.stringify({ name: "Initial" }));
    element.setAttribute("theme", "bootstrap4");
    document.body.append(element);
  });
  const input = page.getByLabel("Attribute name", { exact: true });
  await expect(input).toHaveValue("Initial");
  await input.fill("Rapid");
  await input.pressSequentially("-controlled-echo", { delay: 0 });
  expect(
    await page.evaluate(
      () =>
        (
          document.querySelector(
            "#attribute-form",
          ) as import("@ourform/element").OurFormElement
        ).data,
    ),
  ).toEqual({ name: "Rapid-controlled-echo" });
  await page.evaluate(() =>
    document
      .querySelector("#attribute-form")!
      .setAttribute("data", '{"name":"Updated"}'),
  );
  await expect(input).toHaveValue("Updated");
  expect(
    await page.evaluate(() => {
      const element = document.querySelector(
        "#attribute-form",
      ) as import("@ourform/element").OurFormElement;
      const input = element.querySelector<HTMLInputElement>("input")!;
      input.focus();
      input.setSelectionRange(2, 2);
      element.theme = "bootstrap5";
      return {
        theme: element.getAttribute("theme"),
        identity: input === document.activeElement,
        caret: input.selectionStart,
      };
    }),
  ).toEqual({ theme: "bootstrap5", identity: true, caret: 2 });
  await page.evaluate(() =>
    document.querySelector("#attribute-form")!.setAttribute("read-only", ""),
  );
  await expect(input).toHaveAttribute("readonly", "");
  await input.pressSequentially("ignored");
  await expect(input).toHaveValue("Updated");
  await page.evaluate(() => {
    const element = document.querySelector(
      "#attribute-form",
    ) as import("@ourform/element").OurFormElement;
    element.readOnly = false;
    element.remove();
    document.body.append(element);
  });
  await expect(input).toHaveValue("Updated");
  await expect(input).not.toHaveAttribute("readonly", "");
  expect(
    await page.evaluate(() => {
      const element = document.querySelector("#attribute-form")!;
      let errors = 0;
      element.addEventListener("of-error", () => errors++);
      element.setAttribute("schema", "{invalid");
      return errors;
    }),
  ).toBe(1);
  await expect(input).toHaveValue("Updated");
  expect(
    await page.evaluate(() => {
      const element = document.querySelector(
        "#attribute-form",
      ) as import("@ourform/element").OurFormElement;
      let errors = 0;
      element.addEventListener("of-error", () => errors++);
      element.setAttribute("schema", "{}");
      element.setAttribute("theme", "missing-theme");
      return {
        errors,
        schema: (element.schema as { id: string }).id,
        theme: element.theme,
      };
    }),
  ).toEqual({ errors: 2, schema: "attributes", theme: "bootstrap5" });
  await page.evaluate(() =>
    document.querySelector("#attribute-form")!.setAttribute("read-only", ""),
  );
  await expect(input).toHaveAttribute("readonly", "");
  await page.evaluate(() =>
    (
      document.querySelector(
        "#attribute-form",
      ) as import("@ourform/element").OurFormElement
    ).reset(),
  );
  await expect(input).toHaveValue("");
  const cleared = await page.evaluate(() => {
    const element = document.querySelector(
      "#attribute-form",
    ) as import("@ourform/element").OurFormElement;
    const schema = element.schema;
    element.removeAttribute("schema");
    const empty =
      element.controller === undefined && element.childNodes.length === 0;
    element.schema = schema;
    return empty;
  });
  expect(cleared).toBe(true);
  await expect(input).toHaveValue("");
});
