import { test, expect } from "@playwright/test";
import type {} from "../../apps/playground/builder";

test("four-pixel mouse threshold and outside-canvas drop preserve schema and history", async ({
  page,
}) => {
  await page.goto("/builder.html?fixture");
  const source = page.locator('#palette [data-type="email"]'),
    from = (await source.boundingBox())!;
  const before = await page.evaluate(() =>
    JSON.stringify(window.miniBuilder.builder.getState()),
  );
  await page.mouse.move(from.x + 12, from.y + 12);
  await page.mouse.down();
  await page.mouse.move(from.x + 15, from.y + 12);
  await expect(page.locator(".of-builder")).not.toHaveAttribute(
    "data-ofb-dragging",
    "true",
  );
  await page.mouse.move(from.x + 17, from.y + 12);
  await expect(page.locator(".of-builder")).toHaveAttribute(
    "data-ofb-dragging",
    "true",
  );
  await page.mouse.move(10, 10);
  await page.mouse.up();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText("Move cancelled.");
  expect(
    await page.evaluate(() =>
      JSON.stringify(window.miniBuilder.builder.getState()),
    ),
  ).toBe(before);
});

test("hovering for 600ms opens collapsed containers and inactive tabs without schema history", async ({
  page,
}) => {
  await page.goto("/builder.html?fixture");
  const panel = page.locator('#canvas [data-field-id="panel"]');
  await panel.locator(":scope > .of-layout-title").click({ button: "right" });
  await page
    .getByRole("menuitem", { name: "Collapse or expand", exact: true })
    .click();
  await expect(panel).toHaveAttribute("data-of-collapsed", "true");
  const source = page.locator('#palette [data-type="email"]'),
    from = (await source.boundingBox())!,
    to = (await panel.boundingBox())!;
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.mouse.move(from.x + 12, from.y + 12);
  await page.mouse.down();
  await page.mouse.move(from.x + 20, from.y + 12);
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2);
  await page.clock.runFor(599);
  await expect(panel).toHaveAttribute("data-of-collapsed", "true");
  await page.clock.runFor(1);
  await expect(panel).toHaveAttribute("data-of-collapsed", "false");
  const contact = page.locator('#canvas [data-of-tab="second"]'),
    tab = (await contact.boundingBox())!;
  await page.mouse.move(tab.x + tab.width / 2, tab.y + tab.height / 2);
  await page.clock.runFor(599);
  await expect(contact).toHaveAttribute("aria-selected", "false");
  await page.clock.runFor(1);
  await expect(contact).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".of-builder")).toHaveAttribute(
    "data-ofb-dragging",
    "true",
  );
  await page.keyboard.press("Escape");
  await page.mouse.up();
  expect(
    await page.evaluate(
      () => window.miniBuilder.builder.getState().history.past.length,
    ),
  ).toBe(0);
});

test("controlled touch Pointer Events wait 300ms and movement cancels the long press", async ({
  page,
}) => {
  await page.goto("/builder.html?fixture");
  const source = page.locator('#palette [data-type="email"]'),
    from = (await source.boundingBox())!;
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  // A real active pointer supplies capture in each engine; synthetic touch events exercise the
  // SDK's pointer-type/timer contract. This does not claim a physical-device touch trial.
  async function begin() {
    await page.evaluate(() =>
      document.addEventListener(
        "pointerdown",
        (event) => {
          document.documentElement.dataset.testPointerId = String(
            event.pointerId,
          );
        },
        { once: true },
      ),
    );
    await page.mouse.move(10, 10);
    await page.mouse.down();
    const pointerId = Number(
      await page.locator("html").getAttribute("data-test-pointer-id"),
    );
    const event = {
      pointerId,
      pointerType: "touch",
      button: 0,
      clientX: from.x + 12,
      clientY: from.y + 12,
    };
    await source.dispatchEvent("pointerdown", event);
    return event;
  }
  let event = await begin();
  await page.clock.runFor(299);
  await expect(page.locator(".of-builder")).not.toHaveAttribute(
    "data-ofb-dragging",
    "true",
  );
  await page.clock.runFor(1);
  await expect(page.locator(".of-builder")).toHaveAttribute(
    "data-ofb-dragging",
    "true",
  );
  await source.dispatchEvent("pointerup", {
    ...event,
    clientX: 10,
    clientY: 10,
  });
  await page.mouse.up();
  event = await begin();
  await source.dispatchEvent("pointermove", {
    ...event,
    clientX: event.clientX + 5,
  });
  await page.clock.runFor(300);
  await expect(page.locator(".of-builder")).not.toHaveAttribute(
    "data-ofb-dragging",
    "true",
  );
  await source.dispatchEvent("pointerup", event);
  await page.mouse.up();
  expect(
    await page.evaluate(
      () => window.miniBuilder.builder.getState().history.past.length,
    ),
  ).toBe(0);
});
