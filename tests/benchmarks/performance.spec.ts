import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { platform, arch } from "node:os";
import { checkPerformance } from "../../scripts/performance-budget.mjs";
import type {} from "../../apps/benchmarks/main";
test("measured 100/500/1000-field baseline and strict 500-field performance budget", async ({
  page,
  browserName,
}, info) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.ourformBenchmark);
  const results = [];
  for (const count of [100, 500, 1000])
    results.push(
      await page.evaluate((count) => window.ourformBenchmark(count, 15), count),
    );
  const report = {
    recordedAt: new Date().toISOString(),
    platform: `${platform()}-${arch()}`,
    browser: browserName,
    results,
  };
  await info.attach("performance", {
    body: JSON.stringify(report, null, 2),
    contentType: "application/json",
  });
  console.log(JSON.stringify(report, null, 2));
  const path = new URL(
    "../../docs/performance/m07-baseline.json",
    import.meta.url,
  );
  if (process.env.OURFORM_RECORD_BASELINE === "1")
    writeFileSync(path, JSON.stringify(report, null, 2) + "\n");
  else {
    const baseline = JSON.parse(readFileSync(path, "utf8"));
    checkPerformance(
      baseline.results.find((r: { count: number }) => r.count === 500),
      results[1]!,
    );
  }
  expect(results.map((result) => result.processorRuns)).toEqual([
    650, 650, 650,
  ]);
});
