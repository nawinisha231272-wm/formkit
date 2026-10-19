import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  reporter: [
    ["list"],
    ["json", { outputFile: "benchmark-results/results.json" }],
  ],
  testDir: "./tests/benchmarks",
  workers: 1,
  timeout: 180000,
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4190" },
  webServer: {
    command: "pnpm --filter @ourform/benchmarks dev",
    url: "http://127.0.0.1:4190",
    reuseExistingServer: !process.env.CI,
  },
});
