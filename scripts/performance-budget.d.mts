export interface PerformanceMetrics {
  compileMS: number;
  mountMS: number;
  editMS: number;
  themeMS: number;
}
export function checkPerformance(
  baseline: PerformanceMetrics,
  actual: PerformanceMetrics,
): void;
