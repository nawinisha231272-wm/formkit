import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";
import type {} from "../../apps/playground/builder";

async function positioned(menu: Locator) {
  await expect(menu).toBeVisible();
  expect(
    await menu.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return {
        position: getComputedStyle(node).position,
        inside:
          rect.left >= 0 &&
          rect.top >= 0 &&
          rect.right <= innerWidth &&
          rect.bottom <= innerHeight,
      };
    }),
  ).toEqual({
    position: expect.stringMatching(/^(absolute|fixed)$/),
    inside: true,
  });
}
for (const theme of [
  "base",
  "bootstrap4",
  "bootstrap5",
  "tailwind",
  "material",
]) {
  for (const state of ["context", "component-more", "header-more"])
    test(`${theme}: ${state} and all open popovers stay styled inside the viewport`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`/builder.html?approved&theme=${theme}`);
      await page.evaluate(() => document.fonts.ready);
      const field = page.locator('#canvas [data-field-id="email"]');
      await field.focus();
      const picture = async (menu: Locator, name: string) => {
        await positioned(menu);
        if (info.project.name === "chromium" && name === state)
          await expect(page.locator(".of-builder")).toHaveScreenshot(
            `review-${name}-${theme}.png`,
            { animations: "disabled", maxDiffPixelRatio: 0.02 },
          );
        await page.keyboard.press("Escape");
      };
      await field.press("Shift+F10");
      await picture(page.locator(".ofb-action-menu"), "context");
      await field.getByRole("button", { name: "More", exact: true }).click();
      await picture(page.locator(".ofb-action-menu"), "component-more");
      await page.locator(".ofb-header-menu > summary").click();
      await picture(page.locator(".ofb-header-preferences"), "header-more");
      // A scrolled/bottom anchor must clamp the entire menu, not merely its origin.
      await field.scrollIntoViewIfNeeded();
      await field.press("Shift+F10");
      await positioned(page.locator(".ofb-action-menu"));
    });
}

