import { test, expect } from "@playwright/test";
import type {} from "../../apps/playground/builder";
const feature = /\/features\/(settings|json|history|logic|map|commands)\.js(?:\?|$)/;

test("default/none requests no lazy code; JSON and History load only on first open", async ({ page }) => {
  const requested: string[] = [];
  page.on("request", request => { const match = feature.exec(request.url()); if (match) requested.push(match[1]!); });
  await page.goto("/builder.html?approved&preload=none&settingsPreload=none");
  await expect(page.locator(".of-builder")).toHaveAttribute("data-ofb-view", "build");
  await page.waitForTimeout(250);
  expect(requested).toEqual([]);
  await expect(page.locator('[data-builder-part="json"]')).toHaveCount(0);
  await page.getByRole("tab", { name: "JSON", exact: true }).click();
  await expect(page.locator('[data-builder-part="json"]')).toBeVisible();
  expect(requested).toEqual(["json"]);
  await page.getByRole("tab", { name: "Build", exact: true }).click();
  await page.getByRole("tab", { name: "History", exact: true }).click();
  await expect(page.locator(".ofb-sidebar-history")).toHaveText("Your edits will appear here.");
  expect(requested).toEqual(["json", "history"]);
  await page.getByRole("tab", { name: "JSON", exact: true }).click();
  await expect(page.locator('[data-builder-part="json"]')).toBeVisible();
  expect(requested).toEqual(["json", "history"]);
});

test("idle fetches Logic/JSON only without mounting or changing schema/history", async ({ page }) => {
  const requested: string[] = [];
  page.on("request", request => { const match = feature.exec(request.url()); if (match) requested.push(match[1]!); });
  await page.goto("/builder.html?approved&preload=idle&settingsPreload=none");
  await expect.poll(() => [...requested].sort()).toEqual(["json", "logic"]);
  await expect(page.locator('[data-builder-part="json"]')).toHaveCount(0);
  await expect(page.locator(".of-builder")).toHaveAttribute("data-ofb-view", "build");
  expect(await page.evaluate(() => window.miniBuilder.builder.getState().history.past.length)).toBe(0);
});

test("the default idle policy fetches Settings without mounting it", async ({ page }) => {
  const requested: string[] = [];
  page.on("request", request => { const match = feature.exec(request.url()); if (match) requested.push(match[1]!); });
  await page.goto("/builder.html?approved");
  await expect.poll(() => [...new Set(requested)].sort()).toEqual(["settings"]);
  await expect(page.locator(".ofb-settings")).toHaveCount(0);
  expect(await page.evaluate(() => window.miniBuilder.builder.getState().history.past.length)).toBe(0);
});

test("a late JSON import cannot mount after mode navigation; reopening uses its cached module", async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let seen = 0;
  await page.route(feature, async route => {
    if (route.request().url().includes("/json.js")) { seen++; await held; }
    await route.continue();
  });
  await page.goto("/builder.html?approved&settingsPreload=none");
  await page.getByRole("tab", { name: "JSON", exact: true }).click();
  await expect.poll(() => seen).toBe(1);
  await page.getByRole("tab", { name: "Build", exact: true }).click();
  release();
  await expect(page.locator('[data-builder-part="json"]')).toHaveCount(0);
  await page.getByRole("tab", { name: "JSON", exact: true }).click();
  await expect(page.locator('[data-builder-part="json"]')).toBeVisible();
  expect(seen).toBe(1);
});

test("the first keyboard Copy writes synchronously immediately after load", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText(value: string) {
          (window as unknown as { clipboardWrite?: { value: string; synchronous: boolean } }).clipboardWrite = {
            value,
            synchronous: true,
          };
          return Promise.resolve();
        },
        readText() { return Promise.resolve(""); },
      },
    });
  });
  await page.goto("/builder.html?approved&settingsPreload=none");
  await page.locator('.of-builder-canvas [data-field-id="email"]').focus();
  await page.keyboard.press("ControlOrMeta+c");
  await expect(page.locator(".of-builder-status")).toContainText("Copied Email");
  const write = await page.evaluate(() =>
    (window as unknown as { clipboardWrite?: { value: string; synchronous: boolean } }).clipboardWrite,
  );
  expect(write?.synchronous).toBe(true);
  expect(JSON.parse(write!.value)).toMatchObject({ id: "email", type: "email" });
});

test("Settings opens its frame immediately and preserves state while the feature is slow", async ({ page }) => {
  await page.route(/\/features\/settings\.js(?:\?|$)/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.continue();
  });
  await page.goto("/builder.html?approved&settingsPreload=none");
  const before = await page.evaluate(() => ({
    schema: JSON.stringify(window.miniBuilder.builder.getState().definition),
    history: window.miniBuilder.builder.getState().history.past.length,
  }));
  await page.locator('.of-builder-canvas [data-field-id="email"]').focus();
  await page.keyboard.press("Enter");
  const settings = page.locator(".ofb-settings");
  await expect(settings).toHaveAttribute("aria-busy", "true");
  await expect(settings).toContainText("Loading Settings");
  expect(await page.evaluate(() => ({
    schema: JSON.stringify(window.miniBuilder.builder.getState().definition),
    history: window.miniBuilder.builder.getState().history.past.length,
  }))).toEqual(before);
  await expect(settings).not.toHaveAttribute("aria-busy", "true");
  await expect(settings.getByRole("tab", { name: "Display" })).toBeVisible();
});

