import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
const metrics = ["compileMS", "mountMS", "editMS", "themeMS"];
/** Only independently successful, clean main CI runs can turn the Linux placeholder into a baseline. */
export function aggregateCiBaseline(reports, runs) {
  if (reports.length !== 3 || runs.length !== 3)
    throw new Error("Exactly three clean CI runs are required");
  const ids = new Set();
  const commits = new Set();
  for (const report of reports) {
    const source = report.source;
    if (
      report.platform !== "linux-x64" ||
      report.status !== "measured" ||
      report.browser !== "chromium" ||
      source?.githubActions !== true ||
      source.dirty !== false ||
      source.ref !== "refs/heads/main" ||
      source.runnerType !== "ubuntu-24.04"
    )
      throw new Error(
        "Each report must measure clean main on a real linux-x64 GitHub Actions runner",
      );
    const id = String(source.runId);
    if (!/^\d+$/.test(id) || ids.has(id))
      throw new Error("Three distinct GitHub run IDs are required");
    const run = runs.find((run) => String(run.id) === id);
    if (
      !run ||
      run.conclusion !== "success" ||
      run.head_branch !== "main" ||
      run.head_sha !== source.commit
    )
      throw new Error(`Run ${id} is not a successful matching main run`);
    if (
      !run.jobs?.length ||
      run.jobs.some((job) => !job.labels?.includes(source.runnerType))
    )
      throw new Error(`Run ${id} must use the same ubuntu-24.04 runner type`);
    ids.add(id);
    commits.add(source.commit);
  }
  if (commits.size !== 1)
    throw new Error("Measure the same main commit in all three clean runs");
  const results = [100, 500, 1000].map((count) => {
    const samples = reports.map((report) => {
      const matches = report.results?.filter(
        (result) => result.count === count,
      );
      if (matches?.length !== 1)
        throw new Error(`Missing/duplicate ${count}-field measurement`);
      const sample = matches[0];
      if (
        sample.samples !== 15 ||
        sample.processorRuns !== 650 ||
        metrics.some(
          (metric) => !(sample[metric] > 0) || !Number.isFinite(sample[metric]),
        )
      )
        throw new Error(`Invalid ${count}-field measurement`);
      return sample;
    });
    return {
      count,
      samples: 15,
      ...Object.fromEntries(
        metrics.map((metric) => [
          metric,
          samples.map((sample) => sample[metric]).sort((a, b) => a - b)[1],
        ]),
      ),
      processorRuns: 650,
    };
  });
  return {
    platform: "linux-x64",
    status: "measured",
    browser: "chromium",
    runnerType: "ubuntu-24.04",
    recordedAt: new Date().toISOString(),
    aggregation:
      "Per-metric median of three clean successful main CI run medians; each run has 3 warm-ups and 15 measured samples per size",
    commit: [...commits][0],
    ciRuns: reports.map((report) => {
      const run = runs.find(
        (run) => String(run.id) === String(report.source.runId),
      );
      return {
        id: run.id,
        url: run.html_url,
        commit: run.head_sha,
        conclusion: run.conclusion,
      };
    }),
    results,
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const paths = process.argv.slice(2);
  if (paths.length !== 3)
    throw new Error(
      "Usage: node scripts/aggregate-ci-baseline.mjs <CI-report-1.json> <CI-report-2.json> <CI-report-3.json>",
    );
  const reports = paths.map((path) => JSON.parse(readFileSync(path, "utf8")));
  const runs = reports.map((report) => {
    const id = String(report.source?.runId);
    if (!/^\d+$/.test(id)) throw new Error("Invalid run ID");
    const run = JSON.parse(
      execFileSync(
        "gh",
        ["api", `repos/nawinisha231272-wm/formkit/actions/runs/${id}`],
        { encoding: "utf8" },
      ),
    );
    const jobs = JSON.parse(
      execFileSync(
        "gh",
        ["api", `repos/nawinisha231272-wm/formkit/actions/runs/${id}/jobs`],
        { encoding: "utf8" },
      ),
    );
    return { ...run, jobs: jobs.jobs };
  });
  const baseline = aggregateCiBaseline(reports, runs);
  writeFileSync(
    new URL("../docs/performance/baselines/linux-x64.json", import.meta.url),
    JSON.stringify(baseline, null, 2) + "\n",
  );
  console.log(
    "Recorded the median of three API-verified successful clean main CI runs. Review the diff before committing.",
  );
}
