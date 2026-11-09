import { test, expect } from "@playwright/test";
import type {} from "../../apps/playground/builder";

for (const pause of ["hover", "focus"] as const)
  test(`delete Undo toast pauses on ${pause}, expires visually and retains keyboard history`, async ({
    page,
  }) => {
    await page.goto("/builder.html");
    await page.clock.install({ time: new Date("2026-10-22T12:00:00Z") });
    await page.clock.pauseAt(new Date("2026-10-22T12:00:01Z"));
    const field = page.locator('#canvas [data-field-id="cmp_rating"]');
    await field.focus();
    await page.keyboard.press("Delete");
    const toast = page.locator(".of-builder-toast");
    const live = page.locator("#diagnostics");
    const message = await live.textContent();
    await expect(
      toast.getByRole("button", { name: "Undo", exact: true }),
    ).toBeVisible();
    await page.clock.fastForward(3000);
    if (pause === "hover") await toast.hover();
    else {
      for (let region = 0; region < 5; region++) {
        await page.keyboard.press("F6");
        if (
          await toast
            .getByRole("button", { name: "Undo", exact: true })
            .evaluate((el) => el === document.activeElement)
        )
          break;
      }
      await expect(
        toast.getByRole("button", { name: "Undo", exact: true }),
      ).toBeFocused();
    }
    await page.clock.fastForward(10000);
    await expect(toast).toBeVisible();
    if (pause === "hover") await page.mouse.move(0, 0);
    else await page.getByRole("tab", { name: "Build", exact: true }).focus();
    await page.clock.fastForward(4999);
    await expect(toast).toBeVisible();
    await page.clock.fastForward(2);
    await expect(toast).toBeHidden();
    await expect(live).toHaveText(message!);
    await page.getByRole("tab", { name: "Build", exact: true }).focus();
    await page.keyboard.press("ControlOrMeta+z");
    await expect(field).toBeVisible();
  });

test("plain announcements expire while hovered without clearing the live region", async ({
  page,
}) => {
  await page.goto("/builder.html?approved");
  await page.clock.install({ time: new Date("2026-10-22T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-22T12:00:01Z"));
  await page.locator('#canvas [data-field-id="email"]').focus();
  await page.keyboard.press("ControlOrMeta+d");
  const toast = page.locator(".of-builder-toast");
  await expect(toast).toHaveText("Duplicated Email");
  await toast.hover();
  await page.clock.fastForward(3000);
  await page.mouse.move(0, 0);
  await page.clock.fastForward(2001);
  await expect(toast).toBeHidden();
  await expect(page.locator("#diagnostics")).toHaveText("Duplicated Email");
});
