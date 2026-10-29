import { expect, test } from "@playwright/test";
import type {} from "../../apps/playground/builder";

test("Cmd/Ctrl deselect announces its caption and retains the remaining primary", async ({
  page,
}) => {
  await page.goto("/builder.html?approved");
  const email = page.locator(
    '.of-builder-outline [role=treeitem][data-drag-id="email"]',
  );
  const customer = page.locator(
    '.of-builder-outline [role=treeitem][data-drag-id="customerType"]',
  );
  await email.focus();
  await page.keyboard.press("Shift+ArrowDown");
  await customer.click({ modifiers: ["ControlOrMeta"] });
  await expect(page.locator(".of-builder-status")).toHaveText(
    "Deselected Customer type",
  );
  await expect(email).toHaveAttribute("aria-selected", "true");
  await expect(customer).toHaveAttribute("aria-selected", "false");
  expect(
    await page.evaluate(() => window.miniBuilder.builder.getState().selection),
  ).toBe("email");
});

test("outline Shift arrows extend and contract selection immediately", async ({
  page,
}) => {
  await page.goto("/builder.html?approved&settingsPreload=none");
  const outline = page.locator(".of-builder-outline");
  const email = outline.locator('[role=treeitem][data-drag-id="email"]');
  await email.focus();
  await page.keyboard.press("Shift+ArrowDown");
  await expect(email).toHaveAttribute("aria-selected", "true");
  await expect(
    outline.locator('[role=treeitem][data-drag-id="customerType"]'),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.locator('#canvas [data-field-id="email"]')).toHaveAttribute(
    "data-of-multiselected",
    "true",
  );
  await expect(page.locator('#canvas [data-field-id="email"]')).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator(".of-builder-status")).toHaveText("2 selected");
  await page.keyboard.press("Shift+ArrowUp");
  await expect(
    outline.locator('[role=treeitem][data-drag-id="customerType"]'),
  ).toHaveAttribute("aria-selected", "false");
  await expect(page.locator(".of-builder-status")).toHaveText("1 selected");
});

test("first command activation opens its frame before download and searches when loaded", async ({
  page,
}) => {
  await page.route(/\/features\/commands\.js(?:\?|$)/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.continue();
  });
  await page.goto("/builder.html?approved&settingsPreload=none");
  await page.locator('#canvas [data-field-id="email"]').focus();
  await page.keyboard.press("Control+k");
  const frame = page.getByRole("dialog", { name: "Commands", exact: true });
  await expect(frame).toBeVisible();
  await expect(frame.locator('[aria-busy="true"]')).toBeVisible();
  const input = frame.getByRole("searchbox", { name: "Search commands" });
  await expect(input).toBeFocused();
  await input.fill("Full name");
  await frame.getByRole("button", { name: "Full name", exact: true }).click();
  await expect(frame).toHaveCount(0);
  await expect(
    page.locator('#canvas [data-field-id="fullName"]'),
  ).toBeFocused();
});

test("command-bar bulk delete is one undo step and restores the selection set", async ({
  page,
}) => {
  await page.goto("/builder.html?approved&settingsPreload=none");
  const outline = page.locator(".of-builder-outline");
  const email = outline.locator('[role=treeitem][data-drag-id="email"]');
  await email.focus();
  await page.keyboard.press("Shift+ArrowDown");
  await page.keyboard.press("Control+k");
  const commands = page.getByRole("dialog", { name: "Commands", exact: true });
  await commands
    .getByRole("searchbox", { name: "Search commands" })
    .fill("Delete");
  await commands
    .getByRole("button", { name: "Delete 2 components", exact: true })
    .click();
  await expect(outline.locator('[data-drag-id="email"]')).toHaveCount(0);
  expect(
    await page.evaluate(
      () => window.miniBuilder.builder.getState().history.past.length,
    ),
  ).toBe(1);
  await page
    .locator(".ofb-header")
    .getByRole("button", { name: "Undo", exact: true })
    .click();
  await expect(
    outline.locator('[role=treeitem][data-drag-id="email"]'),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    outline.locator('[role=treeitem][data-drag-id="customerType"]'),
  ).toHaveAttribute("aria-selected", "true");
});

test("command search retry recovers from its first failed download without losing selection", async ({
  page,
}) => {
  await page.route(/\/features\/commands\.js(?:\?|$)/, (route) =>
    route.abort("failed"),
  );
  await page.goto("/builder.html?approved&settingsPreload=none");
  await page.locator('.of-builder-outline [data-drag-id="email"]').focus();
  await page.keyboard.press("Shift+ArrowDown");
  await page.keyboard.press("ControlOrMeta+k");
  const frame = page.getByRole("dialog", { name: "Commands", exact: true });
  await frame.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    frame.getByRole("searchbox", { name: "Search commands" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  for (const id of ["email", "customerType"])
    await expect(
      page.locator(`.of-builder-outline [data-drag-id="${id}"]`),
    ).toHaveAttribute("aria-selected", "true");
  expect(
    await page.evaluate(
      () => window.miniBuilder.builder.getState().history.past.length,
    ),
  ).toBe(0);
});
