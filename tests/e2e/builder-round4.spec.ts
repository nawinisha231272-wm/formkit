import { test, expect } from "@playwright/test";
import type {} from "../../apps/playground/builder";

for (const theme of ["material", "bootstrap5"])
  for (const state of [
    "selected-column",
    "hover-neighbour",
    "first-panel-field",
    "clipped-first-panel-field",
  ])
    test(`${theme} 1280: ${state} name tag stays outside content`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(
        `/builder.html?approved&theme=${theme}&chrome=match-form`,
      );
      await page.getByRole("tab", { name: "Build", exact: true }).click();
      await page.evaluate(() => document.fonts.ready);
      const field = page.locator(
        `#canvas [data-field-id="${state.includes("first-panel-field") ? "fullName" : "email"}"]`,
      );
      await field.focus();
      if (state === "first-panel-field") {
        const panel = page.locator('#canvas [data-field-id="contactPanel"]');
        await expect(panel.locator(":scope > .of-layout-title")).toBeVisible();
        expect(
          await panel.evaluate(
            (el) =>
              el.getBoundingClientRect().top >=
              el
                .closest('[data-builder-part="canvas-panel"]')!
                .getBoundingClientRect().top,
          ),
        ).toBe(true);
        await expect(field).toHaveAttribute("data-ofb-chrome-below", "");
      }
      if (state === "clipped-first-panel-field") {
        await field.evaluate(
          (el) =>
            new Promise<void>((resolve) => {
              const port = el.closest('[data-builder-part="canvas-panel"]')!;
              port.addEventListener(
                "scroll",
                () => requestAnimationFrame(() => resolve()),
                { once: true },
              );
              port.scrollTop +=
                el.getBoundingClientRect().top -
                port.getBoundingClientRect().top -
                2;
            }),
        );
        await expect(field).toHaveAttribute("data-ofb-chrome-below", "");
      }
      let shown = field;
      if (state === "hover-neighbour") {
        await page
          .getByRole("searchbox", { name: "Search components", exact: true })
          .focus();
        shown = page.locator('#canvas [data-field-id="fullName"]');
        await shown.hover();
        await expect(shown).toHaveAttribute("data-ofb-chrome-below", "");
      }
      const tag = shown.locator(":scope > .ofb-selection-label");
      await expect(tag).toBeVisible();
      await expect(tag).toHaveAttribute("title", /.+/);
      await expect(tag).toHaveCSS("display", "block");
      await expect(tag).toHaveCSS("justify-content", "flex-start");
      expect(await tag.evaluate((el) => el.scrollLeft)).toBe(0);
      const boxes = await shown.evaluate((el) => {
        const rect = (selector: string) => {
          const r = el.querySelector(selector)!.getBoundingClientRect();
          return {
            left: r.left,
            right: r.right,
            top: r.top,
            bottom: r.bottom,
            width: r.width,
          };
        };
        const tag = el.querySelector(":scope > .ofb-selection-label")!;
        const first = document.createRange();
        first.setStart(tag.firstChild!, 0);
        first.setEnd(tag.firstChild!, 1);
        return {
          first: first.getBoundingClientRect().left,
          headings: [
            ...el
              .closest('[data-builder-part="canvas-panel"]')!
              .querySelectorAll("h1,h2,h3,legend,label,.of-layout-title"),
          ]
            .map((h) => {
              const range = document.createRange();
              range.selectNodeContents(h);
              const r = range.getBoundingClientRect();
              return {
                left: r.left,
                right: r.right,
                top: r.top,
                bottom: r.bottom,
                width: r.width,
              };
            })
            .filter((r) => r.width > 0),
          tag: rect(":scope > .ofb-selection-label"),
          toolbar: rect(":scope > .ofb-component-toolbar"),
          label: rect("label"),
        };
      });
      const intersects = (a: typeof boxes.tag, b: typeof boxes.tag) =>
        a.left < b.right &&
        a.right > b.left &&
        a.top < b.bottom &&
        a.bottom > b.top;
      expect(intersects(boxes.tag, boxes.label)).toBe(false);
      expect(intersects(boxes.tag, boxes.toolbar)).toBe(false);
      for (const heading of boxes.headings) {
        expect(intersects(boxes.tag, heading)).toBe(false);
        expect(intersects(boxes.toolbar, heading)).toBe(false);
      }
      expect(boxes.tag.width).toBeGreaterThan(0);
      expect(boxes.first).toBeGreaterThanOrEqual(boxes.tag.left);
      expect(boxes.first).toBeLessThan(boxes.tag.right);
      await page.evaluate(() => document.fonts.ready);
      if (
        info.project.name === "chromium" &&
        state !== "clipped-first-panel-field"
      )
        await expect(page).toHaveScreenshot(`round4-${theme}-${state}.png`, {
          animations: "disabled",
          maxDiffPixelRatio: 0.02,
        });
    });

test("Undo retains focus when empty; Ctrl/Meta+Z announces empty history from button and body", async ({
  page,
}) => {
  await page.goto("/builder.html?approved");
  for (const icon of await page.locator(".ofb-header .ofb-icon").all())
    await expect(icon).toHaveCSS("width", "16px");
  await page.locator('#canvas [data-field-id="email"]').focus();
  await page.keyboard.press("ControlOrMeta+d");
  const undo = page
    .locator(".ofb-header-actions")
    .getByRole("button", { name: "Undo", exact: true });
  await undo.click();
  await expect(undo).toHaveAttribute("aria-disabled", "true");
  await expect(undo).toBeFocused();
  await page.keyboard.press("ControlOrMeta+z");
  await expect(page.locator("#diagnostics")).toHaveText("Nothing to undo");
  await page.evaluate(() => (document.activeElement as HTMLElement).blur());
  await expect(page.locator("body")).toBeFocused();
  await page.keyboard.press("ControlOrMeta+z");
  await expect(page.locator("#diagnostics")).toHaveText("Nothing to undo");
});
