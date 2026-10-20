import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
test("official Linux visual image matches the pinned browser package and CI container", () => {
  const read = (path: string) =>
    readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const pin = JSON.parse(read("scripts/playwright-container.json"));
  const version = JSON.parse(read("package.json")).devDependencies[
    "@playwright/test"
  ];
  expect(pin.playwright).toBe(version);
  expect(pin.platform).toBe("linux/amd64");
  expect(pin.image).toMatch(
    new RegExp(
      `^mcr\\.microsoft\\.com/playwright:v${version.replaceAll(".", "\\.")}-noble@sha256:[a-f0-9]{64}$`,
    ),
  );
  expect(read(".github/workflows/ci.yml")).toContain(`image: ${pin.image}`);
  expect(pin.node).toBe("22.22.3");
  expect(pin.pnpm).toBe(
    JSON.parse(read("package.json")).packageManager.slice(5),
  );
});
