export function advanceNightly(
  previous: unknown,
  date: string,
  baselineHash: string,
  comparisons: unknown,
): {
  version: number;
  platform: string;
  baselineHash: string;
  date: string;
  metrics: Record<string, { streak: number; ratio: number }>;
};
export function nightlyIssuePlan(
  state: unknown,
  existing: unknown,
): { action: string; title?: string; body?: string };
