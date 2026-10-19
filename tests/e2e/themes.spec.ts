import {
  checkThemeConformance,
  checkReadOnlyTheme,
} from "@ourform/testing/playwright";
import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";
import { themeNames, themeModes } from "@ourform/testing";
import type {} from "../../apps/playground/theme-probe";
for (const theme of themeNames) {
  for (const mode of ["light", "dark"])
    test(`${theme} ${mode}: playground axe and unchanged Rating`, async ({
      page,
    }) => {
      await page.goto("/");
      await page.locator("#theme").selectOption(theme);
      await page.locator("#mode").selectOption(mode);
      const legend = page.locator("#form fieldset legend");
      await expect(legend.locator("span").first()).toHaveText(
        "Customer rating",
      );
      await expect(page.locator("#form fieldset")).toHaveAccessibleName(
        "Customer rating",
      );
      await page.getByRole("button", { name: "4 of 5 stars" }).click();
      await expect(
        page.getByRole("button", { name: "4 of 5 stars" }),
      ).toHaveAttribute("aria-pressed", "true");
      const results = await new AxeBuilder({ page }).analyze();
      expect(
        results.violations.filter((v) =>
          ["serious", "critical"].includes(v.impact ?? ""),
        ),
      ).toEqual([]);
    });
  for (const mode of themeModes)
    test(`${theme} ${mode}: conformance states and visual snapshot`, async ({
      page,
    }) => {
      await page.goto(
        `/theme-probe.html?theme=${theme}&mode=${mode}${mode === "high-contrast" ? "&rtl" : ""}`,
      );
      await page.waitForFunction(() => !!window.themeProbe);
      await checkThemeConformance(page, { snapshot: `${theme}-${mode}.png` });
    });
  test(`${theme}: read-only prevents text, checkbox and Rating edits`, async ({
    page,
  }) => {
    await page.goto(`/theme-probe.html?theme=${theme}&readonly`);
    await page.waitForFunction(() => !!window.themeProbe);
    await checkReadOnlyTheme(page, { snapshot: `${theme}-readonly.png` });
  });
}
test("theme switches preserve typing, focus, caret, field identity and all current session state", async ({
  page,
}) => {
  await page.goto("/theme-probe.html");
  await page.waitForFunction(() => !!window.themeProbe);
  await page.evaluate(() => window.themeProbe.view.submit());
  const input = page.getByLabel("Name", { exact: true });
  await input.fill("abcd");
  await input.press("ArrowLeft");
  const result = await page.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>(
      '[data-field-id="name"] input',
    )!;
    const before = JSON.stringify(
      window.themeProbe.session.form.nodes.map((node) =>
        window.themeProbe.session.getFieldState(node.node.id),
      ),
    );
    const data = JSON.stringify(window.themeProbe.session.getData());
    for (const theme of ["bootstrap5", "tailwind", "base"]) {
      window.themeProbe.view.setTheme(theme);
      window.themeProbe.view.setMode("dark");
    }
    return {
      stable: document.querySelector('[data-field-id="name"] input') === input,
      focused: document.activeElement === input,
      caret: input.selectionStart,
      states:
        JSON.stringify(
          window.themeProbe.session.form.nodes.map((node) =>
            window.themeProbe.session.getFieldState(node.node.id),
          ),
        ) === before,
      data: JSON.stringify(window.themeProbe.session.getData()) === data,
    };
  });
  expect(result).toEqual({
    stable: true,
    focused: true,
    caret: 3,
    states: true,
    data: true,
  });
  await page.keyboard.type("X");
  await expect(input).toHaveValue("abcXd");
});
test("two mounts isolate tokens, classes, ids and theme changes", async ({
  page,
}) => {
  await page.goto("/theme-probe.html");
  await page.waitForFunction(() => !!window.themeProbe);
  const result = await page.evaluate(() => {
    const second = window.themeProbe.second();
    const firstInput = document.querySelector<HTMLInputElement>(
      '#form [data-field-id="name"] input',
    )!;
    const secondInput = document.querySelector<HTMLInputElement>(
      '#second [data-field-id="name"] input',
    )!;
    const before = getComputedStyle(secondInput).backgroundColor;
    window.themeProbe.view.setTheme("bootstrap5");
    window.themeProbe.view.setMode("high-contrast");
    const firstBg = getComputedStyle(firstInput).backgroundColor;
    const result = {
      unique: firstInput.id !== secondInput.id,
      isolated: getComputedStyle(secondInput).backgroundColor === before,
      distinct: firstBg !== before,
      secondTheme: document
        .querySelector("#second")!
        .getAttribute("data-of-theme"),
      live: document.querySelectorAll('[aria-live="polite"]').length,
    };
    second.destroy();
    return result;
  });
  expect(result).toEqual({
    unique: true,
    isolated: true,
    distinct: true,
    secondTheme: "tailwind",
    live: 2,
  });
});
test("failed native submission focuses summary; its links focus through focusRef", async ({
  page,
}) => {
  await page.goto("/theme-probe.html");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  const summary = page.getByRole("region", {
    name: "Please correct these errors",
  });
  await expect(summary).toBeFocused();
  await summary.getByRole("link", { name: "Rating is required" }).click();
  await expect(
    page.getByRole("button", { name: "1 of 5 stars" }),
  ).toBeFocused();
  await expect(page.locator('[aria-live="polite"]')).toContainText("2 errors");
});
test("keyboard-only feedback completion and submission", async ({
  page,
  browserName,
}) => {
  const tab =
    browserName === "webkit" && process.platform === "darwin"
      ? "Alt+Tab"
      : "Tab";
  await page.goto("/");
  // Reach the field using the document's real Tab order, with no mouse or programmatic focus.
  for (let step = 0; step < 12; step++) {
    await page.keyboard.press(tab);
    if (
      await page
        .getByLabel("Name", { exact: true })
        .evaluate((el) => el === document.activeElement)
    )
      break;
  }
  await expect(page.getByLabel("Name", { exact: true })).toBeFocused();
  await page.keyboard.type("Keyboard User");
  for (let step = 0; step < 4; step++) await page.keyboard.press(tab);
  await expect(
    page.getByRole("button", { name: "4 of 5 stars" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  for (let step = 0; step < 3; step++) await page.keyboard.press(tab);
  await expect(
    page.getByRole("button", { name: "Submit", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#output")).toContainText('"ok": true');
  await expect(page.locator("#output")).toContainText('"rating": 4');
});

test("M02 wrapper retains shipped names, and unmount restores attributes and releases submit listeners", async ({
  page,
}) => {
  await page.goto("/theme-probe.html");
  await page.waitForFunction(() => !!window.themeProbe);
  const result = await page.evaluate(() => {
    const view = window.themeProbe.legacy();
    const second = document.querySelector("#second")!;
    const legacyId = second.querySelector("input")!.id;
    const initial = second.getAttribute("data-of-theme");
    view.setTheme("tailwind");
    const changed = second.getAttribute("data-of-theme");
    view.destroy();
    view.unmount();
    const root = document.querySelector("#form")!;
    window.themeProbe.view.unmount();
    const event = new Event("submit", { cancelable: true, bubbles: true });
    const noListener = root.dispatchEvent(event);
    return {
      legacyId,
      initial,
      changed,
      empty: second.children.length === 0 && root.children.length === 0,
      attributesRestored:
        !root.hasAttribute("data-of-instance") &&
        !root.hasAttribute("data-of-theme") &&
        !root.hasAttribute("class"),
      noListener,
    };
  });
  expect(result).toEqual({
    legacyId: "name",
    initial: "bootstrap5",
    changed: "tailwind",
    empty: true,
    attributesRestored: true,
    noListener: true,
  });
});

test("mounting does not require secure-context randomUUID support", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(Crypto.prototype, "randomUUID", { value: undefined }),
  );
  await page.goto("/");
  await expect(page.getByLabel("Name", { exact: true })).toBeVisible();
});

test("Bootstrap preset works with the real Bootstrap 5 stylesheet installed", async ({
  page,
}) => {
  await page.goto("/theme-probe.html?theme=bootstrap5&bootstrap");
  await page.waitForFunction(() => !!window.themeProbe);
  await checkThemeConformance(page, { snapshot: "bootstrap5-host-css.png" });
  await expect(page.locator('[data-field-id="name"] .of-errors')).toBeVisible();
  const checkbox = page.getByLabel("Accept", { exact: true });
  await checkbox.check();
  await expect(checkbox).toBeChecked();
  const within = await checkbox.evaluate((el) => {
    const field = el
      .closest('[data-field-id="accept"]')!
      .getBoundingClientRect();
    const box = el.getBoundingClientRect();
    return box.left >= field.left && box.right <= field.right;
  });
  expect(within).toBe(true);
});
