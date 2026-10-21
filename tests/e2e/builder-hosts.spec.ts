import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
const fixture: unknown = JSON.parse(
  readFileSync(
    new URL("../../fixtures/forms/nested-tabs/customer.json", import.meta.url),
    "utf8",
  ),
);
import type { JsonPatchOp } from "@ourform/builder-core";
function replay(input: unknown, patch: readonly JsonPatchOp[]): unknown {
  let result = structuredClone(input);
  for (const op of patch) {
    if (op.path === "") {
      result = structuredClone("value" in op ? op.value : null);
      continue;
    }
    const parts = op.path
      .slice(1)
      .split("/")
      .map((p) => p.replaceAll("~1", "/").replaceAll("~0", "~"));
    let parent = result as Record<string, unknown>;
    for (const p of parts.slice(0, -1))
      parent = parent[p] as Record<string, unknown>;
    const key = parts.at(-1)!;
    if (Array.isArray(parent)) {
      if (op.op === "remove") parent.splice(Number(key), 1);
      else if (op.op === "add")
        parent.splice(Number(key), 0, structuredClone(op.value));
      else parent[Number(key)] = structuredClone(op.value);
    } else if (op.op === "remove") delete parent[key];
    else parent[key] = structuredClone(op.value);
  }
  return result;
}
import type {} from "../../apps/shared/builder-types";
const hosts = [
  ["DOM", "http://127.0.0.1:4181/builder.html"],
  ["element light", "http://127.0.0.1:4181/builder.html?element"],
  ["element shadow", "http://127.0.0.1:4181/builder.html?element&shadow"],
  ["React", "http://127.0.0.1:4182/builder.html"],
  ["Angular 22", "http://127.0.0.1:4183/builder.html"],
  ["Angular 21", "http://127.0.0.1:4184/builder.html"],
] as const;
for (const [host, url] of hosts)
  for (const theme of ["base", "bootstrap4", "bootstrap5", "tailwind"]) {
    test(`${host} builder ${theme}: Tabs, generated native editors, schema events, context, focus and teardown`, async ({
      page,
    }, testInfo) => {
      await page.goto(url);
      await expect(
        page.getByRole("tab", { name: "Profile", exact: true }),
      ).toBeVisible();
      await page.evaluate((t) => window.builderTheme(t), theme);
      const preview = page.locator('[data-builder-part="preview"]');
      await expect(preview.locator(".of-root")).toHaveAttribute(
        "data-of-theme",
        theme,
      );
      await expect(
        preview.getByRole("textbox", { name: "Full name", exact: true }),
      ).toHaveValue("Ada Lovelace");
      await page.getByRole("tab", { name: "Contact", exact: true }).click();
      await expect(
        preview.getByRole("textbox", { name: "Email", exact: true }),
      ).toHaveValue("ada@example.test");
      await page
        .getByRole("treeitem", { name: "Contact", exact: true })
        .click();
      if (testInfo.project.name === "chromium")
        await expect(preview).toHaveScreenshot(
          `builder-${host.replaceAll(" ", "-")}-${theme}.png`,
          {
            animations: "disabled",
            maxDiffPixelRatio: 0.02,
          },
        );
      const changes = await page.evaluate(() => window.builderChanges.length);
      await page
        .getByRole("button", { name: "Add Native text", exact: true })
        .click();
      await page.getByRole("tab", { name: "Contact", exact: true }).click();
      const native = preview.locator("input[data-builder-native]");
      await expect(native).toBeVisible();
      await expect(preview.locator("[data-builder-context]")).toContainText(
        host === "React"
          ? "react-builder-context"
          : host.startsWith("Angular")
            ? "angular-builder-context"
            : "element-builder-context",
      );
      if (host === "React")
        await expect(preview.locator("[data-builder-session]")).toHaveText(
          "nested-tabs",
        );
      await page
        .locator('[data-property="properties.hint"]')
        .fill("Generated native hint");
      await page.locator('[data-property="properties.hint"]').press("Tab");
      await page.getByRole("tab", { name: "Contact", exact: true }).click();
      await expect(native).toHaveAttribute(
        "placeholder",
        "Generated native hint",
      );
      await page.locator('[data-property="validation.required"]').check();
      await page.getByRole("tab", { name: "Contact", exact: true }).click();
      await expect(native).toHaveAttribute("aria-required", "true");
      await native.fill("Native answer");
      const schemaEvents = await page.evaluate(
        () => window.builderChanges.length,
      );
      expect(schemaEvents).toBe(changes + 3);
      expect(await page.evaluate(() => window.builderDomEvents.length)).toBe(
        schemaEvents,
      );
      expect(
        await page.evaluate(() =>
          window.builderChanges.every((c) => c.patch.length > 0),
        ),
      ).toBe(true);
      await native.focus();
      await native.evaluate((el) =>
        (el as HTMLInputElement).setSelectionRange(2, 5),
      );
      const original = await native.elementHandle();
      await page.evaluate(() => window.builderHost.setTheme("base"));
      await expect(native).toBeFocused();
      expect(await native.evaluate((el, old) => el === old, original)).toBe(
        true,
      );
      expect(
        await native.evaluate((el) => (el as HTMLInputElement).selectionStart),
      ).toBe(2);
      expect(await page.evaluate(() => window.builderChanges.length)).toBe(
        schemaEvents,
      );
      await page.locator('[data-property="disabledWhen"]').fill("true");
      await page.locator('[data-property="disabledWhen"]').press("Tab");
      await page.getByRole("tab", { name: "Contact", exact: true }).click();
      await expect(native).toBeDisabled();
      await page.evaluate(() => {
        const c = window.builderHost;
        c.preview!.session.setValue("contact.native_text", "API answer");
      });
      await expect(native).toHaveValue("API answer");
      await page.getByRole("button", { name: "Undo", exact: true }).click();
      await page.getByRole("tab", { name: "Contact", exact: true }).click();
      await expect(native).toBeEnabled();
      await page.getByRole("button", { name: "Redo", exact: true }).click();
      await page.getByRole("tab", { name: "Contact", exact: true }).click();
      await expect(native).toBeDisabled();
      let replayed: unknown = fixture;
      for (const change of await page.evaluate(() => window.builderChanges)) {
        replayed = replay(replayed, change.patch);
        expect(JSON.stringify(replayed)).toBe(
          JSON.stringify(change.definition),
        );
      }
      const axe = await new AxeBuilder({ page }).analyze();
      expect(
        axe.violations.filter((v) =>
          ["serious", "critical"].includes(v.impact ?? ""),
        ),
      ).toEqual([]);
      const old = await page
        .getByRole("button", { name: "Add Native text", exact: true })
        .elementHandle();
      const count = await page.evaluate(() => window.builderChanges.length);
      await page.evaluate(() => window.builderDetach());
      await expect(page.locator('[data-builder-part="preview"]')).toHaveCount(
        0,
      );
      await old!.evaluate((el) => (el as HTMLElement).click());
      expect(await page.evaluate(() => window.builderChanges.length)).toBe(
        count,
      );
      await page.evaluate(() => window.builderAttach());
      await expect(
        page.getByRole("tab", { name: "Profile", exact: true }),
      ).toBeVisible();
      expect(await page.evaluate(() => window.builderChanges.length)).toBe(
        count,
      );
    });
  }
