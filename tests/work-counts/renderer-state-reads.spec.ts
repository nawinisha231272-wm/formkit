import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import type {} from "../../apps/benchmarks/counts";
const baseline = JSON.parse(
  readFileSync(
    new URL(
      "../../docs/performance/renderer-state-read-counts.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
for (const kind of ["plain", "legacy"] as const)
  for (const size of ["100", "500", "1000"] as const)
    test(`${kind} ${size}: error/live summaries read each field state once`, async ({
      page,
    }) => {
      await page.goto("/counts.html");
      await page.waitForFunction(() => !!window.ourformWorkCounts);
      const work = await page.evaluate(
        ({ size, legacy }) => window.ourformWorkCounts(size, legacy),
        { size, legacy: kind === "legacy" },
      );
      expect(work).toHaveLength(25);
      for (const edit of work)
        expect(edit.fieldStateReadsPerEdit).toBe(
          baseline.cases[`${kind}${size}`],
        );
    });
test("onboarding: error/live summaries retain the main state-read budget", async ({
  page,
}) => {
  await page.goto("/counts.html");
  await page.waitForFunction(() => !!window.ourformWorkCounts);
  const work = await page.evaluate(() =>
    window.ourformWorkCounts("onboarding"),
  );
  expect(work).toHaveLength(25);
  for (const edit of work)
    expect(edit.fieldStateReadsPerEdit).toBe(baseline.cases.onboarding);
});
