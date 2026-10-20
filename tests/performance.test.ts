import { test, expect } from "vitest";
import { checkPerformance } from "../scripts/performance-budget.mjs";
test("performance budget accepts the 20% boundary and rejects each metric beyond it", () => {
  const baseline = { compileMS: 10, mountMS: 10, editMS: 10, themeMS: 10 };
  expect(() =>
    checkPerformance(baseline, {
      compileMS: 12,
      mountMS: 12,
      editMS: 12,
      themeMS: 12,
    }),
  ).not.toThrow();
  for (const key of Object.keys(baseline))
    expect(() =>
      checkPerformance(baseline, { ...baseline, [key]: 12.01 }),
    ).toThrow("regression >20%");
  expect(() =>
    checkPerformance(baseline, { ...baseline, editMS: NaN }),
  ).toThrow("Invalid performance metric");
});

test("performance baselines select the exact platform and reject cross-platform or pending data", async () => {
  const { requirePlatformBaseline, loadPlatformBaseline } = await import(
    "../scripts/platform-baselines.mjs"
  );
  const mac = loadPlatformBaseline("darwin-arm64");
  expect(mac.platform).toBe("darwin-arm64");
  expect(() => requirePlatformBaseline(mac, "linux-x64")).toThrow(
    "platform mismatch",
  );
  expect(() =>
    requirePlatformBaseline(
      { platform: "linux-x64", status: "pending", results: [] },
      "linux-x64",
    ),
  ).toThrow("pending");
  expect(() => loadPlatformBaseline("../darwin-arm64")).toThrow(
    "Invalid baseline platform",
  );
  expect(() => loadPlatformBaseline("unsupported-x64")).toThrow(
    "No readable performance baseline",
  );
  expect(() =>
    requirePlatformBaseline(
      { platform: "linux-x64", status: "measured", results: [] },
      "linux-x64",
    ),
  ).toThrow("exactly one 500-field");
  const linux = {
    platform: "linux-x64",
    status: "measured",
    results: [{ count: 500, compileMS: 1, mountMS: 2, editMS: 3, themeMS: 4 }],
  };
  expect(requirePlatformBaseline(linux, "linux-x64")).toBe(linux);
});

test("Linux baseline aggregation requires three successful clean main runs and takes per-metric medians", async () => {
  const { aggregateCiBaseline } = await import(
    "../scripts/aggregate-ci-baseline.mjs"
  );
  const reports = [10, 30, 20].map((value, index) => ({
    platform: "linux-x64",
    status: "measured",
    browser: "chromium",
    source: {
      githubActions: true,
      dirty: false,
      ref: "refs/heads/main",
      runId: String(index + 1),
      commit: "same-main-commit",
      runnerType: "ubuntu-24.04",
    },
    results: [100, 500, 1000].map((count) => ({
      count,
      samples: 15,
      compileMS: value,
      mountMS: value + 1,
      editMS: value + 2,
      themeMS: value + 3,
      processorRuns: 650,
    })),
  }));
  const runs = reports.map((report) => ({
    id: Number(report.source.runId),
    conclusion: "success",
    jobs: [{ labels: ["ubuntu-24.04"] }],
    head_branch: "main",
    head_sha: report.source.commit,
    html_url: `https://github.com/example/actions/runs/${report.source.runId}`,
  }));
  expect(() =>
    aggregateCiBaseline(reports, [
      { ...runs[0], jobs: [{ labels: ["ubuntu-22.04"] }] },
      ...runs.slice(1),
    ]),
  ).toThrow("same ubuntu-24.04");
  const result = aggregateCiBaseline(reports, runs);
  expect(result.platform).toBe("linux-x64");
  expect(result.results.find((r) => r.count === 500)).toMatchObject({
    compileMS: 20,
    mountMS: 21,
    editMS: 22,
    themeMS: 23,
  });
  expect(() => aggregateCiBaseline(reports.slice(0, 2), runs)).toThrow(
    "Exactly three",
  );
  expect(() =>
    aggregateCiBaseline(reports, [
      { ...runs[0], conclusion: "failure" },
      ...runs.slice(1),
    ]),
  ).toThrow("successful matching");
  expect(() =>
    aggregateCiBaseline([reports[0], reports[0], reports[2]], runs),
  ).toThrow("distinct");
  for (const source of [
    { ...reports[0]!.source, githubActions: false },
    { ...reports[0]!.source, dirty: true },
    { ...reports[0]!.source, ref: "refs/heads/housekeeping" },
  ])
    expect(() =>
      aggregateCiBaseline(
        [{ ...reports[0], source }, ...reports.slice(1)],
        runs,
      ),
    ).toThrow("real linux-x64");
  expect(() =>
    aggregateCiBaseline(
      [{ ...reports[0], platform: "darwin-arm64" }, ...reports.slice(1)],
      runs,
    ),
  ).toThrow("real linux-x64");
});

test("bootstrap records only pending Linux; Mac and measured Linux enforce and calibration can be closed", async () => {
  const { selectPerformancePolicy, loadPlatformBaseline } = await import(
    "../scripts/platform-baselines.mjs"
  );
  const pending = { platform: "linux-x64", status: "pending", results: [] };
  expect(selectPerformancePolicy(pending, "linux-x64", false)).toEqual({
    mode: "record-only",
    message: "linux baseline missing: not enforced",
  });
  expect(() => selectPerformancePolicy(pending, "linux-x64", true)).toThrow(
    "pending",
  );
  expect(() => selectPerformancePolicy(pending, "darwin-arm64", false)).toThrow(
    "platform mismatch",
  );
  expect(() =>
    selectPerformancePolicy(
      { ...pending, platform: "darwin-arm64" },
      "darwin-arm64",
      false,
    ),
  ).toThrow("pending");
  const mac = loadPlatformBaseline("darwin-arm64");
  expect(selectPerformancePolicy(mac, "darwin-arm64", false)).toEqual({
    mode: "enforce",
    baseline: mac,
  });
  const linux = { ...mac, platform: "linux-x64" };
  expect(selectPerformancePolicy(linux, "linux-x64", false)).toEqual({
    mode: "enforce",
    baseline: linux,
  });
  expect(() =>
    selectPerformancePolicy(
      { ...pending, status: "invalid" },
      "linux-x64",
      false,
    ),
  ).toThrow("invalid");
});
