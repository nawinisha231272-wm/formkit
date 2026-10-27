import { test, expect } from "@playwright/test";
import type {} from "../../apps/shared/builder-types";

const hosts = [
  ["vanilla Vite", "http://127.0.0.1:4181/builder.html", false],
  ["React Vite", "http://127.0.0.1:4182/builder.html", false],
  ["Angular Vite", "http://127.0.0.1:4183/builder.html", false],
  ["self-hosted script tag", "http://127.0.0.1:4185/", false],
  ["Angular CLI", "http://127.0.0.1:4186/", true],
] as const;
const feature = /\/features\/(settings)\.js(?:\?|$)/;

for (const [host, url, opaqueChunks] of hosts)
  test(`${host} defers Settings until its first activation`, async ({
    page,
  }) => {
    const requested: string[] = [];
    const violations: string[] = [];
    const external: string[] = [];
    page.on("request", (request) => {
      const match = feature.exec(request.url());
      if (match) requested.push(match[1]!);
      else if (
        opaqueChunks &&
        request.resourceType() === "script" &&
        request.url().endsWith(".js")
      )
        requested.push(request.url());
      if (
        /^https?:/.test(request.url()) &&
        !request.url().startsWith(new URL(url).origin)
      )
        external.push(request.url());
    });
    page.on("console", (message) => {
      if (message.text().includes("Content Security Policy"))
        violations.push(message.text());
    });
    await page.goto(`${url}?preload=none&settingsPreload=none`);
    await expect(
      page.getByRole("tab", { name: "Build", exact: true }),
    ).toBeVisible();
    if (opaqueChunks) requested.length = 0;
    await page.waitForTimeout(250);
    expect(requested).toEqual([]);
    await page
      .getByRole("treeitem", { name: "Full name", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Edit settings", exact: true })
      .click();
    await expect(
      page.getByRole("dialog").getByRole("tab", { name: "Display" }),
    ).toBeVisible();
    if (opaqueChunks) expect(requested.length).toBeGreaterThan(0);
    else expect(requested).toEqual(["settings"]);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Close" })
      .click();
    const field = page.locator(
      '[data-builder-part="canvas"] [data-field-id="name"]',
    );
    await field.focus();
    await field.getByRole("button", { name: "More", exact: true }).click();
    await expect(
      page.locator(".ofb-action-menu").getByRole("button", { name: "Copy" }),
    ).toBeVisible();
    if (!opaqueChunks) expect(requested).toEqual(["settings"]);
    expect(external).toEqual([]);
    expect(violations).toEqual([]);
  });
