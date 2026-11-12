import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type {} from "../../apps/playground/logic-prototype";
for (const theme of [
  "base",
  "bootstrap4",
  "bootstrap5",
  "tailwind",
  "material",
]) {
  test(`${theme}: Button triggers one effect batch; focus/emit/refresh are delivered after the stored value and calls keep frozen snapshots`, async ({
    page,
  }) => {
    await page.goto(`/logic-prototype.html?effects&theme=${theme}`);
    const source = page.getByRole("textbox", { name: "Source", exact: true });
    const target = page.getByRole("textbox", { name: "Target", exact: true });
    await source.fill("A");
    await target.evaluate((el) => {
      (el as HTMLElement).dataset.identity = "retained";
    });
    await page.getByRole("button", { name: "Run lookup", exact: true }).click();
    await expect(target).toBeFocused();
    await expect(target).toHaveValue("copied");
    await expect(target).toHaveAttribute("data-identity", "retained");
    await page.waitForFunction(() => window.ourformEffects.calls.length === 1);
    expect(
      await page.evaluate(() =>
        window.ourformEffects.effects.map((effect) => effect.action),
      ),
    ).toEqual(["focus", "emit", "refreshOptions", "call"]);
    await source.fill("B");
    const observed = await page.evaluate(() => {
      const call = window.ourformEffects.calls[0]!;
      return {
        args: call.args,
        data: call.context.data,
        event: call.context.event,
        frozen:
          Object.isFrozen(call.args) && Object.isFrozen(call.context.data),
        aborted: call.context.signal.aborted,
      };
    });
    expect(observed).toEqual({
      args: ["A"],
      data: { source: "A", target: "copied" },
      event: { name: "lookup", payload: { componentId: "run" } },
      frozen: true,
      aborted: false,
    });
    const axe = await new AxeBuilder({ page }).analyze();
    expect(
      axe.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      ),
    ).toEqual([]);
    await page.evaluate(() => window.ourformLogic.reset());
    expect(
      await page.evaluate(
        () => window.ourformEffects.calls[0]!.context.signal.aborted,
      ),
    ).toBe(true);
    await page.evaluate(() => window.ourformEffects.calls[0]!.complete());
    await expect(target).toHaveValue("");
  });
}
for (const shadow of [false, true])
  test(`Web Component ${shadow ? "shadow" : "light"}: composed effects and disconnect abort ongoing calls`, async ({
    page,
  }) => {
    await page.goto("/logic-prototype.html?effects");
    await page.evaluate((shadow) => {
      const element = window.ourformEffects.element(shadow);
      const observed: unknown[] = [];
      element.addEventListener("of-effect", (event) =>
        observed.push((event as CustomEvent).detail),
      );
      Object.assign(window, { elementEffects: observed });
    }, shadow);
    const element = page.locator("logic-effects-form");
    await element
      .getByRole("textbox", { name: "Source", exact: true })
      .fill("element");
    await element
      .getByRole("button", { name: "Run lookup", exact: true })
      .click();
    await expect(
      element.getByRole("textbox", { name: "Target", exact: true }),
    ).toBeFocused();
    await page.waitForFunction(() => window.ourformEffects.calls.length === 1);
    expect(
      await page.evaluate(() =>
        (
          window as unknown as { elementEffects: { action: string }[] }
        ).elementEffects.map((e) => e.action),
      ),
    ).toEqual(["focus", "emit", "refreshOptions", "call"]);
    await element.evaluate((el) => el.remove());
    expect(
      await page.evaluate(
        () => window.ourformEffects.calls[0]!.context.signal.aborted,
      ),
    ).toBe(true);
  });

test("empty legacy Button event still emits of-action without a logic event or error", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/logic-prototype.html?effects");
  await page.evaluate(() => {
    const element = window.ourformEffects.element(false);
    const actions: unknown[] = [];
    element.addEventListener("of-action", (event) =>
      actions.push((event as CustomEvent).detail),
    );
    const schema = window.ourformLogic.session.schema;
    element.schema = {
      ...schema,
      components: schema.components.map((node) =>
        node.type === "button"
          ? {
              ...node,
              properties: { ...node.properties, event: "" },
            }
          : node,
      ),
    };
    Object.assign(window, { emptyActions: actions });
  });
  await page
    .locator("logic-effects-form")
    .getByRole("button", { name: "Run lookup" })
    .click();
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(() =>
      (
        window as unknown as {
          emptyActions: { name: string; componentId: string }[];
        }
      ).emptyActions.map(({ name, componentId }) => ({ name, componentId })),
    ),
  ).toEqual([{ name: "", componentId: "run" }]);
  expect(await page.evaluate(() => window.ourformEffects.calls.length)).toBe(0);
});
