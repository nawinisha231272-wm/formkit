import { test, expect } from "@playwright/test";
import type {} from "../../apps/playground/builder";
const actions = [
  ["Edit", "Enter"],
  ["Move", "Space"],
  ["Duplicate", "ControlOrMeta+d"],
  ["Copy", "ControlOrMeta+c"],
  ["Paste", "ControlOrMeta+v"],
  ["Edit JSON", "ControlOrMeta+Shift+j"],
  ["More", "Shift+F10"],
  ["Delete", "Delete"],
] as const;
for (const route of ["toolbar", "context", "shortcut"] as const)
  for (const [action, key] of actions)
    test(`${route} ${action} uses the shared atomic action path`, async ({
      page,
    }) => {
      await page.goto("/builder.html");
      const rating = page.locator('#canvas [data-field-id="cmp_rating"]');
      const before = await page.evaluate(() =>
        JSON.stringify(window.miniBuilder.builder.getState().definition),
      );
      const history = () =>
        page.evaluate(
          () => window.miniBuilder.builder.getState().history.past.length,
        );
      if (action === "Paste") {
        await rating.focus();
        await page.keyboard.press("ControlOrMeta+c");
      }
      if (route === "toolbar") {
        if (["Copy", "Paste", "Edit JSON"].includes(action)) {
          await rating
            .getByRole("button", { name: "More", exact: true })
            .click();
          await page
            .locator(".ofb-action-menu")
            .getByRole("button", { name: action, exact: true })
            .click();
        } else
          await rating
            .getByRole("button", { name: action, exact: true })
            .click();
      } else if (route === "context") {
        await rating.click({ button: "right" });
        if (action !== "More")
          await page
            .getByRole("menuitem", { name: action, exact: true })
            .click();
      } else {
        await rating.focus();
        await page.keyboard.press(key);
      }
      if (action === "Edit" || action === "Edit JSON") {
        expect(await history()).toBe(0);
        const dialog = page.getByRole("dialog");
        if (action === "Edit")
          await dialog
            .getByLabel("Label", { exact: true })
            .fill("Edited rating");
        else {
          const input = dialog.getByRole("textbox", {
            name: "Edit JSON",
            exact: true,
          });
          const node = JSON.parse(await input.inputValue()) as Record<
            string,
            unknown
          >;
          node.label = "Edited rating";
          await input.fill(JSON.stringify(node));
        }
        await dialog.getByRole("button", { name: "Save", exact: true }).click();
      } else if (action === "Move") {
        await expect(page.locator(".of-builder")).toHaveAttribute(
          "data-ofb-dragging",
          "true",
        );
        expect(await history()).toBe(0);
        await page.keyboard.press("ArrowUp");
        await page.keyboard.press("Space");
        expect(
          await page.evaluate(
            () =>
              window.miniBuilder.builder.getState().definition.components[0]!
                .id,
          ),
        ).toBe("cmp_rating");
      } else if (action === "More") {
        expect(await history()).toBe(0);
        await page
          .locator(".ofb-action-menu")
          .getByRole(route === "toolbar" ? "button" : "menuitem", {
            name: "Wrap in layout",
            exact: true,
          })
          .click();
        expect(
          await page.evaluate(
            () =>
              window.miniBuilder.builder.getState().definition.components[1]!
                .type,
          ),
        ).toBe("panel");
      } else if (action === "Copy") {
        expect(await history()).toBe(0);
        await rating.focus();
        await page.keyboard.press("ControlOrMeta+v");
      }
      await expect(page.getByRole("dialog")).toHaveCount(0);
      expect(await history()).toBe(1);
      await page
        .locator(".ofb-header-actions")
        .getByRole("button", { name: "Undo", exact: true })
        .click();
      expect(
        await page.evaluate(() =>
          JSON.stringify(window.miniBuilder.builder.getState().definition),
        ),
      ).toBe(before);
      await page.getByRole("button", { name: "Redo", exact: true }).click();
      expect(await history()).toBe(1);
    });
