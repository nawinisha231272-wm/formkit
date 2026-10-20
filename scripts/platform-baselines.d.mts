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

export type PerformancePolicy =
  | { mode: "enforce"; baseline: PlatformBaseline }
  | { mode: "record-only"; message: string };
export function selectPerformancePolicy(
  baseline: unknown,
  actualPlatform: string,
  linuxBaselineRequired: boolean,
): PerformancePolicy;
export function loadPerformancePolicy(
  actualPlatform?: string,
): PerformancePolicy;
