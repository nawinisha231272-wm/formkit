export const timingMetrics: readonly string[];
export function median(values: number[]): number;
export interface TimingComparison {
  key: string;
  count: number;
  metric: string;
  baseline: number;
  actual: number;
  ratio: number;
  exceeded: boolean;
}
export function compareTimings(
  baseline: unknown,
  results: unknown,
): TimingComparison[];
export function pairedRatios(pairs: unknown): {
  count: number;
  compileMS: number;
  mountMS: number;
  editMS: number;
  themeMS: number;
}[];
