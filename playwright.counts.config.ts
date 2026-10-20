import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/work-counts",
  workers: 1,
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4190" },
  webServer: {
    command: "pnpm --filter @ourform/benchmarks dev",
    url: "http://127.0.0.1:4190",
    reuseExistingServer: !process.env.CI,
  },
});
