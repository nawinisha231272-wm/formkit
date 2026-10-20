import { readFileSync } from "node:fs";
import { platform, arch } from "node:os";
/** Exact platform match only: no fallback, aliases, or pending-baseline success. */
export function requirePlatformBaseline(baseline, actualPlatform) {
  if (!baseline || baseline.platform !== actualPlatform)
    throw new Error(
      `Performance baseline platform mismatch: expected ${actualPlatform}, received ${baseline?.platform ?? "missing"}`,
    );
  if (baseline.status !== "measured")
    throw new Error(
      `Performance baseline for ${actualPlatform} is ${baseline.status ?? "unmeasured"}. Record three clean CI runs on main before enabling the Linux budget. Use benchmark:measure only for explicit calibration; it is not a passing regression check.`,
    );
  if (
    !Array.isArray(baseline.results) ||
    baseline.results.filter((r) => r.count === 500).length !== 1
  )
    throw new Error(
      `Performance baseline for ${actualPlatform} must contain exactly one 500-field result`,
    );
  return baseline;
}
export function loadPlatformBaseline(
  actualPlatform = `${platform()}-${arch()}`,
) {
  if (!/^[a-z0-9]+-[a-z0-9]+$/.test(actualPlatform))
    throw new Error("Invalid baseline platform");
  const path = new URL(
    `../docs/performance/baselines/${actualPlatform}.json`,
    import.meta.url,
  );
  let baseline;
  try {
    baseline = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(
      `No readable performance baseline for ${actualPlatform}: ${error.message}`,
    );
  }
  return requirePlatformBaseline(baseline, actualPlatform);
}
