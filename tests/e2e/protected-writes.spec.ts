import { test, expect } from "@playwright/test";
import type {} from "../../apps/vanilla-example/src/data";
for (const [host, port] of [
  ["vanilla", 4181],
  ["React", 4182],
  ["Angular 22", 4183],
  ["Angular 21", 4184],
] as const) {
  for (const protection of ["disabled", "readOnly"] as const) {
    test(`${host}: ${protection} user write restores stored DOM value and API remains writable`, async ({
      page,
    }) => {
      await page.goto(
        `http://127.0.0.1:${port}/?protected${protection === "readOnly" ? "&readonly" : ""}`,
      );
      await page.waitForFunction(() => !!window.hostDemo);
      const input = page.getByLabel("Name", { exact: true });
      await expect(input).toHaveValue("stored");
      if (protection === "disabled")
        await page.getByLabel("Lock field", { exact: true }).check();
      await input.evaluate((el) => {
        const input = el as HTMLInputElement;
        input.dataset.identity = "kept";
        input.value = "blocked";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await expect(input).toHaveValue("stored");
      await expect(input).toHaveAttribute("data-identity", "kept");
      expect(
        await page.evaluate(() =>
          window.hostDemo.form.session.getValue("name"),
        ),
      ).toBe("stored");
      await page.evaluate(() =>
        window.hostDemo.form.session.setValue("name", "API", { source: "api" }),
      );
      await expect(input).toHaveValue("API");
      await expect(input).toHaveAttribute("data-identity", "kept");
    });
  }
  test(`${host}: schema Read-only and Disabled flags protect fields and keep API writes available`, async ({
    page,
  }) => {
    await page.goto(`http://127.0.0.1:${port}/?protected`);
    await page.waitForFunction(() => !!window.hostDemo);
    for (const [key, label] of [
      ["staticReadOnly", "Read-only account"],
      ["staticDisabled", "Disabled account"],
    ]) {
      const input = page.getByLabel(label!, { exact: true });
      if (key === "staticReadOnly")
        await expect(input).toHaveAttribute("readonly", "");
      else await expect(input).toBeDisabled();
      await input.evaluate((el) => {
        const input = el as HTMLInputElement;
        input.value = "blocked";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await expect(input).toHaveValue("stored");
      await page.evaluate(
        (key) => window.hostDemo.form.session.setValue(key!, "API"),
        key,
      );
      await expect(input).toHaveValue("API");
    }
  });
}
for (const shadow of [false, true])
  for (const protection of [
    "disabled",
    "readOnly",
    "schemaDisabled",
    "schemaReadOnly",
  ] as const) {
    test(`Web Component ${shadow ? "shadow" : "light"}: ${protection} user write restores control and API writes work`, async ({
      page,
    }) => {
      await page.goto("http://127.0.0.1:4181/?protected");
      await page.waitForFunction(() => !!window.hostDemo);
      const result = await page.evaluate(
        ({ shadow, protection }) => {
          const tag = "protected-form";
          window.defineExampleTag(tag);
          const element = document.createElement(
            tag,
          ) as import("@ourform/element").OurFormElement;
          element.themes = window.hostThemes;
          if (shadow) element.setAttribute("shadow", "");
          element.readOnly = protection === "readOnly";
          element.schema = {
            $formVersion: "1.0",
            id: "element-protected",
            display: "form",
            components: [
              {
                id: "name",
                key: "name",
                type: "text",
                label: "Name",
                defaultValue: "stored",
                ...(protection === "schemaReadOnly" ? { readOnly: true } : {}),
                ...(protection === "schemaDisabled" ? { disabled: true } : {}),
                ...(protection === "disabled"
                  ? { disabledWhen: ["eq", 1, 1] }
                  : {}),
              },
            ],
          };
          document.querySelector("main")!.append(element);
          const root = element.shadowRoot ?? element;
          const input = root.querySelector<HTMLInputElement>("input")!;
          input.value = "blocked";
          input.dispatchEvent(new Event("input", { bubbles: true }));
          const restored = input.value;
          const value = element.controller!.session.getValue("name");
          element.controller!.session.setValue("name", "API");
          const api = input.value;
          const stable = root.querySelector("input") === input;
          element.remove();
          return { restored, value, api, stable };
        },
        { shadow, protection },
      );
      expect(result).toEqual({
        restored: "stored",
        value: "stored",
        api: "API",
        stable: true,
      });
    });
  }
