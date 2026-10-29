import { test, expect } from "@playwright/test";
import type {} from "../../apps/playground/builder";

for (const theme of [
  "base",
  "bootstrap4",
  "bootstrap5",
  "tailwind",
  "material",
])
  test(`${theme}: caption/type, fit-content preview, sentence conjunction and full header name`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto(`/builder.html?approved&theme=${theme}`);
    const header = page.locator(".ofb-breadcrumb strong");
    await expect(header).toHaveAttribute("title", await header.innerText());
    await page
      .getByRole("button", { name: "Edit settings", exact: true })
      .click();
    const dialog = page.getByRole("dialog", { name: "Email", exact: true });
    await expect(
      dialog.getByRole("heading", { name: "Email", exact: true }),
    ).toBeVisible();
    await expect(
      dialog.locator(".ofb-settings-caption > .ofb-chip"),
    ).toHaveText("Email");
    await expect(
      dialog.locator(".ofb-settings-caption > .ofb-chip"),
    ).toHaveAttribute("data-ofb-primitive", "Chip");
    await expect(dialog.locator(".ofb-settings-caption > .ofb-chip")).toHaveCSS(
      "display",
      "flex",
    );
    await expect(dialog.locator(".ofb-settings-header")).not.toContainText(
      "Email · Email",
    );
    const preview = dialog.locator(".ofb-live-preview");
    await expect(preview.locator('[data-field-id="email"]')).toBeVisible();
    expect((await preview.boundingBox())!.height).toBeLessThan(250);
    await dialog.getByRole("tab", { name: "Conditional", exact: true }).click();
    const sentence = dialog.locator(
      '[data-expression="visibleWhen"] .ofb-condition-sentence',
    );
    await expect(sentence).toHaveText(/Show when.*of these match/);
    const picker = sentence.getByRole("combobox", {
      name: "Match conditions",
      exact: true,
    });
    await expect(picker).toHaveValue("All");
    const first = (await sentence.locator("span").first().boundingBox())!;
    const input = (await picker.boundingBox())!;
    expect(input.x).toBeGreaterThan(first.x);
    expect(
      Math.abs(input.y + input.height / 2 - first.y - first.height / 2),
    ).toBeLessThan(2);
  });

for (const theme of [
  "base",
  "bootstrap4",
  "bootstrap5",
  "tailwind",
  "material",
])
  test(`${theme}: one error is plain text, several are a list; Bootstrap help follows the input`, async ({
    page,
  }) => {
    await page.goto(`/builder.html?approved&theme=${theme}`);
    await page.evaluate(async () => {
      const schema = structuredClone(
        window.miniBuilder.builder.getState().definition,
      );
      const email =
        schema.components[0]!.components![0]!.components![0]!.columns![1]!
          .components[0]!;
      email.description = "A reachable email address";
      email.validation = { required: true, minLength: 5 };
      window.nestedBuilder.load(schema);
      const preview = window.miniBuilder.preview!;
      preview.session.setValue(preview.session.form.byId.email!.path, "");
      await preview.validate();
    });
    const field = page.locator('#canvas [data-field-id="email"]');
    await expect(field.locator("p.of-errors")).toContainText("required");
    await expect(field.locator(".of-errors li")).toHaveCount(0);
    await page.evaluate(async () => {
      const preview = window.miniBuilder.preview!;
      preview.session.setValue(preview.session.form.byId.email!.path, "x");
      await preview.validate();
    });
    await expect(field.locator("ul.of-errors li")).toHaveCount(2);
    if (theme === "bootstrap4" || theme === "bootstrap5") {
      const control = (await field
        .locator(":scope > .of-control-wrapper")
        .boundingBox())!;
      const help = (await field
        .locator(":scope > .of-description")
        .boundingBox())!;
      expect(help.y).toBeGreaterThanOrEqual(control.y + control.height);
    }
  });