test("command results keep search focus, active descendant, icons and jump location; Enter runs the active row", async ({
  page,
}) => {
  await page.goto("/builder.html?approved");
  await page.locator('#canvas [data-field-id="email"]').focus();
  await page.keyboard.press("ControlOrMeta+k");
  const frame = page.getByRole("dialog", { name: "Commands", exact: true });
  const input = frame.getByRole("searchbox");
  await input.fill("no results xyz");
  await expect(frame.getByRole("option")).toHaveCount(0);
  await page.keyboard.press("ArrowDown");
  await input.fill("Email");
  await expect(input).toHaveAttribute(
    "aria-activedescendant",
    (await frame.getByRole("option").first().getAttribute("id")) ?? "",
  );
  const jump = frame
    .getByRole("group", { name: "Jump to component", exact: true })
    .getByRole("option", { name: "Email", exact: true });
  await expect(jump).toContainText(/Email.*—.*Contact details.*Column 2/);
  await expect(jump.locator("svg")).toHaveCount(1);
  await expect(input).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(input).toHaveAttribute(
    "aria-activedescendant",
    (await jump.getAttribute("id")) ?? "",
  );
  await expect(jump).toHaveAttribute("aria-selected", "true");
  const axe = await new AxeBuilder({ page }).include(".of-builder").analyze();
  expect(
    axe.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
  await page.keyboard.press("Enter");
  await expect(frame).toHaveCount(0);
  await expect(page.locator('#canvas [data-field-id="email"]')).toBeFocused();
});

test("multi-selection toolbar and context actions name their count; bulk title and panel are not duplicated", async ({
  page,
}) => {
  await page.goto("/builder.html?approved");
  const row = page.locator('.of-builder-outline [data-drag-id="email"]');
  await row.focus();
  await page.keyboard.press("Shift+ArrowDown");
  const field = page.locator('#canvas [data-field-id="customerType"]');
  await expect(
    field.getByRole("button", { name: "Delete 2 components", exact: true }),
  ).toBeVisible();
  await expect(
    field.getByRole("button", { name: "Duplicate 2 components", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Shift+F10");
  await expect(
    page.getByRole("menuitem", { name: "Delete 2 components", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("ControlOrMeta+k");
  const commands = page.getByRole("dialog", { name: "Commands", exact: true });
  await commands.getByRole("searchbox").fill("Edit");
  await commands
    .getByRole("option", { name: "Edit 2 components", exact: true })
    .click();
  const editor = page.getByRole("dialog", {
    name: "Edit 2 components: Email, Customer type",
    exact: true,
  });
  await expect(
    editor.getByRole("heading", {
      name: "Edit 2 components: Email, Customer type",
    }),
  ).toBeVisible();
  await expect(
    editor.locator('[role="tabpanel"] legend:not(.of-sr-only)'),
  ).toHaveCount(0);
  await expect(editor.getByLabel("Description", { exact: true })).toBeVisible();
});

test("inline caption commits announce the old and new names", async ({
  page,
}) => {
  await page.goto("/builder.html?approved");
  const field = page.locator('#canvas [data-field-id="email"]');
  await field.locator(":scope > .of-label").dblclick();
  await field
    .getByRole("textbox", { name: "Edit label", exact: true })
    .fill("Mobile phone");
  await page.keyboard.press("Enter");
  await expect(page.locator(".of-builder-status")).toHaveText(
    "Renamed Email to Mobile phone",
  );
  await expect(page.locator(".of-builder-toast")).toHaveText(
    "Renamed Email to Mobile phone",
  );
});

for (const feature of ["commands", "quick-add", "bulk-editor"]) {
  test(`${feature}: loading toast exists only while its feature is waiting`, async ({
    page,
  }) => {
    let release!: () => void;
    const waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(
      new RegExp(`/features/${feature}\\.js(?:\\?|$)`),
      async (route) => {
        await waiting;
        await route.continue();
      },
    );
    await page.goto("/builder.html?approved&settingsPreload=none");
    const field = page.locator('#canvas [data-field-id="email"]');
    if (feature === "quick-add") {
      await field.focus();
      await field.hover();
      await field
        .locator(':scope > .ofb-quick-add[data-drop-index="0"]')
        .click();
    } else {
      await page.locator('.of-builder-outline [data-drag-id="email"]').focus();
      if (feature === "bulk-editor")
        await page.keyboard.press("Shift+ArrowDown");
      await page.keyboard.press("ControlOrMeta+k");
      if (feature === "bulk-editor") {
        const commands = page.getByRole("dialog", {
          name: "Commands",
          exact: true,
        });
        await commands.getByRole("searchbox").fill("Edit");
        await commands
          .getByRole("option", { name: "Edit 2 components", exact: true })
          .click();
      }
    }
    const toast = page.locator(".of-builder-toast");
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("Loading");
    release();
    const mounted =
      feature === "commands"
        ? page.getByRole("searchbox", { name: "Search commands" })
        : feature === "quick-add"
          ? page
              .getByRole("dialog", { name: "Add component", exact: true })
              .getByRole("searchbox")
          : page
              .getByRole("dialog", { name: /^Edit 2 components:/ })
              .getByLabel("Description", { exact: true });
    await expect(mounted).toBeVisible();
    await expect(toast).toBeHidden();
    // Completed loading clears its message; ordinary toast expiry preserves announcements.
    await expect(page.locator(".of-builder-status")).toHaveText("");
  });
}

test("unchanged toolbar focus keeps tooltip text nodes; selection counts still update", async ({
  page,
}) => {
  await page.goto("/builder.html?approved");
  const field = page.locator('#canvas [data-field-id="email"]');
  await field.focus();
  const stable = await field.evaluate(async (root) => {
    const tooltip = root.querySelector(
      ':scope > .ofb-component-toolbar [data-ofb-action="move"] [role="tooltip"]',
    )!;
    const text = tooltip.firstChild;

    let mutations = 0;
    const observer = new MutationObserver((records) => {
      mutations += records.length;
    });
    observer.observe(tooltip, { childList: true });
    // Refresh the retained toolbar through actual single-selection changes.
    root.ownerDocument
      .querySelector<HTMLElement>('#canvas [data-field-id="customerType"]')!
      .focus();
    (root as HTMLElement).focus();
    await new Promise(requestAnimationFrame);
    observer.disconnect();
    return {
      sameText: text === tooltip.firstChild,
      mutations,
      connected: tooltip.isConnected,
    };
  });
  expect(stable).toEqual({ sameText: true, mutations: 0, connected: true });
  await page.locator('.of-builder-outline [data-drag-id="email"]').focus();
  await page.keyboard.press("Shift+ArrowDown");
  const move = field.getByRole("button", {
    name: "Move 2 components",
    exact: true,
    includeHidden: true,
  });
  await expect(move.locator('[role="tooltip"]')).toHaveText(
    "Move 2 components",
  );
});
