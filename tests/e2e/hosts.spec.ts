import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type {} from "../../apps/vanilla-example/src/data";
const hosts = [
  { name: "vanilla", port: 4181 },
  { name: "react", port: 4182 },
  { name: "angular22", port: 4183 },
  { name: "angular21", port: 4184 },
];
for (const host of hosts) {
  test(`${host.name}: same fixture, errors, native id/object values and submitted data`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${host.port}/`);
    await page.waitForFunction(() => !!window.hostDemo);
    if (host.name.startsWith("angular"))
      expect(
        await page.evaluate(() => window.hostDemo.frameworkVersion),
      ).toMatch(host.name === "angular21" ? /^21\./ : /^22\./);
    expect(
      await page.evaluate(async () =>
        (await window.hostDemo.form.validate()).errors.map((error) => [
          error.componentId,
          error.error.code,
        ]),
      ),
    ).toEqual([
      ["name", "required"],
      ["employee", "required"],
    ]);
    await page.getByLabel("Name", { exact: true }).fill("Ada");
    await page.locator('[data-field-id="employee"] input').fill("Ana");
    await page
      .locator('[data-field-id="employee"]')
      .getByRole("button", { name: "Choose Ana Rivera" })
      .click();
    await page.locator('[data-field-id="manager"] input').fill("Sam");
    await page
      .locator('[data-field-id="manager"]')
      .getByRole("button", { name: "Choose Sam Chen" })
      .click();
    await page.getByRole("button", { name: "4 of 5 stars" }).click();
    await page.locator("#submit").click();
    await expect(page.locator("#result")).toContainText('"ok":true');
    expect(
      await page.evaluate(() => window.hostDemo.form.session.getData()),
    ).toEqual({
      name: "Ada",
      employee: "e1",
      manager: { id: "e2", name: "Sam Chen" },
      rating: 4,
      locked: false,
    });
    const result = await new AxeBuilder({ page }).analyze();
    expect(
      result.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact ?? ""),
      ),
    ).toEqual([]);
    expect(errors).toEqual([]);
  });
  test(`${host.name}: native change/blur, disabled state, context and stable controlled updates`, async ({
    page,
  }) => {
    await page.goto(`http://127.0.0.1:${host.port}/`);
    await page.waitForFunction(() => !!window.hostDemo);
    const input = page.locator('[data-field-id="employee"] input');
    await input.fill("Ana");
    await input.press("Tab");
    expect(
      await page.evaluate(
        () => window.hostDemo.form.session.getFieldState("employee").touched,
      ),
    ).toBe(true);
    await page.getByLabel("Lock employee", { exact: true }).check();
    await expect(input).toBeDisabled();
    await page.getByLabel("Lock employee", { exact: true }).uncheck();
    await expect(input).toBeEnabled();
    if (host.name !== "vanilla")
      await expect(
        page.locator('[data-field-id="employee"] [data-host-context]'),
      ).toHaveText(
        host.name === "react" ? "React host context" : "Angular host context",
      );
    const stable = await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>(
        '[data-field-id="name"] input',
      )!;
      input.focus();
      window.hostDemo.form.setData({
        ...window.hostDemo.form.session.getData(),
        employee: "e3",
      });
      window.hostDemo.form.view.setTheme("base");
      return (
        input === document.querySelector('[data-field-id="name"] input') &&
        document.activeElement === input
      );
    });
    expect(stable).toBe(true);
    await expect(input).toHaveValue("Maya Patel");
    if (host.name === "react")
      await expect(page.locator("#inspection")).toContainText('"value":"e3"');
  });
  test(`${host.name}: readOnly props prevent native changes`, async ({
    page,
  }) => {
    await page.goto(`http://127.0.0.1:${host.port}/?readonly`);
    await page.waitForFunction(() => !!window.hostDemo);
    const input = page.locator('[data-field-id="employee"] input');
    await expect(input).toHaveAttribute("readonly", "");
    await expect(
      page.locator('[data-field-id="manager"] input'),
    ).toHaveAttribute("readonly", "");
    await expect(
      page
        .locator('[data-field-id="employee"]')
        .getByRole("button", { name: "Choose Ana Rivera" }),
    ).toBeDisabled();
    await input.focus();
    await page.keyboard.type("ignored");
    await expect(input).toHaveValue("");
  });
  test(`${host.name}: unmount releases native DOM and session listeners`, async ({
    page,
  }) => {
    await page.goto(`http://127.0.0.1:${host.port}/`);
    await page.waitForFunction(() => !!window.hostDemo);
    const result = await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>(
        '[data-field-id="employee"] input',
      )!;
      window.hostDemo.unmount();
      input.value = "detached";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return {
        detached: !input.isConnected,
        empty: document.querySelectorAll("[data-field-id]").length === 0,
      };
    });
    expect(result).toEqual({ detached: true, empty: true });
  });
}

