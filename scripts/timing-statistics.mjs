export const timingMetrics = ["compileMS", "mountMS", "editMS", "themeMS"];
export const median = (values) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
export function timingResult(results, count) {
  const matching = results?.filter((row) => row.count === count);
  if (matching?.length !== 1)
    throw new Error(`Expected one ${count}-field timing`);
  const row = matching[0];
  if (
    row.samples !== 15 ||
    row.processorRuns !== 650 ||
    timingMetrics.some((key) => !(row[key] > 0) || !Number.isFinite(row[key]))
  )
    throw new Error(`Invalid ${count}-field timing/correctness report`);
  return row;
}
/** Ratios are computed within each adjacent same-runner A/B pair, then medianed. */
export function pairedRatios(pairs) {
  if (!Array.isArray(pairs) || pairs.length < 5)
    throw new Error("At least five interleaved A/B pairs are required");
  return [100, 500, 1000].map((count) => ({
    count,
    ...Object.fromEntries(
      timingMetrics.map((metric) => [
        metric,
        median(
          pairs.map(
            (pair) =>
              timingResult(pair.candidate, count)[metric] /
              timingResult(pair.main, count)[metric],
          ),
        ),
      ]),
    ),
  }));
}
export function compareTimings(baseline, results) {
  return [100, 500, 1000].flatMap((count) => {
    const before = timingResult(baseline.results, count),
      after = timingResult(results, count);
    return timingMetrics.map((metric) => ({
      key: `${count}/${metric}`,
      count,
      metric,
      baseline: before[metric],
      actual: after[metric],
      ratio: after[metric] / before[metric],
      exceeded: after[metric] > before[metric] * 1.2,
    }));
  });
}
