import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type {} from "../../apps/playground/sdk-extensions";

for (const theme of ["base", "bootstrap4", "bootstrap5", "tailwind"]) {
  test(`SDK composites/presets: ${theme} conformance and visual`, async ({
    page,
  }) => {
    await page.goto("/sdk-extensions.html");
    await page.waitForFunction(() => !!window.sdkExtensions?.react);
    await page.locator("#theme").selectOption(theme);
    await page.locator("#submit").click();
    const root = page.locator("#form");
    await expect(root.locator(".of-summary")).toBeFocused();
    const group = root.getByRole("group", { name: "Billing address" });
    await expect(group).toHaveAccessibleDescription(
      "Customer-owned address data",
    );
    const street = root.getByLabel("Street", { exact: true });
    await expect(street).toHaveAttribute("aria-invalid", "true");
    await expect(street).toHaveAccessibleDescription("Street is required");
    await expect(root.locator('fieldset[data-field-id="rating"]')).toHaveCount(
      1,
    );
    await expect(root).toHaveScreenshot(`sdk-extensions-${theme}.png`, {
      animations: "disabled",
      scale: "css",
      maxDiffPixelRatio: 0.02,
    });
    await street.fill("10 Main Street");
    await root.getByLabel("City", { exact: true }).fill("New York");
    await root.getByLabel("Postal code", { exact: true }).fill("10001");
    await root.getByLabel("Country", { exact: true }).selectOption("GB");
    await root
      .getByRole("button", { name: "3 of 3 stars", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await expect(
      root.getByRole("button", { name: "3 of 3 stars" }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.locator("#submit").click();
    await expect(page.locator("#result")).toContainText('"ok": true');
    expect(
      await page.evaluate(() => window.sdkExtensions.form.session.getData()),
    ).toEqual({
      billing: {
        street: "10 Main Street",
        city: "New York",
        postal: "10001",
        country: "GB",
      },
      rating: 3,
    });
    // Native registrations are new components too: validate and compare all four themes.
    expect(
      await page.evaluate(
        async () => (await window.sdkExtensions.react!.submit()).ok,
      ),
    ).toBe(false);
    const conventional = page.getByLabel("Conventional input", { exact: true });
    const mapped = page.getByLabel("Mapped input", { exact: true });
    await expect(conventional).toHaveAttribute("aria-invalid", "true");
    await expect(mapped).toHaveAccessibleDescription(
      "Mapped input is required",
    );
    await expect(page.locator("#react")).toHaveScreenshot(
      `sdk-native-${theme}.png`,
      { animations: "disabled", scale: "css", maxDiffPixelRatio: 0.02 },
    );
    await conventional.fill("conventional");
    await mapped.fill("mapped");
    expect(
      await page.evaluate(async () => window.sdkExtensions.react!.submit()),
    ).toEqual({
      ok: true,
      data: { conventional: "conventional", unusual: "mapped" },
    });
    const axe = await new AxeBuilder({ page })
      .include("#form")
      .include("#react")
      .analyze();
    expect(
      axe.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact ?? ""),
      ),
    ).toEqual([]);
  });
}
test("SDK scenarios B/C: conventional one-statement registration and unusual React mapping", async ({
  page,
}) => {
  await page.goto("/sdk-extensions.html");
  await page.waitForFunction(() => !!window.sdkExtensions?.react);
  const conventional = page.getByLabel("Conventional input", { exact: true });
  const mapped = page.getByLabel("Mapped input", { exact: true });
  await conventional.fill("one statement");
  await mapped.fill("mapped detail payload");
  await mapped.press("Tab");
  expect(
    await page.evaluate(() => ({
      data: window.sdkExtensions.react!.session.getData(),
      touched:
        window.sdkExtensions.react!.session.getFieldState("unusual").touched,
    })),
  ).toEqual({
    data: { conventional: "one statement", unusual: "mapped detail payload" },
    touched: true,
  });
  const stable = await page.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>(
      '[data-field-id="unusual"] input',
    )!;
    input.focus();
    window.sdkExtensions.react!.view.setTheme("bootstrap4");
    return (
      input === document.querySelector('[data-field-id="unusual"] input') &&
      document.activeElement === input
    );
  });
  expect(stable).toBe(true);
});
test("SDK scenario E and test kit: four-theme identity, required errors, reset and cleanup", async ({
  page,
}) => {
  await page.goto("/sdk-extensions.html");
  await page.waitForFunction(() => !!window.sdkExtensions?.form);
  await page.locator("#harness").click();
  const root = page.locator("#test-harness");
  await expect(root.locator('fieldset[data-field-id="subject"]')).toHaveCount(
    1,
  );
  expect(
    await page.evaluate(
      async () => (await window.sdkExtensions.harness!.submit()).ok,
    ),
  ).toBe(false);
  await root.getByRole("button", { name: "2 of 3 stars", exact: true }).click();
  const stable = await page.evaluate(async () => {
    const controller = window.sdkExtensions.harness!;
    const button = document.querySelector<HTMLButtonElement>(
      '#test-harness button[aria-label="2 of 3 stars"]',
    )!;
    button.focus();
    for (const theme of ["base", "bootstrap4", "bootstrap5", "tailwind"]) {
      controller.view.setTheme(theme);
      if (
        button !==
          document.querySelector(
            '#test-harness button[aria-label="2 of 3 stars"]',
          ) ||
        document.activeElement !== button
      )
        return false;
    }
    const submitted = await controller.submit();
    if (!submitted.ok || JSON.stringify(submitted.data) !== '{"value":2}')
      return false;
    controller.reset();
    return controller.session.getValue("value") === null;
  });
  expect(stable).toBe(true);
  expect(
    await page.evaluate(() => window.sdkExtensions.harnessValidationCalls),
  ).toBeGreaterThan(0);
  await page.evaluate(() => window.sdkExtensions.harness!.destroy());
  await expect(root).toBeEmpty();
  // Existing populated hosts must be refused without destroying caller content.
  expect(
    await page.evaluate(() => {
      try {
        window.sdkExtensions.renderComponent(
          { model: { type: "test", title: "Test" }, views: {} },
          { host: document.querySelector("#react")! },
        );
        return false;
      } catch (error) {
        return (
          error instanceof Error && error.message.includes("must be empty")
        );
      }
    }),
  ).toBe(true);
});
test("SDK plugins: missing required version is a compile diagnostic", async ({
  page,
}) => {
  await page.goto("/sdk-extensions.html");
  await page.locator("#missing").click();
  await expect(page.locator("#diagnostics")).toContainText(
    '"code": "missing-plugin"',
  );
});
test("component test kit mounts composite dependencies and read-only initial data", async ({
  page,
}) => {
  await page.goto("/sdk-extensions.html");
  await page.waitForFunction(() => !!window.sdkExtensions?.form);
  await page.locator("#harness-kind").selectOption("address");
  await page.locator("#harness-readonly").check();
  await page.locator("#harness").click();
  const root = page.locator("#test-harness");
  const street = root.getByLabel("Street", { exact: true });
  await expect(street).toHaveValue("Guide Street");
  await expect(street).toHaveAttribute("readonly", "");
  await street.focus();
  await page.keyboard.type("ignored");
  await expect(street).toHaveValue("Guide Street");
  expect(
    await page.evaluate(async () => window.sdkExtensions.harness!.submit()),
  ).toEqual({
    ok: true,
    data: {
      value: {
        street: "Guide Street",
        city: "Guide City",
        postal: "01234",
        country: "GB",
      },
    },
  });
  await page.locator("#harness").click();
  await expect(root.locator('[data-field-id="subject/street"]')).toHaveCount(1);
  await page.evaluate(() => window.sdkExtensions.harness!.destroy());
  await expect(root).toBeEmpty();
});
test("SDK scenario F: unchanged portable Rating in the actual Angular host", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4183/");
  await page.waitForFunction(() => !!window.hostDemo);
  const rating = page.getByRole("button", {
    name: "4 of 5 stars",
    exact: true,
  });
  await rating.focus();
  await page.keyboard.press("Enter");
  expect(
    await page.evaluate(() => window.hostDemo.form.session.getValue("rating")),
  ).toBe(4);
  const same = await page.evaluate(() => {
    const control = document.activeElement;
    for (const theme of ["base", "bootstrap4", "bootstrap5", "tailwind"])
      window.hostDemo.form.view.setTheme(theme);
    return control === document.activeElement;
  });
  expect(same).toBe(true);
});
