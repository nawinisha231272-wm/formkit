import { test, expect } from "@playwright/test";
import type { Locator } from "@playwright/test";
import type {} from "../../apps/playground/builder";

// One image per case bounds emulated recording time. Each case retains the entire
// original selection/commands/bulk/inline/quick-add workflow and history assertions.
for (const theme of [
  "base",
  "bootstrap4",
  "bootstrap5",
  "tailwind",
  "material",
])
  for (const state of [
    "selection",
    "commands",
    "bulk-editor",
    ...(["bootstrap5", "material"].includes(theme)
      ? ["inline-caption", "quick-add"]
      : []),
  ])
    test(`M09b+ authoring visual states: ${theme} ${state}`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width: 1440, height: 960 });
      await page.goto(`/builder.html?approved&theme=${theme}`);
      await page.evaluate(() => document.fonts.ready);
      const picture = async (host: Locator, current: string) => {
        if (info.project.name === "chromium" && current === state)
          await expect(host).toHaveScreenshot(`plus-${current}-${theme}.png`, {
            animations: "disabled",
            maxDiffPixelRatio: 0.02,
          });
      };
      const outline = page.locator(".of-builder-outline");
      await outline.locator('[role=treeitem][data-drag-id="email"]').focus();
      await page.keyboard.press("Shift+ArrowDown");
      await expect(
        outline.locator("[role=treeitem][aria-selected=true][data-drag-id]"),
      ).toHaveCount(2);
      await picture(
        page.locator('[data-builder-part="canvas-panel"]'),
        "selection",
      );
      await page.keyboard.press("ControlOrMeta+k");
      const commands = page.getByRole("dialog", {
        name: "Commands",
        exact: true,
      });
      await expect(commands.getByRole("searchbox")).toBeFocused();
      await commands.getByRole("searchbox").fill("Edit");
      await expect(
        commands.getByRole("option", {
          name: "Edit 2 components",
          exact: true,
        }),
      ).toBeVisible();
      await picture(commands, "commands");
      await commands
        .getByRole("option", { name: "Edit 2 components", exact: true })
        .click();
      const bulk = page.getByRole("dialog", {
        name: /^(Edit selected components|Edit \d+ components: .+)$/,
        exact: true,
      });
      await expect(
        bulk.getByLabel("Description", { exact: true }),
      ).toBeVisible();
      await picture(bulk, "bulk-editor");
      await bulk.getByRole("button", { name: "Cancel", exact: true }).click();
      if (theme === "bootstrap5" || theme === "material") {
        await outline.locator('[role=treeitem][data-drag-id="email"]').focus();
        const field = page.locator('#canvas [data-field-id="email"]');
        await field.locator(":scope > .of-label").dblclick();
        await expect(
          field.getByRole("textbox", { name: "Edit label", exact: true }),
        ).toBeFocused();
        await picture(field, "inline-caption");
        await page.keyboard.press("Escape");
        await field.hover();
        await field
          .locator(':scope > .ofb-quick-add[data-drop-index="0"]')
          .click();
        const quick = page.getByRole("dialog", {
          name: "Add component",
          exact: true,
        });
        await expect(
          quick.getByRole("searchbox", {
            name: "Search components",
            exact: true,
          }),
        ).toBeFocused();
        await picture(quick, "quick-add");
        await page.keyboard.press("Escape");
      }
      expect(
        await page.evaluate(
          () => window.miniBuilder.builder.getState().history.past.length,
        ),
      ).toBe(0);
    });
