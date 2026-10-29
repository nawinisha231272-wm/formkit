import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type {} from "../../apps/playground/builder";

const cold =
  "/builder.html?approved&settingsPreload=none&planningPreload=none&dataPreload=none";
const state = (page: Page) =>
  page.evaluate(() => ({
    schema: JSON.stringify(window.miniBuilder.builder.getState().definition),
    history: window.miniBuilder.builder.getState().history.past.length,
    selected: [
      ...document.querySelectorAll<HTMLElement>(
        ".of-builder-outline [data-drag-id][aria-selected=true]",
      ),
    ].map((row) => row.dataset.dragId),
  }));
async function selectPair(page: Page) {
  await page
    .locator('.of-builder-outline [role=treeitem][data-drag-id="email"]')
    .focus();
  await page.keyboard.press("Shift+ArrowDown");
}

for (const id of ["email", "customerType"])
  test(`pointer toolbar on selected ${id} duplicates the whole selection in one step`, async ({
    page,
  }) => {
    await page.goto(cold);
    await selectPair(page);
    const before = await state(page);
    const field = page.locator(`#canvas [data-field-id="${id}"]`);
    await field.hover();
    await field.getByRole("button", { name: "Duplicate", exact: true }).click();
    await expect.poll(async () => (await state(page)).history).toBe(1);
    expect((await state(page)).selected).toHaveLength(2);
    await page
      .locator(".ofb-header")
      .getByRole("button", { name: "Undo", exact: true })
      .click();
    expect(await state(page)).toEqual(before);
  });

test("default idle fetches planning and Data without mounting or changing history; none fetches neither", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    const name = /\/features\/(bulk-plan|data)\.js/.exec(request.url())?.[1];
    if (name) requests.push(name);
  });
  await page.goto("/builder.html?approved&settingsPreload=none");
  await expect.poll(() => requests.sort()).toEqual(["bulk-plan", "data"]);
  expect((await state(page)).history).toBe(0);
  await expect(
    page.getByRole("heading", { name: "Submission JSON Schema" }),
  ).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  requests.length = 0;
  await page.goto(cold);
  await page.waitForTimeout(300);
  expect(requests).toEqual([]);
});

test("cold bulk planning opens immediately; Escape cancels a slow import without state/history/focus loss", async ({
  page,
}) => {
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/features\/bulk-plan\.js(?:\?.*)?$/, async (route) => {
    await waiting;
    await route.continue();
  });
  await page.goto(cold);
  await selectPair(page);
  const before = await state(page);
  await page.keyboard.press("ControlOrMeta+d");
  const frame = page.getByRole("dialog", {
    name: "Preparing selected components",
    exact: true,
  });
  await expect(frame.locator("[aria-busy=true]")).toContainText("Loading");
  await page.keyboard.press("Escape");
  await expect(frame).toHaveCount(0);
  expect(await state(page)).toEqual(before);
  await expect(
    page.locator('.of-builder-outline [data-drag-id="customerType"]'),
  ).toBeFocused();
  release();
  await expect
    .poll(() =>
      page.evaluate(() =>
        performance
          .getEntriesByType("resource")
          .some((e) =>
            new URL(e.name).pathname.endsWith("features/bulk-plan.js"),
          ),
      ),
    )
    .toBe(true);
  expect(await state(page)).toEqual(before);
});

test("failed bulk preparation shows reason and Retry, preserving selection and one-step history", async ({
  page,
}) => {
  await page.route(
    /\/features\/bulk-plan\.js(?:\?.*)?$/,
    (route) => route.abort(),
    {
      times: 1,
    },
  );

  await page.goto(cold);
  await selectPair(page);
  const before = await state(page);
  await page.keyboard.press("ControlOrMeta+d");
  const frame = page.getByRole("dialog", {
    name: "Preparing selected components",
    exact: true,
  });
  await expect(frame.getByRole("button", { name: "Retry" })).toBeVisible();
  expect(
    (await frame.locator(":scope > div").textContent())!
      .replace("Retry", "")
      .trim(),
  ).not.toBe("");
  expect(await state(page)).toEqual(before);
  await frame.getByRole("button", { name: "Retry" }).click();
  await expect(frame).toHaveCount(0);
  expect((await state(page)).history).toBe(1);
  expect((await state(page)).selected).toHaveLength(2);
  await page
    .locator(".ofb-header")
    .getByRole("button", { name: "Undo", exact: true })
    .click();
  expect(await state(page)).toEqual(before);
});

test("schema changes while bulk planning is pending refuse stale preparation without history", async ({
  page,
}) => {
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/features\/bulk-plan\.js(?:\?.*)?$/, async (route) => {
    await waiting;
    await route.continue();
  });
  await page.goto(cold);
  await selectPair(page);
  await page.keyboard.press("ControlOrMeta+d");
  const frame = page.getByRole("dialog", {
    name: "Preparing selected components",
    exact: true,
  });
  await expect(frame.locator("[aria-busy=true]")).toBeVisible();
  await page.evaluate(() => {
    const schema = structuredClone(
      window.miniBuilder.builder.getState().definition,
    );
    schema.title = "Host update while planning";
    window.nestedBuilder.load(schema);
  });
  const updated = await state(page);
  release();
  await expect(frame).toHaveCount(0);
  await expect(page.locator(".of-builder-status")).toHaveText(
    "The form changed while preparing this action. Please try again.",
  );
  expect(await state(page)).toEqual(updated);
});

