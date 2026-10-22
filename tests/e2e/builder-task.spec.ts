import { test, expect } from "@playwright/test";
import type { Locator } from "@playwright/test";
import type {} from "../../apps/playground/builder";

for (const input of ["mouse", "keyboard"] as const)
  test(`twelve-field task built with ${input} only: nested slots, conditional and SDK component`, async ({
    page,
    browserName,
  }) => {
    await page.setViewportSize({ width: 1600, height: 1600 });
    await page.goto("/builder.html?empty");
    const tab =
      browserName === "webkit" && process.platform === "darwin"
        ? "Alt+Tab"
        : "Tab";
    async function tabTo(target: Locator, backwards = false) {
      for (let step = 0; step < 180; step++) {
        if (
          await target.evaluate((el) => el === el.ownerDocument.activeElement)
        )
          return;
        await page.keyboard.press(backwards ? `Shift+${tab}` : tab);
      }
      throw new Error(
        `Keyboard could not reach ${await target.getAttribute("aria-label")}`,
      );
    }
    async function add(
      title: string,
      label: string,
      destination: Locator,
      condition = false,
    ) {
      const source = page.getByRole("button", {
        name: `Add ${title}`,
        exact: true,
      });
      if (input === "mouse") {
        await destination.scrollIntoViewIfNeeded();
        await source.hover();
        const from = (await source.boundingBox())!,
          to = (await destination.boundingBox())!;
        await page.mouse.move(
          from.x + from.width / 2,
          from.y + from.height / 2,
        );
        await page.mouse.down();
        await page.mouse.move(
          from.x + from.width / 2 + 8,
          from.y + from.height / 2,
        );
        await page.mouse.move(to.x + to.width / 2, to.y + to.height - 8, {
          steps: 12,
        });
        await page.mouse.up();
      } else {
        await tabTo(source, title !== "Tabs");
        await page.keyboard.press("Enter");
      }
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      const name = dialog.getByLabel("Label", { exact: true });
      if (input === "mouse") await name.fill(label);
      else {
        await expect(name).toBeFocused();
        await page.keyboard.press("ControlOrMeta+A");
        await page.keyboard.type(label);
      }
      if (condition) {
        const conditional = dialog.getByRole("tab", {
          name: "Conditional",
          exact: true,
        });
        const expression = dialog.locator('[data-expression="visibleWhen"]');
        if (input === "mouse") await conditional.click();
        else {
          await page.keyboard.press(`Shift+${tab}`);
          await expect(
            dialog.getByRole("tab", { name: "Display", exact: true }),
          ).toBeFocused();
          for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
        }
        const addCondition = expression.getByRole("button", {
          name: "Add condition",
          exact: true,
        });
        if (input === "mouse") await addCondition.click();
        else {
          await tabTo(addCondition);
          await page.keyboard.press("Enter");
        }
        const field = expression.getByRole("combobox", {
          name: "Condition field",
          exact: true,
        });
        const value = expression.getByLabel("Comparison value", {
          exact: true,
        });
        if (input === "mouse") {
          await field.fill("Customer type");
          await field.press("Enter");
          await value.fill("business");
        } else {
          await tabTo(field, true);
          await page.keyboard.press("ControlOrMeta+A");
          await page.keyboard.type("Customer type");
          await page.keyboard.press("Enter");
          await expect(field).toHaveValue("Customer type");
          await tabTo(value);
          await page.keyboard.type("business");
        }
      }
      if (input === "mouse")
        await dialog.getByRole("button", { name: "Save", exact: true }).click();
      else await page.keyboard.press("ControlOrMeta+Enter");
      await expect(dialog).toHaveCount(0);
      return page.evaluate(
        () => window.miniBuilder.builder.getState().selection!,
      );
    }
    const root = page.locator("#canvas .ofb-empty-slot");
    const tabs = await add("Tabs", "Customer onboarding", root);
    const slot = (owner: string, name: string) =>
      page
        .locator(
          `#canvas [data-of-slot-owner="${owner}"][data-of-slot="${name}"], #canvas .ofb-empty-slot[data-drop-parent="${owner}"][data-drop-slot="${name}"]`,
        )
        .first();
    const panel = await add("Panel", "Contact", slot(tabs, "first"));
    const columns = await add(
      "Columns",
      "Contact details",
      slot(panel, "children"),
    );
    for (const [title, label] of [
      ["Text", "Full name"],
      ["Email", "Email"],
      ["Text", "Phone"],
      ["Text", "Customer type"],
      ["Text", "Company name"],
      ["Text", "Tax ID"],
    ])
      await add(
        title!,
        label!,
        slot(columns, "column_0"),
        label === "Company name",
      );
    if (input === "keyboard") {
      const tax = page.getByRole("treeitem", { name: "Tax ID", exact: true });
      await tabTo(tax);
      await page.keyboard.press("ArrowDown");
      await expect(
        page.getByRole("treeitem", { name: "Column 2", exact: true }),
      ).toBeFocused();
      await page.keyboard.press("Enter");
    }
    for (const [title, label] of [
      ["Customer reference", "Customer reference"],
      ["Rating", "Experience"],
      ["Select", "Industry"],
      ["Checkbox", "Terms"],
      ["Text", "Order reference"],
      ["Textarea", "Notes"],
    ])
      await add(title!, label!, slot(columns, "column_1"));
    const state = await page.evaluate(() => {
      const c = window.miniBuilder;
      return {
        definition: c.builder.getState().definition,
        count: c.preview!.session.form.nodes.filter((n) => n.model.value)
          .length,
        history: c.builder.getState().history.past.length,
      };
    });
    expect(state.count).toBe(12);
    expect(state.history).toBe(15);
    const grid =
      state.definition.components[0]!.components![0]!.components![0]!;
    expect(grid.columns!.map((c) => c.components.length)).toEqual([6, 6]);
    expect(grid.columns![0]!.components[4]!.visibleWhen).toEqual([
      "eq",
      { ref: grid.columns![0]!.components[3]!.id },
      "business",
    ]);
    expect(grid.columns![1]!.components[0]!.type).toBe(
      "acme.customer-reference",
    );
    const previewTab = page.getByRole("tab", { name: "Preview", exact: true });
    if (input === "mouse") await previewTab.click();
    else {
      const build = page.getByRole("tab", { name: "Build", exact: true });
      await tabTo(build, true);
      // Logic is disabled: arrows skip it and reach Data, then Preview.
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowRight");
    }
    await expect(previewTab).toHaveAttribute("aria-selected", "true");
    const preview = page.locator("#preview"),
      type = preview.getByRole("textbox", {
        name: "Customer type",
        exact: true,
      });
    await expect(
      preview.getByRole("textbox", { name: "Company name", exact: true }),
    ).toBeHidden();
    if (input === "mouse") await type.fill("business");
    else {
      await tabTo(type);
      await page.keyboard.type("business");
    }
    await expect(
      preview.getByRole("textbox", { name: "Company name", exact: true }),
    ).toBeVisible();
    await expect(
      preview.getByRole("textbox", { name: "Customer reference", exact: true }),
    ).toBeVisible();
  });
