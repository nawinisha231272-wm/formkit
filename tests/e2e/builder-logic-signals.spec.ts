import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type {} from "../../apps/playground/builder";

for (const theme of [
  "base",
  "bootstrap4",
  "bootstrap5",
  "tailwind",
  "material",
])
  test(`${theme}: cached root Build badges and inherited chips agree with runtime without loading Logic UI`, async ({
    page,
  }) => {
    const errors: string[] = [],
      features: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (/features\/(?:logic|map)(?:[.?/-]|$)/.test(r.url()))
        features.push(r.url());
    });
    await page.goto(`/builder.html?signals&theme=${theme}`);
    const source = page.locator('#canvas [data-field-id="source"]');
    await expect(source.locator(":scope > .ofb-signal-row")).toHaveText(
      "Controls 3 fields",
    );
    const child = page.locator('#canvas [data-field-id="a"]');
    await expect(child.locator(":scope > .ofb-signal-row")).toHaveText(
      "Shown when Customer type is business",
    );
    await source
      .locator("input")
      .evaluate((el) => el.setAttribute("data-identity", "source"));
    const before = await page.evaluate(() =>
      JSON.stringify(window.miniBuilder.builder.getState().definition),
    );
    for (const value of ["business", "personal", "business"]) {
      const state = await page.evaluate((value) => {
        const session = window.miniBuilder.preview!.session;
        session.setValue(session.form.byId.source!.path, value);
        return {
          visible: session.getFieldState("a").visible,
          required: session.getFieldState("a").required,
        };
      }, value);
      expect(state).toEqual({
        visible: value === "business",
        required: value === "business",
      });
      await expect(source.locator("input")).toHaveAttribute(
        "data-identity",
        "source",
      );
      await expect(source.locator(":scope > .ofb-signal-row")).toHaveText(
        "Controls 3 fields",
      );
    }
    await page.evaluate(() => window.miniBuilder.builder.select("a"));
    await expect(page.locator(".ofb-component-info")).toContainText(
      "Customer type is business",
    );
    expect(
      await page.evaluate(() =>
        JSON.stringify(window.miniBuilder.builder.getState().definition),
      ),
    ).toBe(before);
    expect(features).toEqual([]);
    expect(errors).toEqual([]);
    const axe = await new AxeBuilder({ page }).include(".of-builder").analyze();
    expect(
      axe.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact ?? ""),
      ),
    ).toEqual([]);
  });
