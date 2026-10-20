/** One state per UTC date, exact platform and immutable baseline identity. Missing nights reset streaks. */
export function advanceNightly(previous, date, baselineHash, comparisons) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(Date.parse(`${date}T00:00:00Z`))
  )
    throw new Error("Invalid nightly date");
  const compatible =
    previous?.version === 1 &&
    previous.platform === "linux-x64" &&
    previous.baselineHash === baselineHash;
  if (compatible && previous.date === date) return previous; // Idempotent re-delivery, never another night.
  const yesterday = new Date(Date.parse(`${date}T00:00:00Z`) - 86400000)
    .toISOString()
    .slice(0, 10);
  const consecutive = compatible && previous.date === yesterday;
  const metrics = {};
  if (!Array.isArray(comparisons) || comparisons.length !== 12)
    throw new Error("Expected all twelve nightly metrics");
  for (const comparison of comparisons) {
    if (
      !Number.isFinite(comparison.ratio) ||
      comparison.ratio <= 0 ||
      Object.hasOwn(metrics, comparison.key)
    )
      throw new Error("Invalid nightly metric");
    metrics[comparison.key] = {
      ...comparison,
      streak: comparison.exceeded
        ? (consecutive
            ? (previous.metrics?.[comparison.key]?.streak ?? 0)
            : 0) + 1
        : 0,
    };
  }
  return { version: 1, platform: "linux-x64", baselineHash, date, metrics };
}
export function nightlyIssuePlan(state, existing) {
  const regressions = Object.values(state.metrics).filter(
    (metric) => metric.streak >= 3,
  );
  if (!existing && !regressions.length) return { action: "none" };
  const lines = Object.entries(state.metrics).map(
    ([key, metric]) =>
      `| ${key} | ${metric.actual.toFixed(2)} | ${metric.baseline.toFixed(2)} | ${metric.ratio.toFixed(3)}× | ${metric.streak} |`,
  );
  const section = [
    "<!-- ourform-nightly-performance:linux-x64:start -->",
    `Latest measurement: ${state.date} UTC. Baseline SHA-256: ${state.baselineHash}.`,
    regressions.length
      ? "Sustained regressions (>20% for at least three consecutive nights): " +
        regressions.map((metric) => metric.key).join(", ")
      : "No metric currently has a sustained three-night regression; retain this issue for review.",
    "",
    "| Metric | Actual ms | Baseline ms | Ratio | Consecutive nights |",
    "| --- | --- | --- | --- | --- |",
    ...lines,
    "",
    `CI: ${state.runUrl}`,
    "",
    "Counts and correctness remain hard gates. Timing thresholds and baselines have not been rewritten.",
    "<!-- ourform-nightly-performance:linux-x64:end -->",
  ].join("\n");
  const marker =
    /<!-- ourform-nightly-performance:linux-x64:start -->[\s\S]*?<!-- ourform-nightly-performance:linux-x64:end -->/;
  return {
    action: existing ? "update" : "create",
    title: "Nightly Linux performance regression",
    body:
      existing?.body && marker.test(existing.body)
        ? existing.body.replace(marker, () => section)
        : section,
  };
}
