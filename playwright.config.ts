import { defineConfig, devices, webkit } from "@playwright/test";
import { platform, arch } from "node:os";
import { fileURLToPath } from "node:url";
export default defineConfig({
  // Bound concurrent real framework hosts without changing deadlines or assertions.
  workers: 1,
  reporter: "list",
  snapshotPathTemplate: `{testDir}/__screenshots__/${platform()}-${arch()}/{testFilePath}/{projectName}/{arg}{ext}`,
  testDir: "./tests/e2e",
  use: { baseURL: "http://127.0.0.1:4173" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        ...(platform() === "darwin"
          ? {
              launchOptions: {
                // Process-local AppKit preference; never changes global defaults.
                executablePath: fileURLToPath(
                  new URL("./scripts/webkit-macos.sh", import.meta.url),
                ),
                env: {
                  ...process.env,
                  OURFORM_PINNED_WEBKIT_EXECUTABLE: webkit.executablePath(),
                },
              },
            }
          : {}),
      },
    },
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
      "script-tag-example",
      "angular-cli-example",
    ].map((name, index) => ({
      command: `pnpm --filter @ourform/${name} dev`,
      url: `http://127.0.0.1:${4181 + index}`,
      reuseExistingServer: !process.env.CI,
    })),
  ],
});