test("all hosts return identical data/errors and equivalent accessible field semantics", async ({
  page,
}) => {
  const { checkHostConformance } = await import("@ourform/testing/playwright");
  const samples = [];
  for (const host of hosts) {
    await page.goto(`http://127.0.0.1:${host.port}/`);
    await page.waitForFunction(() => !!window.hostDemo);
    const errors = await page.evaluate(
      async () => (await window.hostDemo.form.validate()).errors,
    );
    await page.getByRole("textbox", { name: "Name", exact: true }).fill("Ada");
    await page
      .getByRole("searchbox", { name: "Employee", exact: true })
      .fill("Ana");
    await page
      .locator('[data-field-id="employee"]')
      .getByRole("button", { name: "Choose Ana Rivera" })
      .click();
    const submission = await page.evaluate(() => window.hostDemo.form.submit());
    const controls = [];
    for (const name of ["Employee", "Manager"]) {
      const input = page.getByRole("searchbox", { name, exact: true });
      await expect(input).toHaveAccessibleName(name);
      controls.push({
        name,
        invalid: await input.getAttribute("aria-invalid"),
        required: await input.getAttribute("aria-required"),
        value: await input.inputValue(),
      });
    }
    samples.push({ host: host.name, errors, submission, controls });
  }
  checkHostConformance(samples);
});
for (const shadow of [false, true])
  test(`custom element ${shadow ? "shadow" : "light"}: properties, events, methods and reconnect`, async ({
    page,
  }) => {
    await page.goto("http://127.0.0.1:4181/");
    const result = await page.evaluate(async (shadow) => {
      window.defineExampleTag("acme-form");
      const form = document.createElement(
        "acme-form",
      ) as import("@ourform/element").OurFormElement;
      if (shadow) form.setAttribute("shadow", "");
      const events: string[] = [];
      form.addEventListener("of-ready", () => events.push("ready"));
      form.addEventListener("of-change", (event) => {
        const detail = (event as CustomEvent).detail;
        if (detail.data && Array.isArray(detail.changedPaths))
          events.push("change");
      });
      form.addEventListener("of-submit", (event) => {
        if ((event as CustomEvent).detail.ok) events.push("submit");
      });
      form.schema = {
        $formVersion: "1.0",
        id: "element",
        display: "form",
        components: [
          {
            id: "name",
            type: "text",
            key: "name",
            label: "Custom name",
            validation: { required: true },
          },
        ],
      };
      form.data = { name: "Ada" };
      document.querySelector("main")!.append(form);
      const root = form.shadowRoot ?? form;
      const input = root.querySelector<HTMLInputElement>("input")!;
      form.focusField("name");
      input.setSelectionRange(1, 1);
      form.theme = "tailwind";
      const stable =
        root.querySelector("input") === input && input.selectionStart === 1;
      form.data = { name: "Grace" };
      const changed = input.value;
      await form.validate();
      await form.submit();
      form.reset({ name: "Reset" });
      form.remove();
      const detached = !input.isConnected;
      document.querySelector("main")!.append(form);
      const reconnected = (
        form.shadowRoot ?? form
      ).querySelector<HTMLInputElement>("input")!.value;
      let duplicate = false;
      try {
        window.defineExampleTag("acme-form");
      } catch {
        duplicate = true;
      }
      form.remove();
      return {
        events,
        stable,
        changed,
        detached,
        reconnected,
        duplicate,
        shadow: !!form.shadowRoot,
      };
    }, shadow);
    expect(result.stable).toBe(true);
    expect(result.changed).toBe("Grace");
    expect(result.detached).toBe(true);
    expect(result.reconnected).toBe("Reset");
    expect(result.duplicate).toBe(true);
    expect(result.shadow).toBe(shadow);
    expect(result.events).toContain("change");
    expect(result.events.filter((event) => event === "ready")).toHaveLength(2);
    expect(result.events).toContain("submit");
  });

for (const host of hosts)
  test(`${host.name}: native typing and caret survive theme changes`, async ({
    page,
  }) => {
    await page.goto(`http://127.0.0.1:${host.port}/`);
    await page.waitForFunction(() => !!window.hostDemo);
    const input = page.getByRole("searchbox", {
      name: "Employee",
      exact: true,
    });
    await input.fill("An");
    await input.press("ArrowLeft");
    const stable = await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>(
        '[data-field-id="employee"] input',
      )!;
      window.hostDemo.form.view.setTheme("tailwind");
      return (
        document.querySelector('[data-field-id="employee"] input') === input &&
        document.activeElement === input &&
        input.selectionStart === 1
      );
    });
    expect(stable).toBe(true);
    await page.keyboard.type("X");
    await expect(input).toHaveValue("AXn");
  });
