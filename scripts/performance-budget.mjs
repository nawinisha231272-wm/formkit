/** Fail on any measured metric more than 20% above the stored median. */
export function checkPerformance(baseline, actual) {
  const failures = [];
  for (const metric of ["compileMS", "mountMS", "editMS", "themeMS"]) {
    const before = baseline[metric],
      after = actual[metric];
    if (
      !(before > 0) ||
      !(after > 0) ||
      !Number.isFinite(before) ||
      !Number.isFinite(after)
    )
      throw new Error(`Invalid performance metric: ${metric}`);
    if (after > before * 1.2)
      failures.push(
        `${metric}: ${after.toFixed(2)} ms exceeds ${(before * 1.2).toFixed(2)} ms (baseline ${before.toFixed(2)} ms)`,
      );
  }
  if (failures.length)
    throw new Error(`Performance regression >20%:\n${failures.join("\n")}`);
}
