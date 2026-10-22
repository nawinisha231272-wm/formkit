import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { platform, arch } from "node:os";
import type {} from "../../apps/playground/builder";

for (const sourceKind of ["palette", "field"] as const)
  test(`record isolated 500-field ${sourceKind} drag Chromium timeline`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto("/builder.html?large");
    await expect(
      page.locator('#canvas [data-field-id="field_499"]'),
    ).toHaveCount(1);
    await page.evaluate(() => document.fonts.ready);
    const before = await page.evaluate(() =>
      JSON.stringify({
        definition: window.miniBuilder.builder.getState().definition,
        history: window.miniBuilder.builder.getState().history,
      }),
    );
    const cdp = await context.newCDPSession(page);
    const events: Record<string, unknown>[] = [];
    cdp.on("Tracing.dataCollected", ({ value }) => events.push(...value));
    await cdp.send("Tracing.start", {
      categories:
        "toplevel,devtools.timeline,disabled-by-default-devtools.timeline,blink.user_timing",
      transferMode: "ReportEvents",
    });
    if (sourceKind === "field")
      await page.locator('#canvas [data-field-id="field_0"]').hover();
    const source =
      sourceKind === "palette"
        ? page.locator('#palette [data-type="email"]')
        : page.locator(
            '#canvas [data-component-toolbar="field_0"] [data-ofb-action="move"]',
          );
    const from = (await source.boundingBox())!;
    const canvas = page.locator('[data-builder-part="canvas-panel"]'),
      box = (await canvas.boundingBox())!;
    await page.mouse.move(from.x + 15, from.y + 15);
    await page.mouse.down();
    await page.evaluate(() => performance.mark("builder-drag-pickup-start"));
    await page.mouse.move(from.x + 23, from.y + 15);
    await expect(page.locator(".of-builder")).toHaveAttribute(
      "data-ofb-dragging",
      "true",
    );
    await page.evaluate(() => performance.mark("builder-drag-active-start"));
    for (let i = 0; i < 80; i++)
      await page.mouse.move(
        box.x + box.width / 2 + (i % 2) * 30,
        box.y + 120 + (i % 6) * 55,
      );
    // Include real edge auto-scroll and its geometry invalidation in the active interval.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height - 12);
    await expect
      .poll(() => canvas.evaluate((el) => el.scrollTop))
      .toBeGreaterThan(0);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.evaluate(() => performance.mark("builder-drag-active-end"));
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await page.evaluate(() => performance.mark("builder-drag-cancel-end"));
    const completed = new Promise<void>((resolve) =>
      cdp.once("Tracing.tracingComplete", () => resolve()),
    );
    await cdp.send("Tracing.end");
    await completed;
    expect(
      await page.evaluate(() =>
        JSON.stringify({
          definition: window.miniBuilder.builder.getState().definition,
          history: window.miniBuilder.builder.getState().history,
        }),
      ),
    ).toBe(before);
    const marks = new Map(
      events
        .filter((e) => String(e.cat).includes("blink.user_timing"))
        .map((e) => [String(e.name), Number(e.ts)]),
    );
    const pickup = marks.get("builder-drag-pickup-start")!;
    const start = marks.get("builder-drag-active-start")!,
      end = marks.get("builder-drag-active-end")!;
    expect(end).toBeGreaterThan(start);
    const tasks = events.filter(
      (e) =>
        e.name === "RunTask" &&
        e.ph === "X" &&
        Number(e.ts) + Number(e.dur) > pickup &&
        Number(e.ts) < end,
    );
    expect(tasks.length).toBeGreaterThan(0);
    const durations = tasks.map((e) => Number(e.dur) / 1000);
    const report = {
      platform: `${platform()}-${arch()}`,
      fields: 500,
      source: sourceKind,
      pointerMoves: 80,
      pickupMilliseconds: (start - pickup) / 1000,
      activeMilliseconds: (end - start) / 1000,
      taskCount: tasks.length,
      maxTaskMilliseconds: Math.max(0, ...durations),
      over50ms: durations.filter((d) => d > 50),
    };
    const directory = `benchmark-results/builder-drag/${report.platform}/${sourceKind}`;
    await mkdir(directory, { recursive: true });
    await writeFile(
      `${directory}/trace.json`,
      JSON.stringify({ traceEvents: events }),
    );
    await writeFile(
      `${directory}/report.json`,
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report));
    // Task durations include pickup and every task overlapping the drag interval.
    // Timing is recorded independently of verify/PR correctness gates. Inspect this report for
    // M09b's 50ms acceptance criterion; never turn runner timing noise into a correctness failure.
  });
