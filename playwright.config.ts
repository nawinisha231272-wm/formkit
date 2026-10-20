import { defineConfig, devices } from "@playwright/test";
import { platform, arch } from "node:os";
export default defineConfig({
  // Bound concurrent real framework hosts without changing deadlines or assertions.
  workers: 2,
  reporter: "list",
  snapshotPathTemplate: `{testDir}/__screenshots__/${platform()}-${arch()}/{testFilePath}/{projectName}/{arg}{ext}`,
  testDir: "./tests/e2e",
  use: { baseURL: "http://127.0.0.1:4173" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: [
    {
      command: "pnpm --filter @ourform/playground preview",
      url: "http://127.0.0.1:4174",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "pnpm --filter @ourform/playground dev",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: !process.env.CI,
    },
    ...[
      "vanilla-example",
      "react-example",
      "angular-example",
      "angular21-example",
    ].map((name, index) => ({
      command: `pnpm --filter @ourform/${name} dev`,
      url: `http://127.0.0.1:${4181 + index}`,
      reuseExistingServer: !process.env.CI,
    })),
  ],
});
