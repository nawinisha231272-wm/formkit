import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type {} from "../../apps/shared/logic-effects";

for (const [host, port] of [
  ["React", 4182],
  ["Angular", 4183],
] as const)
  for (const theme of [
    "base",
    "bootstrap4",
    "bootstrap5",
    "tailwind",
    "material",
  ])
    test(`${host} ${theme}: effects use the live host callback and cancel on destroy`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`http://127.0.0.1:${port}/?effects&theme=${theme}`);
      const source = page.getByRole("textbox", { name: "Source", exact: true });
      const target = page.getByRole("textbox", { name: "Target", exact: true });
      await source.fill("A");
      await target.evaluate(
        (element) => ((element as HTMLElement).dataset.identity = "retained"),
      );
      if (host === "React")
        await page.locator("#replace-effect-listener").click();
      await page
        .getByRole("button", { name: "Run lookup", exact: true })
        .click();
      await expect(target).toHaveValue("copied");
      await expect(target).toBeFocused();
      await expect(target).toHaveAttribute("data-identity", "retained");
      await page.waitForFunction(
        () => window.logicEffectsDemo.calls.length === 1,
      );
      const batch = ["focus", "emit", "refreshOptions", "call"];
      expect(
        await page.evaluate(() =>
          window.logicEffectsDemo.effects.map((e) => e.action),
        ),
      ).toEqual(batch);
      if (host === "Angular") {
        expect(
          await page.evaluate(() =>
            window.logicEffectsDemo.outputs.map((e) => e.action),
          ),
        ).toEqual(batch);
        expect(
          await page.evaluate(() => window.logicEffectsDemo.deliveryOrder),
        ).toEqual(batch.flatMap(() => ["provider", "output"]));
      } else
        expect(
          await page.evaluate(() => window.logicEffectsDemo.listeners),
        ).toEqual([1, 1, 1, 1]);
      await source.fill("B");
      expect(
        await page.evaluate(() => {
          const call = window.logicEffectsDemo.calls[0]!;
          return {
            args: call.args,
            data: call.context.data,
            frozen:
              Object.isFrozen(call.args) && Object.isFrozen(call.context.data),
            aborted: call.context.signal.aborted,
          };
        }),
      ).toEqual({
        args: ["A"],
        data: { source: "A", target: "copied" },
        frozen: true,
        aborted: false,
      });
      const axe = await new AxeBuilder({ page }).analyze();
      expect(
        axe.violations.filter(
          (v) => v.impact === "serious" || v.impact === "critical",
        ),
      ).toEqual([]);
      await page.evaluate(() => window.hostDemo.unmount());
      expect(
        await page.evaluate(
          () => window.logicEffectsDemo.calls[0]!.context.signal.aborted,
        ),
      ).toBe(true);
      await page.evaluate(() => window.logicEffectsDemo.calls[0]!.complete());
      expect(
        await page.evaluate(() => window.logicEffectsDemo.effects.length),
      ).toBe(4);
      await expect(target).toHaveCount(0);
      expect(errors).toEqual([]);
    });
