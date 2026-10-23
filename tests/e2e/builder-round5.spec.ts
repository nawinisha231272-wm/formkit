import { test, expect } from "@playwright/test";
import type {} from "../../apps/playground/builder";

for (const theme of [
  "base",
  "bootstrap4",
  "bootstrap5",
  "tailwind",
  "material",
])
  test(`${theme}: half-column tags preserve labels up to 16 characters on selection and hover`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/builder.html?approved&theme=${theme}&chrome=match-form`);
    await page.getByRole("tab", { name: "Build", exact: true }).click();
    const field = page.locator('#canvas [data-field-id="fullName"]');
    for (const label of ["Email", "Full name", "WWWWWWWWWWWWWWWW"]) {
      await field.focus();
      await page.keyboard.press("Enter");
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Label", { exact: true }).fill(label);
      await dialog.getByRole("tab", { name: "Data", exact: true }).click();
      await dialog.getByLabel("Data key", { exact: true }).fill("fullName");
      await dialog.getByRole("button", { name: "Save", exact: true }).click();
      for (const state of ["selection", "hover"]) {
        await field.focus();
        if (state === "hover") {
          await page.locator('#canvas [data-field-id="email"]').focus();
          await page
            .getByRole("searchbox", { name: "Search components", exact: true })
            .focus();
          await field.hover();
        }
        const tag = field.locator(":scope > .ofb-selection-label");
        await expect(tag).toBeVisible();
        await expect(tag).toHaveAttribute("title", `${label} · fullName`);
        await expect
          .poll(() =>
            tag.evaluate((el) => {
              const range = document.createRange();
              range.selectNodeContents(el.firstChild!);
              const r = range.getBoundingClientRect(),
                box = el.getBoundingClientRect();
              return (
                r.left >= box.left &&
                r.right <=
                  box.right - parseFloat(getComputedStyle(el).paddingRight)
              );
            }),
          )
          .toBe(true);
        const toolbar = field.locator(":scope > .ofb-component-toolbar");
        if (label.length === 16)
          await expect(toolbar).toHaveAttribute("data-ofb-compact", "");
        await expect(toolbar.locator(":scope > button:visible")).toHaveCount(
          (await toolbar.getAttribute("data-ofb-compact")) === null ? 8 : 5,
        );
        for (const action of ["Edit", "Move", "Duplicate", "Delete", "More"])
          await expect(
            toolbar.getByRole("button", { name: action, exact: true }),
          ).toBeVisible();
      }
    }
    await field.getByRole("button", { name: "More", exact: true }).click();
    for (const action of ["Copy", "Paste", "Edit JSON"])
      await expect(
        page.getByRole("menuitem", { name: action, exact: true }),
      ).toBeVisible();
  });

for (const command of ["add", "duplicate", "delete", "paste", "wrap", "edit"])
  test(`${command} replaces the preceding builder command announcement`, async ({
    page,
  }) => {
    await page.goto("/builder.html?approved");
    const email = page.locator('#canvas [data-field-id="email"]');
    await email.focus();
    await page.keyboard.press("ControlOrMeta+c");
    await expect(page.locator("#diagnostics")).toContainText("Copied Email");
    let expected: string;
    switch (command) {
      case "add":
        await page.locator('#palette [data-type="email"]').click();
        await page
          .getByRole("dialog")
          .getByRole("button", { name: "Save", exact: true })
          .click();
        expected = "Added Email 2";
        break;
      case "duplicate":
        await page.keyboard.press("ControlOrMeta+d");
        expected = "Duplicated Email";
        break;
      case "delete":
        await page.locator('#canvas [data-field-id="phone"]').focus();
        await page.keyboard.press("Delete");
        expected = "Deleted Phone";
        break;
      case "paste":
        await page.keyboard.press("ControlOrMeta+v");
        expected = "Pasted Email";
        break;
      case "wrap":
        await page.keyboard.press("Shift+F10");
        await page
          .getByRole("menuitem", { name: "Wrap in layout", exact: true })
          .click();
        expected = "Wrapped Email";
        break;
      default:
        await page.keyboard.press("Enter");
        await page
          .getByRole("dialog")
          .getByLabel("Tooltip", { exact: true })
          .fill("New hint");
        await page
          .getByRole("dialog")
          .getByRole("button", { name: "Save", exact: true })
          .click();
        expected = "Saved settings for Email";
    }
    await expect(page.locator("#diagnostics")).toHaveText(expected);
    const toast = page.locator(".of-builder-toast");
    if (command === "delete") {
      await expect(
        toast.getByRole("button", { name: "Undo", exact: true }),
      ).toBeVisible();
      await expect(toast).toHaveText(`${expected}Undo`);
    } else await expect(toast).toHaveText(expected);
  });

test("approved desktop starts in Build after Preview and reload; view mode is not persisted", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/builder.html?approved");
  const build = page.getByRole("tab", { name: "Build", exact: true });
  await expect(build).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".of-builder")).toHaveAttribute(
    "data-ofb-view",
    "build",
  );
  await page.getByRole("tab", { name: "Preview", exact: true }).click();
  await page.reload();
  await expect(build).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".of-builder")).toHaveAttribute(
    "data-ofb-view",
    "build",
  );
});

test("unchanged settings Save and public commands replace stale live text too", async ({
  page,
}) => {
  await page.goto("/builder.html?approved");
  await page.locator('#canvas [data-field-id="email"]').focus();
  await page.keyboard.press("ControlOrMeta+c");
  await page.keyboard.press("Enter");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await expect(page.locator("#diagnostics")).toHaveText(
    "Saved settings for Email",
  );
  await page.evaluate(() =>
    window.nestedBuilder.load({
      ...window.miniBuilder.builder.getState().definition,
      title: "API edit",
    }),
  );
  await expect(page.locator("#diagnostics")).toHaveText(
    "Updated Customer onboarding",
  );
});
