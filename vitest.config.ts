import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
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
      include: ["packages/core/src/**/*.ts"],
      thresholds: { lines: 90 },
    },
  },
});
