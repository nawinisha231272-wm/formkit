import { test, expect } from "@playwright/test";
import { writeFileSync, mkdirSync, appendFileSync } from "node:fs";
import { platform, arch } from "node:os";
import { execFileSync } from "node:child_process";
import { loadPerformancePolicy } from "../../scripts/platform-baselines.mjs";
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
    status: "measured",
    recordedAt: new Date().toISOString(),
    source: {
      commit: execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim(),
      dirty: !!execFileSync("git", ["status", "--porcelain"], {
        encoding: "utf8",
      }).trim(),
      ref: process.env.GITHUB_REF ?? null,
      githubActions: process.env.GITHUB_ACTIONS === "true",
      runId: process.env.GITHUB_RUN_ID ?? null,
      runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
      runnerType: process.env.OURFORM_CI_RUNNER_TYPE ?? null,
    },
    platform: `${platform()}-${arch()}`,
    browser: browserName,
    results,
  };
  await info.attach("performance", {
    body: JSON.stringify(report, null, 2),
    contentType: "application/json",
  });
  console.log(JSON.stringify(report, null, 2));
  mkdirSync("benchmark-results", { recursive: true });
  writeFileSync(
    "benchmark-results/measurement.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  expect(results.map((result) => result.processorRuns)).toEqual([
    650, 650, 650,
  ]);
  if (process.env.OURFORM_RECORD_BASELINE === "1") {
    if (report.platform === "linux-x64")
      throw new Error(
        "Linux CI baseline requires three successful clean main runs; a single recording cannot replace the pending baseline.",
      );
    writeFileSync(
      new URL(
        `../../docs/performance/baselines/${report.platform}.json`,
        import.meta.url,
      ),
      JSON.stringify(report, null, 2) + "\n",
    );
  } else {
    const policy = loadPerformancePolicy(report.platform);
    if (policy.mode === "record-only") {
      console.log(policy.message);
      info.annotations.push({
        type: "record-only",
        description: policy.message,
      });
      if (process.env.GITHUB_STEP_SUMMARY)
        appendFileSync(
          process.env.GITHUB_STEP_SUMMARY,
          `### ${policy.message}\nCorrectness assertions remain enforced; timings uploaded for three-run main calibration.\n`,
        );
    } else {
      console.log(
        `${report.platform} performance baseline enforced: fail above 20%`,
      );
      checkPerformance(
        policy.baseline.results.find((r) => r.count === 500)!,
        results[1]!,
      );
    }
  }
});
