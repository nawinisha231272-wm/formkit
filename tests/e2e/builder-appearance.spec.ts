import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type {} from "../../apps/playground/builder";

for (const theme of [
  "base",
  "bootstrap4",
  "bootstrap5",
  "tailwind",
  "material",
])
  for (const mode of ["light", "dark"])
    for (const density of ["comfortable", "compact"])
      test(`builder ${theme} ${mode} ${density}: accessible chrome and draft, preserved focus/history and match-form`, async ({
        page,
      }) => {
        await page.goto(
          `/builder.html?approved&theme=${theme}&mode=${mode}${density === "compact" ? "&compact" : ""}`,
        );
        const root = page.locator(".of-builder");
        await expect(root).toHaveAttribute(
          "data-ofb-theme",
          theme === "base" ? "neutral" : theme,
        );
        await expect(root).toHaveAttribute("data-ofb-mode", mode);
        await expect(root).toHaveAttribute("data-ofb-density", density);
        const scan = async () => {
          const result = await new AxeBuilder({ page }).analyze();
          expect(
            result.violations.filter((v) =>
              ["serious", "critical"].includes(v.impact ?? ""),
            ),
          ).toEqual([]);
        };
        await scan();
        await page
          .getByRole("button", { name: "Edit settings", exact: true })
          .click();
        const dialog = page.getByRole("dialog"),
          label = dialog.getByLabel("Label", { exact: true });
        await label.fill("Contact email");
        const identity = await label.elementHandle();
        const history = await page.evaluate(
          () => window.miniBuilder.builder.getState().history.past.length,
        );
        await scan();
        await page.evaluate(() => {
          window.nestedBuilder.setTheme("material");
          window.nestedBuilder.setMode("dark");
          window.nestedBuilder.setChrome({
            theme: "bootstrap4",
            density: "compact",
          });
        });
        await expect(label).toBeFocused();
        await expect(label).toHaveValue("Contact email");
        expect(
          await label.evaluate((node, old) => node === old, identity),
        ).toBe(true);
        await expect(root).toHaveAttribute("data-ofb-theme", "bootstrap4");
        expect(
          await page.evaluate(
            () => window.miniBuilder.builder.getState().selection,
          ),
        ).toBe("email");
        expect(
          await page.evaluate(
            () => window.miniBuilder.builder.getState().history.past.length,
          ),
        ).toBe(history);
        await label.press("Escape");
        await expect(dialog).toHaveCount(0);
      });

test("appearance switches preserve active pointer capture, source and target until an atomic drop", async ({
  page,
}) => {
  await page.goto("/builder.html?fixture");
  const source = page.locator('#palette [data-type="email"]');
  const from = (await source.boundingBox())!;
  const target = page.locator(
    '#canvas [data-of-slot-owner="columns"][data-of-slot="column_1"]',
  );
  const to = (await target.boundingBox())!;
  await page.mouse.move(from.x + 15, from.y + 15);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height - 10, {
    steps: 12,
  });
  const root = page.locator(".of-builder"),
    identity = await source.elementHandle();
  await expect(root).toHaveAttribute("data-ofb-dragging", "true");
  await expect(page.getByRole("status")).toContainText("Email");
  for (const theme of [
    "bootstrap4",
    "bootstrap5",
    "tailwind",
    "material",
    "base",
  ]) {
    await page.evaluate((t) => {
      window.nestedBuilder.setTheme(t);
      window.nestedBuilder.setMode("dark");
    }, theme);
    await expect(root).toHaveAttribute("data-ofb-dragging", "true");
    expect(await source.evaluate((node, old) => node === old, identity)).toBe(
      true,
    );
  }
  await page.mouse.up();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  expect(
    await page.evaluate(
      () => window.miniBuilder.builder.getState().history.past.length,
    ),
  ).toBe(0);
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  expect(
    await page.evaluate(
      () => window.miniBuilder.builder.getState().history.past.length,
    ),
  ).toBe(1);
});
