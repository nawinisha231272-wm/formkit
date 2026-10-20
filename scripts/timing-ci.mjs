import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import {
  readFileSync,
  mkdirSync,
  writeFileSync,
  appendFileSync,
  openSync,
  closeSync,
} from "node:fs";
import { resolve, sep, extname } from "node:path";
import { platform, arch } from "node:os";
import { createHash } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { chromium } from "@playwright/test";
import {
  pairedRatios,
  compareTimings,
  timingResult,
} from "./timing-statistics.mjs";
import { loadPlatformBaseline } from "./platform-baselines.mjs";
import { advanceNightly, nightlyIssuePlan } from "./nightly-performance.mjs";
import { probeLoopback } from "./loopback-health.mjs";
const mode = process.argv[2];
const actualPlatform = `${platform()}-${arch()}`;
const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
function summary(text) {
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + "\n");
}
function save(name, value) {
  mkdirSync("benchmark-results", { recursive: true });
  writeFileSync(
    `benchmark-results/${name}.json`,
    JSON.stringify(value, null, 2) + "\n",
  );
}
async function api(path, options = {}) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo ?? "") || !token)
    throw new Error(
      "GitHub repository/token required for nightly state/issue updates",
    );
  const response = await fetch(`https://api.github.com/repos/${repo}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...options.headers,
    },
  });
  if (!response.ok)
    throw new Error(`GitHub ${path.split("?")[0]}: HTTP ${response.status}`);
  return response.json();
}
async function serve(rootPath) {
  const root = resolve(rootPath);
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://localhost");
      const file = resolve(
        root,
        "." +
          decodeURIComponent(
            url.pathname === "/" ? "/index.html" : url.pathname,
          ),
      );
      if (!file.startsWith(root + sep) || !(await stat(file)).isFile())
        throw new Error("Not found");
      response.setHeader(
        "Content-Type",
        {
          ".html": "text/html",
          ".js": "text/javascript",
          ".css": "text/css",
          ".json": "application/json",
        }[extname(file)] ?? "application/octet-stream",
      );
      response.end(await readFile(file));
    } catch {
      response.statusCode = 404;
      response.end("Not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
async function devServer(rootPath) {
  mkdirSync("benchmark-results", { recursive: true });
  const logPath = "benchmark-results/nightly-vite.log";
  const log = openSync(logPath, "w");
  const child = spawn("pnpm", ["--filter", "@ourform/benchmarks", "dev"], {
    cwd: resolve(rootPath),
    detached: true,
    stdio: ["ignore", log, log],
  });
  closeSync(log);
  let spawnError;
  child.on("error", (error) => {
    spawnError = error;
  });
  const close = async () => {
    if (child.pid && child.exitCode === null) {
      process.kill(-child.pid, "SIGTERM");
      await new Promise((resolve) => child.once("exit", resolve));
    }
  };
  try {
    const deadline = Date.now() + 120000;
    let lastProbe;
    while (Date.now() < deadline) {
      if (spawnError) throw spawnError;
      if (child.exitCode !== null)
        throw new Error("Nightly Vite server exited before readiness");
      lastProbe = await probeLoopback(4190);
      if (lastProbe.ok) return { url: "http://127.0.0.1:4190", close };
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    throw new Error(
      `Nightly Vite server readiness timeout: ${JSON.stringify(lastProbe)}`,
    );
  } catch (error) {
    await close();
    throw new Error(
      `${error.message}\nVite log:\n${readFileSync(logPath, "utf8").slice(-4000)}`,
    );
  }
}
async function measure(browser, server) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  try {
    const page = await context.newPage();
    await page.goto(server.url);
    await page.waitForFunction(
      () => typeof window.ourformBenchmark === "function",
    );
    const results = [];
    for (const count of [100, 500, 1000])
      results.push(
        await page.evaluate(
          (count) => window.ourformBenchmark(count, 15),
          count,
        ),
      );
    for (const count of [100, 500, 1000]) timingResult(results, count);
    return results;
  } finally {
    await context.close();
  }
}
async function previousState() {
  const runs = await api(
    "actions/workflows/nightly-performance.yml/runs?event=schedule&branch=main&status=completed&per_page=10",
  );
  for (const run of runs.workflow_runs) {
    if (String(run.id) === process.env.GITHUB_RUN_ID) continue;
    const artifacts = await api(`actions/runs/${run.id}/artifacts`);
    const artifact = artifacts.artifacts.find(
      (item) => item.name === "nightly-performance-state" && !item.expired,
    );
    if (!artifact) continue;
    const redirect = await fetch(
      `https://api.github.com/repos/${repo}/actions/artifacts/${artifact.id}/zip`,
      { redirect: "manual", headers: { Authorization: `Bearer ${token}` } },
    );
    if (redirect.status !== 302 || !redirect.headers.get("location"))
      throw new Error("Cannot download prior nightly state");
    const download = await fetch(redirect.headers.get("location")); // No token forwarded to storage host.
    if (!download.ok) throw new Error(`State download HTTP ${download.status}`);
    const zip = Buffer.from(await download.arrayBuffer());
    const json = execFileSync(
      "python3",
      [
        "-c",
        "import io,json,sys,zipfile; z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())); i=z.getinfo('nightly-state.json'); assert i.file_size<1000000; print(z.read(i).decode())",
      ],
      { input: zip, maxBuffer: 1000000 },
    ).toString();
    return JSON.parse(json);
  }
  return null;
}
async function publishNightly(results) {
  if (actualPlatform !== "linux-x64")
    throw new Error("Nightly baseline is linux-x64 only");
  const baseline = loadPlatformBaseline(actualPlatform);
  const comparisons = compareTimings(baseline, results);
  const hash = createHash("sha256")
    .update(
      readFileSync(
        new URL(
          "../docs/performance/baselines/linux-x64.json",
          import.meta.url,
        ),
      ),
    )
    .digest("hex");
  const scheduled = process.env.GITHUB_EVENT_NAME === "schedule";
  if (!scheduled) {
    summary(
      "Manual nightly diagnostic: timings reported; does not advance streaks or modify issues.",
    );
    save("nightly-diagnostic", { comparisons });
    return;
  }
  if (process.env.GITHUB_REF !== "refs/heads/main")
    throw new Error("Nightly state must be recorded on main");
  const state = advanceNightly(
    await previousState(),
    new Date().toISOString().slice(0, 10),
    hash,
    comparisons,
  );
  state.runUrl = `${process.env.GITHUB_SERVER_URL}/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}`;
  save("nightly-state", state);
  let existing;
  for (let page = 1; !existing; page++) {
    const issues = await api(`issues?state=open&per_page=100&page=${page}`);
    existing = issues.find(
      (issue) =>
        !issue.pull_request &&
        issue.body?.includes(
          "<!-- ourform-nightly-performance:linux-x64:start -->",
        ),
    );
    if (issues.length < 100) break;
  }
  const plan = nightlyIssuePlan(state, existing);
  if (plan.action !== "none") {
    const issue = await api(existing ? `issues/${existing.number}` : "issues", {
      method: existing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: plan.title, body: plan.body }),
    });
    summary(`Nightly issue ${plan.action}: ${issue.html_url}`);
  } else
    summary(
      "Nightly timings recorded: no metric has exceeded its Linux baseline by >20% for three consecutive nights.",
    );
}
const servers = [];
let browser;
try {
  if (!["--ab", "--nightly"].includes(mode))
    throw new Error(
      "Use --ab <main-dist> <candidate-dist> or --nightly <workspace>",
    );
  if (
    (mode === "--nightly" || process.env.GITHUB_ACTIONS === "true") &&
    actualPlatform !== "linux-x64"
  )
    throw new Error("CI timing jobs require the pinned linux-x64 runner");
  servers.push(
    mode === "--nightly"
      ? await devServer(process.argv[3])
      : await serve(process.argv[3]),
  );
  if (mode === "--ab") servers.push(await serve(process.argv[4]));
  browser = await chromium.launch();
  if (mode === "--ab") {
    const pairs = [];
    for (let pair = 0; pair < 5; pair++) {
      const main = await measure(browser, servers[0]);
      const candidate = await measure(browser, servers[1]);
      pairs.push({ order: ["main", "candidate"], main, candidate });
    }
    const ratios = pairedRatios(pairs);
    save("ab-timing", {
      status: "measured",
      platform: actualPlatform,
      mainCommit: process.env.OURFORM_MAIN_SHA,
      candidateCommit: process.env.GITHUB_SHA,
      pairs,
      ratios,
    });
    summary(
      [
        "## Advisory interleaved A/B timings",
        "Five pairs, alternating main → PR build, one runner/browser, fresh contexts; 3 warm-ups and 15 samples per fixture. Ratios are median(PR/main) across pairs; never a PR timing failure.",
        "",
        "| Fields | Compile ratio | Mount ratio | Edit ratio | Theme ratio |",
        "| --- | --- | --- | --- | --- |",
        ...ratios.map(
          (row) =>
            `| ${row.count} | ${row.compileMS.toFixed(3)}× | ${row.mountMS.toFixed(3)}× | ${row.editMS.toFixed(3)}× | ${row.themeMS.toFixed(3)}× |`,
        ),
      ].join("\n"),
    );
  } else {
    const results = await measure(browser, servers[0]);
    save("nightly-timing", {
      platform: actualPlatform,
      commit: process.env.GITHUB_SHA,
      results,
    });
    await publishNightly(results);
  }
} catch (error) {
  save("timing-error", { status: "unavailable", message: error.message });
  summary(
    `## Timing report unavailable\n${error.message}\nNo timing regression verdict was produced.`,
  );
  if (mode !== "--ab") process.exitCode = 1;
} finally {
  await browser?.close();
  await Promise.all(servers.map((server) => server.close()));
}
