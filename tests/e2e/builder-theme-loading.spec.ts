import { expect, test } from "@playwright/test";

test("a registered lazy theme loads on selection and preserves focus", async ({
  page,
}) => {
  await page.goto(
    "/builder.html?approved&lazyTheme=material&slowTheme&settingsPreload=none",
  );
  const theme = page.getByLabel("Theme");
  await expect(theme.locator("option")).toHaveText([
    "Base",
    "Bootstrap 4",
    "Bootstrap 5",
    "Tailwind",
    "Material",
  ]);
  await theme.focus();
  await theme.selectOption("material");
  await expect(theme.locator("..")).toHaveAttribute("aria-busy", "true");
  await expect(theme.locator("..")).toContainText("Loading Material");
  await expect(page.locator('[data-builder-part="preview"].of-root')).toHaveAttribute(
    "data-of-theme",
    "material",
  );
  await expect(theme).toHaveValue("material");
  await expect(theme).toBeFocused();
});

test("a failed lazy theme keeps the current theme and Retry succeeds", async ({
  page,
}) => {
  await page.goto(
    "/builder.html?approved&lazyTheme=material&failTheme&settingsPreload=none",
  );
  const theme = page.getByLabel("Theme");
  await theme.selectOption("material");
  const status = theme.locator("..").getByRole("status");
  await expect(status).toContainText("Could not load Material");
  await expect(status).toContainText("Local theme bundle unavailable");
  await expect(page.locator('[data-builder-part="preview"].of-root')).toHaveAttribute(
    "data-of-theme",
    "base",
  );
  await status.getByRole("button", { name: "Retry" }).click();
  await expect(page.locator('[data-builder-part="preview"].of-root')).toHaveAttribute(
    "data-of-theme",
    "material",
  );
  await expect(theme).toBeFocused();
});

