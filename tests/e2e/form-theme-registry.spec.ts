import { expect, test } from "@playwright/test";
import type {} from "../../apps/vanilla-example/src/data";

for (const shadow of [false, true])
  test(`form element ${shadow ? "shadow" : "light"}: registry updates preserve session, errors, focus and reconnect`, async ({
    page,
  }) => {
    await page.goto("http://127.0.0.1:4181/");
    await page.waitForFunction(() => !!window.hostThemes);
    const result = await page.evaluate(async (shadow) => {
      const form = document.createElement(
        "our-form",
      ) as import("@ourform/element").OurFormElement;
      form.themes = window.hostThemes;
      if (shadow) form.setAttribute("shadow", "");
      form.schema = {
        $formVersion: "1.0",
        id: "registry",
        display: "form",
        components: [
          {
            id: "name",
            key: "name",
            type: "text",
            label: "Name",
            validation: { required: true },
          },
          {
            id: "email",
            key: "email",
            type: "email",
            label: "Email",
            validation: { required: true },
          },
        ],
      };
      document.querySelector("main")!.append(form);
      const root = form.shadowRoot ?? form;
      const controller = form.controller!;
      controller.session.setValue("name", "Ada");
      controller.session.touch("name");
      await controller.validate();
      const before = JSON.stringify(controller.session.getFieldState("email"));
      const input = root.querySelector<HTMLInputElement>("input")!;
      input.focus();
      input.setSelectionRange(1, 2);
      const replacement = window.hostThemes!.map((theme) =>
        theme.name === "base"
          ? {
              ...theme,
              tokens: { ...theme.tokens, "--of-color-primary": "#123456" },
            }
          : theme,
      );
      form.themes = replacement;
      const stable =
        form.controller === controller &&
        root.querySelector("input") === input &&
        (root instanceof ShadowRoot
          ? root.activeElement
          : document.activeElement) === input;
      const state = {
        value: controller.session.getValue("name"),
        touched: controller.session.getFieldState("name").touched,
        errors:
          JSON.stringify(controller.session.getFieldState("email")) === before,
        caret: [input.selectionStart, input.selectionEnd],
      };
      const css = getComputedStyle(input.closest(".of-root")!)
        .getPropertyValue("--of-color-primary")
        .trim();
      let errorCode: unknown;
      try {
        form.theme = "not-installed";
      } catch (error) {
        errorCode = (error as { code?: string }).code;
      }
      const eventErrors: unknown[] = [];
      form.addEventListener("of-error", (event) =>
        eventErrors.push((event as CustomEvent).detail.code),
      );
      form.setAttribute("theme", "still-missing");
      const unchanged =
        form.theme === "base" &&
        form.controller === controller &&
        root.querySelector(".of-root")?.getAttribute("data-of-theme") ===
          "base";
      let registryRejected = false;
      try {
        form.themes = [];
      } catch (error) {
        registryRejected =
          (error as { code?: string }).code === "unknown-theme";
      }
      const registryStable = form.themes === replacement;
      form.remove();
      document.querySelector("main")!.append(form);
      const reconnect = {
        value: form.controller!.session.getValue("name"),
        themes: form.themes === replacement,
        css: getComputedStyle(
          (form.shadowRoot ?? form).querySelector(".of-root")!,
        )
          .getPropertyValue("--of-color-primary")
          .trim(),
      };
      form.remove();
      return {
        stable,
        state,
        css,
        errorCode,
        eventErrors,
        unchanged,
        registryRejected,
        registryStable,
        reconnect,
      };
    }, shadow);
    expect(result).toEqual({
      stable: true,
      state: { value: "Ada", touched: true, errors: true, caret: [1, 2] },
      css: "#123456",
      errorCode: "unknown-theme",
      eventErrors: ["unknown-theme"],
      unchanged: true,
      registryRejected: true,
      registryStable: true,
      reconnect: { value: "Ada", themes: true, css: "#123456" },
    });
  });

for (const [name, port] of [
  ["React", 4182],
  ["Angular", 4183],
  ["Angular 21", 4184],
] as const)
  test(`${name}: changing the themes input preserves controller, field state and focus`, async ({
    page,
  }) => {
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.waitForFunction(() => !!window.hostDemo?.setThemes);
    await page.getByLabel("Name", { exact: true }).fill("Ada");
    const before = await page.evaluate(async () => {
      const form = window.hostDemo.form;
      form.session.touch("name");
      await form.validate();
      const input = document.querySelector<HTMLInputElement>(
        '[data-field-id="name"] input',
      )!;
      input.focus();
      input.setSelectionRange(1, 2);
      const state = JSON.stringify(form.session.getFieldState("employee"));
      (window as unknown as { registryBefore: unknown }).registryBefore = {
        form,
        input,
        state,
      };
      // The public registry accepts custom descriptors; no built-in import is needed here.
      window.hostDemo.setThemes!([
        {
          name: "base",
          tokens: { "--of-color-primary": "#123456" },
          classes: {},
        },
      ]);
      return form.session.getValue("name");
    });
    expect(before).toBe("Ada");
    await expect
      .poll(() =>
        page
          .locator(".of-root")
          .first()
          .evaluate((el) =>
            getComputedStyle(el).getPropertyValue("--of-color-primary").trim(),
          ),
      )
      .toBe("#123456");
    expect(
      await page.evaluate(() => {
        const before = (
          window as unknown as {
            registryBefore: {
              form: import("@ourform/renderer-dom").FormController;
              input: HTMLInputElement;
              state: string;
            };
          }
        ).registryBefore;
        return {
          controller: before.form === window.hostDemo.form,
          input:
            before.input ===
            document.querySelector('[data-field-id="name"] input'),
          focus: document.activeElement === before.input,
          caret: [before.input.selectionStart, before.input.selectionEnd],
          value: window.hostDemo.form.session.getValue("name"),
          touched: window.hostDemo.form.session.getFieldState("name").touched,
          errors:
            before.state ===
            JSON.stringify(
              window.hostDemo.form.session.getFieldState("employee"),
            ),
        };
      }),
    ).toEqual({
      controller: true,
      input: true,
      focus: true,
      caret: [1, 2],
      value: "Ada",
      touched: true,
      errors: true,
    });
  });
