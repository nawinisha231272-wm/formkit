import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  reporter: "list",
  testDir: "./tests/builder-benchmarks",
  workers: 1,
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4173" },
  webServer: {
    command: "pnpm --filter @ourform/playground dev",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
});
