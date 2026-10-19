import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";
import type {} from "../../apps/playground/sdk-probe";
test.beforeEach(async ({ page }) => {
  await page.goto("/sdk-probe.html");
  await page.waitForFunction(() => !!window.sdk);
});
test("updates preserve focused controls, caret and unrelated nodes without render-time validation", async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>("#name")!;
    const age = document.querySelector("#age");
    input.focus();
    input.setSelectionRange(1, 2);
    window.sdk.session.touch("name");
    window.sdk.view.setTheme("tailwind");
    const caret =
      document.activeElement === input &&
      input.selectionStart === 1 &&
      input.selectionEnd === 2;
    window.sdk.session.setValue("name", "updated");
    const value = input.value;
    const stable =
      document.querySelector("#name") === input &&
      document.querySelector("#age") === age;
    window.sdk.view.focus("name");
    return {
      caret,
      stable,
      value,
      focused: document.activeElement === input,
      validationCalls: window.sdk.validationCalls,
    };
  });
  expect(result).toEqual({
    caret: true,
    stable: true,
    value: "updated",
    focused: true,
    validationCalls: 0,
  });
});
test("composition defers external DOM writes and commits composed input", async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>("#name")!;
    input.focus();
    input.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true }),
    );
    input.value = "拼";
    input.dispatchEvent(
      new InputEvent("input", { bubbles: true, isComposing: true }),
    );
    const during = window.sdk.session.getValue("name");
    window.sdk.session.setValue("name", "external");
    const composed = input.value;
    input.dispatchEvent(
      new CompositionEvent("compositionend", { bubbles: true, data: "拼" }),
    );
    return {
      during,
      composed,
      after: window.sdk.session.getValue("name"),
      stable: document.querySelector("#name") === input,
    };
  });
  expect(result).toEqual({
    during: "abc",
    composed: "拼",
    after: "拼",
    stable: true,
  });
});
test("Number, Checkbox and half-star Rating use the public control contract", async ({
  page,
}) => {
  await page.getByLabel("Age", { exact: true }).fill("0");
  await page.getByLabel("Accept", { exact: true }).check();
  await page
    .getByRole("button", { name: "2.5 of 5 stars", exact: true })
    .click();
  expect(await page.evaluate(() => window.sdk.session.getData())).toEqual({
    name: "abc",
    age: 0,
    accept: true,
    rating: 2.5,
  });
});
test("keyed lifecycle releases refs/listeners and preserves focus through reordering", async ({
  page,
}) => {
  expect(await page.evaluate(() => window.runLifecycle())).toEqual({
    count: 3,
    stable: true,
    refsCleared: true,
    destroyedThrows: true,
    keyed: true,
    caret: true,
    replacementThrows: true,
    empty: true,
  });
});
test("production controls mount/update/clean up in real React and Angular hosts", async ({
  page,
}) => {
  expect(await page.evaluate(() => window.runHosts())).toEqual({
    sameReactInput: true,
    sameAngularInput: true,
    reactValue: "after",
    angularValue: "after",
    reactRemoved: true,
    angularRemoved: true,
    changes: 2,
  });
});

test("four SDK controls have no serious or critical accessibility violations", async ({
  page,
}) => {
  const result = await new AxeBuilder({ page }).analyze();
  expect(
    result.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
});

test("form destroy unsubscribes and removes all detached input handlers", async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>("#name")!;
    window.sdk.view.destroy();
    window.sdk.view.destroy();
    input.value = "detached";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const unchanged = window.sdk.session.getValue("name") === "abc";
    window.sdk.session.setValue("name", "api");
    let throws = false;
    try {
      window.sdk.view.setTheme("base");
    } catch {
      throws = true;
    }
    return {
      unchanged,
      empty: document.querySelector("#form")!.children.length === 0,
      throws,
    };
  });
  expect(result).toEqual({ unchanged: true, empty: true, throws: true });
});
