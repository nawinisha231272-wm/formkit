import type { PerformanceMetrics } from "./performance-budget.mjs";
export interface BenchmarkResult extends PerformanceMetrics {
  count: number;
  samples: number;
  processorRuns: number;
}
export interface PlatformBaseline {
  platform: string;
  status: "measured";
  results: BenchmarkResult[];
}
export function requirePlatformBaseline(
  baseline: unknown,
  actualPlatform: string,
): PlatformBaseline;
export function loadPlatformBaseline(actualPlatform?: string): PlatformBaseline;