test("first-pointer drag stays immediate and moves the selected block between columns after cold planning", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/features\/bulk-plan\.js(?:\?.*)?$/, async (route) => {
    await waiting;
    await route.continue();
  });
  await page.goto(cold);
  await selectPair(page);
  const before = await state(page);
  const handle = page
    .locator('#canvas [data-field-id="customerType"]')
    .getByRole("button", { name: "Move", exact: true });
  const column = page.locator(
    '#canvas [data-of-slot-owner="contactColumns"][data-of-slot="column_0"]',
  );
  await page.locator('#canvas [data-field-id="customerType"]').hover();
  await expect(handle).toBeVisible();
  await handle.hover();
  const from = (await handle.boundingBox())!;
  const to = (await column.boundingBox())!;
  try {
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height - 8, {
      steps: 12,
    });
    await expect(page.locator(".of-builder")).toHaveAttribute(
      "data-ofb-dragging",
      "true",
    );
    await expect(column).toHaveAttribute("data-ofb-drop-target", "true");
    await page.mouse.up();
    await expect(
      page
        .getByRole("dialog", {
          name: "Preparing selected components",
          exact: true,
        })
        .locator("[aria-busy=true]"),
    ).toBeVisible();
    expect(await state(page)).toEqual(before);
  } finally {
    release();
  }
  await expect.poll(async () => (await state(page)).history).toBe(1);
  const columns = await page.evaluate(
    () =>
      window.miniBuilder.builder.getState().definition.components[0]!
        .components![0]!.components![0]!.columns!,
  );
  expect(columns[0]!.components.slice(-2).map((node) => node.id)).toEqual([
    "email",
    "customerType",
  ]);
  expect(columns[1]!.components).toEqual([]);
  await page
    .locator(".ofb-header")
    .getByRole("button", { name: "Undo", exact: true })
    .click();
  expect(await state(page)).toEqual(before);
});

test("Copy and bulk Delete/Required remain immediate with planning unavailable", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("features/bulk-plan")) requests.push(r.url());
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText(text: string) {
          sessionStorage.setItem("first-copy", text);
          return Promise.resolve();
        },
      },
    });
  });
  await page.route("**/features/bulk-plan*.js", (route) => route.abort());
  await page.goto(cold);
  await selectPair(page);
  await page.keyboard.press("ControlOrMeta+c");
  expect(
    await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem("first-copy")!).map(
        (n: { id: string }) => n.id,
      ),
    ),
  ).toEqual(["email", "customerType"]);
  await page.keyboard.press("Delete");
  expect((await state(page)).history).toBe(1);
  await page
    .locator(".ofb-header")
    .getByRole("button", { name: "Undo", exact: true })
    .click();
  await page.keyboard.press("ControlOrMeta+k");
  const commands = page.getByRole("dialog", { name: "Commands", exact: true });
  await commands.getByRole("searchbox").fill("Required");
  await commands
    .getByRole("button", { name: "Required 2 components", exact: true })
    .click();
  expect((await state(page)).history).toBe(1);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(requests).toEqual([]);
});

test("Data Retry and bulk planning use a custom local assetBase under strict CSP without remote requests", async ({
  page,
}) => {
  const violations: string[] = [];
  const remote: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== "http://127.0.0.1:4173")
      remote.push(request.url());
  });
  page.on("console", (m) => {
    if (m.text().includes("Content Security Policy")) violations.push(m.text());
  });
  await page.route("**/builder.html?*", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        "content-security-policy":
          "default-src 'self'; script-src 'self'; style-src 'self' 'nonce-builder-test'; img-src 'self' data:; connect-src 'self'; font-src 'self'",
      },
    });
  });
  let first = true;
  await page.route(
    /\/mirror\/features\/(data|bulk-plan)\.js(?:\?.*)?$/,
    async (route) => {
      const file = new URL(route.request().url()).pathname.split("/").at(-1)!;
      if (first && file === "data.js") {
        first = false;
        return route.abort();
      }
      const response = await route.fetch({
        url: new URL(
          `/@fs/${process.cwd()}/packages/builder/dist/features/${file}`,
          route.request().url(),
        ).href,
      });
      await route.fulfill({ response });
    },
  );
  await page.goto(`${cold}&assetBase=/mirror/&styleNonce=builder-test`);
  const before = await state(page);
  await page.getByRole("tab", { name: "Data", exact: true }).click();
  const panel = page.locator(".ofb-data-panel");
  await expect(panel.getByRole("button", { name: "Retry" })).toBeVisible();
  await panel.getByRole("button", { name: "Retry" }).click();
  await expect(
    panel.getByRole("heading", { name: "Submission JSON Schema" }),
  ).toBeVisible();
  await expect(panel.locator("pre").first()).toContainText('"type": "object"');
  expect(await state(page)).toEqual(before);
  await page.getByRole("tab", { name: "Build", exact: true }).click();
  await selectPair(page);
  await page.keyboard.press("ControlOrMeta+d");
  await expect.poll(async () => (await state(page)).history).toBe(1);
  expect((await state(page)).selected).toHaveLength(2);
  expect(violations).toEqual([]);
  expect(remote).toEqual([]);
});

test("destroy cancels a pending Data mount", async ({ page }) => {
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/features\/data\.js(?:\?.*)?$/, async (route) => {
    await waiting;
    await route.continue();
  });
  await page.goto(cold);
  await page.getByRole("tab", { name: "Data", exact: true }).click();
  await expect(page.locator(".ofb-data-panel")).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await page.evaluate(() => window.nestedBuilder.destroy());
  release();
  await expect(page.locator(".of-builder")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Submission JSON Schema" }),
  ).toHaveCount(0);
});
