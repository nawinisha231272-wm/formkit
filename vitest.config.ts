import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    // Scaffold proofs launch real compilers; bound file concurrency so other tests
    // retain their existing deadlines on laptops and two-core Linux runners.
    maxWorkers: process.env.CI ? 1 : 2,
    projects: [
      {
        test: {
          name: "headless",
          environment: "node",
          include: ["packages/*/tests/**/*.test.ts", "tests/**/*.test.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["packages/core/src/**/*.ts", "packages/validation/src/**/*.ts"],
      thresholds: {
        lines: 90,
        "packages/core/src/**": { lines: 90 },
        "packages/validation/src/**": { lines: 90 },
      },
    },
  },
});
