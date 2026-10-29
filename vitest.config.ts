import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    // Scaffold proofs spawn compilers and browsers. Match CI's serial file policy
    // locally so those child processes do not compete with the source security scan.
    // All files, assertions, coverage gates and deadlines remain unchanged.
    maxWorkers: 1,
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