test("failed Settings activation keeps the draft and Retry loads the editor", async ({ page }) => {
  const requests: string[] = [];
  await page.route(/\/features\/settings(?:-retry)?\.js(?:\?|$)/, async (route) => {
    requests.push(new URL(route.request().url()).pathname.split("/").at(-1)!);
    if (requests.length === 1) await route.abort("failed");
    else await route.continue();
  });
  await page.goto("/builder.html?approved&settingsPreload=none");
  await page.locator('.of-builder-canvas [data-field-id="email"]').focus();
  await page.keyboard.press("Enter");
  const settings = page.locator(".ofb-settings");
  await expect(settings).toContainText("Could not load Settings");
  await settings.getByRole("button", { name: "Retry" }).click();
  await expect(settings.getByRole("tab", { name: "Display" })).toBeVisible();
  expect(requests).toEqual(["settings.js", "settings-retry.js"]);
});

test("a slow Add keeps its draft private and Cancel restores focus without history", async ({ page }) => {
  await page.route(/\/features\/settings\.js(?:\?|$)/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.continue();
  });
  await page.goto("/builder.html?approved&settingsPreload=none");
  const add = page.getByRole("button", { name: "Add Text", exact: true });
  const origin = page.locator('[data-builder-part="inspector"]').getByRole("button", {
    name: "Edit settings",
    exact: true,
  });
  await origin.focus();
  const before = await page.evaluate(() => ({
    definition: JSON.stringify(window.miniBuilder.builder.getState().definition),
    history: window.miniBuilder.builder.getState().history.past.length,
    selection: window.miniBuilder.builder.getState().selection,
  }));
  await add.click();
  await expect(page.locator(".ofb-settings")).toHaveAttribute("aria-busy", "true");
  expect(await page.evaluate(() => ({
    definition: JSON.stringify(window.miniBuilder.builder.getState().definition),
    history: window.miniBuilder.builder.getState().history.past.length,
    selection: window.miniBuilder.builder.getState().selection,
  }))).toEqual(before);
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.locator(".ofb-settings")).toHaveCount(0);
  await expect(origin).toBeFocused();
  expect(await page.evaluate(() => ({
    definition: JSON.stringify(window.miniBuilder.builder.getState().definition),
    history: window.miniBuilder.builder.getState().history.past.length,
    selection: window.miniBuilder.builder.getState().selection,
  }))).toEqual(before);
});

test("a failed Add can commit defaults as exactly one history step", async ({ page }) => {
  await page.route(/\/features\/settings\.js(?:\?|$)/, (route) => route.abort("failed"));
  await page.goto("/builder.html?approved&settingsPreload=none");
  const before = await page.evaluate(() => window.miniBuilder.builder.getState().history.past.length);
  await page.getByRole("button", { name: "Add Text", exact: true }).click();
  const settings = page.locator(".ofb-settings");
  await expect(settings).toContainText("Could not load Settings");
  await settings.getByRole("button", { name: "Add with defaults" }).click();
  await expect(settings).toHaveCount(0);
  const result = await page.evaluate(() => {
    const state = window.miniBuilder.builder.getState();
    const command = state.history.past.at(-1)!;
    return {
      history: state.history.past.length,
      type: command.type,
      selectedType: state.selection
        ? window.miniBuilder.preview?.session.form.byId[state.selection]?.node.type
        : undefined,
    };
  });
  expect(result).toEqual({ history: before + 1, type: "AddComponent", selectedType: "text" });
});

test("strict CSP and a custom local assetBase loads Settings offline", async ({ page }) => {
  const mirrored: string[] = [];
  const violations: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("Content Security Policy")) violations.push(message.text());
  });
  await page.route("**/builder.html?*", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'nonce-builder-test'; img-src 'self' data:; connect-src 'self'; font-src 'self'",
      },
    });
  });
  await page.route(/\/mirror\/(features\/)?(.+\.js)$/, async (route) => {
    const match = /\/mirror\/(features\/)?(.+\.js)$/.exec(route.request().url())!;
    const file = `${match[1] ?? ""}${match[2]!}`;
    mirrored.push(file);
    const source = new URL(`/@fs/${process.cwd()}/packages/builder/dist/${file}`, route.request().url());
    const response = await route.fetch({ url: source.href });
    await route.fulfill({ response });
  });
  await page.goto("/builder.html?approved&settingsPreload=none&assetBase=/mirror/&styleNonce=builder-test");
  await page.locator('.of-builder-canvas [data-field-id="email"]').focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".ofb-settings").getByRole("tab", { name: "Display" })).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  expect(mirrored).toContain("features/settings.js");
  expect(violations).toEqual([]);
});
