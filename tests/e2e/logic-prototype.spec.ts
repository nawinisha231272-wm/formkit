import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createEngine } from "@ourform/core";
import { createLogic } from "@ourform/core/logic";
import { builtinFields } from "@ourform/components";
import { validateSubmission } from "@ourform/validation";
import { readFileSync } from "node:fs";
const definition = JSON.parse(
  readFileSync(
    new URL("../../fixtures/forms/logic/prototype.json", import.meta.url),
    "utf8",
  ),
);
import type {} from "../../apps/playground/logic-prototype";

for (const allowOverride of [false, true])
  test(`combined calculation precedence and authoritative/overridable browser-Node parity, allowOverride=${allowOverride}`, async ({
    page,
  }) => {
    await page.goto(
      `/logic-prototype.html?precedence${allowOverride ? "&allow-override" : ""}`,
    );
    const source = page.getByRole("textbox", { name: "Source", exact: true });
    const target = page.getByRole("spinbutton", {
      name: "Target",
      exact: true,
    });
    await expect(target).toHaveValue("3");
    await source.fill("no");
    await expect(target).toHaveValue("2");
    await source.fill("yes");
    await expect(target).toHaveValue("3");
    await target.fill("99");
    await expect(target).toHaveValue(allowOverride ? "99" : "3");
    const observed = await page.evaluate(async () => ({
      definition: window.ourformLogic.session.schema,
      result: await window.ourformLogic.submit(),
    }));
    expect(observed.result).toEqual({
      ok: true,
      data: { source: "yes", target: allowOverride ? 99 : 3 },
    });
    if (!observed.result.ok)
      throw new Error("Expected valid combined calculation submission");
    const engine = createEngine({ logic: createLogic() });
    for (const field of builtinFields) engine.register(field.model);
    const compiled = engine.compile(observed.definition);
    if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
    expect(
      (await validateSubmission(compiled.form, observed.result.data)).valid,
    ).toBe(true);
    const forged = await validateSubmission(compiled.form, {
      source: "yes",
      target: 99,
    });
    expect(forged.valid).toBe(allowOverride);
    if (!allowOverride)
      expect(forged.errors.map((error) => error.error.code)).toContain(
        "calculated",
      );
  });

for (const override of [false, true])
  test(`root value actions settle legacy dependencies and retain browser/Node parity, user override=${override}`, async ({
    page,
  }) => {
    await page.goto("/logic-prototype.html?actions");
    const derived = page.getByRole("spinbutton", {
      name: "Derived",
      exact: true,
    });
    await expect(derived).toHaveValue("4");
    if (override) {
      await derived.fill("99");
      await expect(derived).toHaveValue("99");
    }
    const source = page.getByRole("textbox", { name: "Source", exact: true });
    await source.focus();
    await page.evaluate(() => {
      const patches: unknown[] = [];
      window.ourformLogic.session.subscribe((patch) => patches.push(patch));
      Object.assign(window, { actionPatches: patches });
    });
    const input = await source.elementHandle();
    await source.fill("go");
    await expect(source).toBeFocused();
    expect(
      await source.evaluate((node, original) => node === original, input),
    ).toBe(true);
    await expect(derived).toHaveValue("6");
    await expect(
      page.getByRole("spinbutton", { name: "Result", exact: true }),
    ).toHaveValue("6");
    const observed = await page.evaluate(() => ({
      data: window.ourformLogic.session.getData(),
      definition: window.ourformLogic.session.schema,
      count: (window as unknown as { actionPatches: unknown[] }).actionPatches
        .length,
    }));
    expect(observed.data).toEqual({
      source: "go",
      bridge: 3,
      derived: 6,
      result: 6,
    });
    expect(observed.count).toBe(1);
    const engine = createEngine({ logic: createLogic() });
    for (const field of builtinFields) engine.register(field.model);
    const compiled = engine.compile(observed.definition);
    if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
    expect((await validateSubmission(compiled.form, observed.data)).valid).toBe(
      true,
    );
  });

test("load initializer remains A after source B and browser/Node enforce final load-derived state without value replay", async ({
  page,
}) => {
  await page.goto("/logic-prototype.html?load-initializer");
  const target = page.getByRole("textbox", { name: "Target", exact: true });
  await expect(target).toHaveValue("A");
  await page.getByRole("textbox", { name: "Source", exact: true }).fill("B");
  await expect(target).toHaveValue("A");
  await expect(
    page.getByRole("textbox", { name: "Details", exact: true }),
  ).toHaveAttribute("aria-required", "true");
  expect((await page.evaluate(() => window.ourformLogic.submit())).ok).toBe(
    false,
  );
  await page
    .getByRole("textbox", { name: "Details", exact: true })
    .fill("provided");
  const observed = await page.evaluate(async () => ({
    result: await window.ourformLogic.submit(),
    definition: window.ourformLogic.session.schema,
  }));
  expect(observed.result).toEqual({
    ok: true,
    data: { source: "B", target: "A", details: "provided" },
  });
  if (!observed.result.ok)
    throw new Error("Expected valid load-initialized submission");
  const engine = createEngine({ logic: createLogic() });
  for (const field of builtinFields) engine.register(field.model);
  const compiled = engine.compile(observed.definition);
  if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
  expect(await validateSubmission(compiled.form, observed.result.data)).toEqual(
    { valid: true, errors: [] },
  );
  await target.fill("user answer");
  const edited = await page.evaluate(() => window.ourformLogic.submit());
  if (!edited.ok) throw new Error("Expected valid editable initializer");
  expect(edited.data).toMatchObject({ target: "user answer" });
  expect((await validateSubmission(compiled.form, edited.data)).valid).toBe(
    true,
  );
});

test("browser compiler refuses change-rule writes to protected calculations and allows explicit editable overrides", async ({
  page,
}) => {
  await page.goto("/logic-prototype.html?load-initializer");
  const result = await page.evaluate(async () => {
    const { engine } = window.ourformLogic;
    const definition = {
      $formVersion: "1.0",
      id: "conflict",
      display: "form",
      components: [
        { id: "source", key: "source", type: "text" },
        {
          id: "target",
          key: "target",
          type: "number",
          calculate: { expr: 2, allowOverride: false },
          validation: { min: 90 },
        },
      ],
      logic: [
        {
          id: "change-to-99",
          trigger: { on: "change", refs: ["source"] },
          then: [{ action: "setValue", target: "target", value: 99 }],
        },
      ],
    };
    const rejected = engine.compile(definition);
    const allowed = engine.compile({
      ...definition,
      components: definition.components.map((node) =>
        node.calculate
          ? { ...node, calculate: { ...node.calculate, allowOverride: true } }
          : node,
      ),
    });
    if (!allowed.ok) throw new Error(JSON.stringify(allowed.diagnostics));
    const session = engine.createSession(allowed.form);
    session.setValue("source", "changed", { source: "user" });
    const result = {
      rejected,
      definition: allowed.form.definition,
      submission: await session.submit(),
    };
    session.dispose();
    return result;
  });
  expect(result.rejected.ok).toBe(false);
  expect(result.rejected.diagnostics).toContainEqual(
    expect.objectContaining({
      severity: "error",
      code: "logic-calculation-conflict",
      componentId: "target",
      message: expect.stringMatching(/change-to-99.*target/),
    }),
  );
  expect(result.submission).toEqual({
    ok: true,
    data: { source: "changed", target: 99 },
  });
  const engine = createEngine({ logic: createLogic() });
  for (const field of builtinFields) engine.register(field.model);
  const compiled = engine.compile(result.definition);
  if (!compiled.ok || !result.submission.ok)
    throw new Error("Expected valid editable override");
  expect(
    (await validateSubmission(compiled.form, result.submission.data)).valid,
  ).toBe(true);
});

test("root rules preserve live control identity, update required state, and submit identically in browser and Node", async ({
  page,
}) => {
  await page.goto("/logic-prototype.html");
  const company = page.getByRole("textbox", { name: "Company", exact: true });
  await expect(company).toHaveAttribute("aria-required", "true");
  await expect(
    page.getByRole("spinbutton", { name: "Total", exact: true }),
  ).toHaveValue("20");
  await expect(
    page.getByRole("textbox", { name: "Invoice type", exact: true }),
  ).toHaveValue("company");
  const reference = page.getByRole("textbox", {
    name: "Reference",
    exact: true,
  });
  const control = await reference.elementHandle();
  await reference.fill("my later answer");
  await expect(reference).toBeFocused();
  expect(
    await reference.evaluate((node, original) => node === original, control),
  ).toBe(true);
  await page.getByRole("textbox", { name: "Country", exact: true }).fill("GB");
  await expect(company).toHaveAttribute("aria-required", "false");
  await page.getByRole("textbox", { name: "Country", exact: true }).fill("CA");
  await expect(company).toHaveAttribute("aria-required", "true");
  const result = await page.evaluate(() => window.ourformLogic.submit());
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Expected successful browser submission.");
  expect(result.data).toMatchObject({
    reference: "my later answer",
    total: 20,
    receipt: "ready",
  });
  const engine = createEngine({ logic: createLogic() });
  for (const field of builtinFields) engine.register(field.model);
  const compiled = engine.compile(definition);
  if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
  expect(await validateSubmission(compiled.form, result.data)).toEqual({
    valid: true,
    errors: [],
  });
  expect(
    (await new AxeBuilder({ page }).analyze()).violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
});

for (const reverse of [false, true])
  test(`interleaved root/legacy rules publish one settled patch and retain focus, reverse=${reverse}`, async ({
    page,
  }) => {
    await page.goto(
      `/logic-prototype.html?interleaved${reverse ? "&reverse" : ""}`,
    );
    const source = page.getByRole("textbox", { name: "Source", exact: true });
    const original = await source.elementHandle();
    await page.evaluate(() => {
      const patches: unknown[] = [];
      window.ourformLogic.session.subscribe((patch) => patches.push(patch));
      Object.assign(window, { interleavePatches: patches });
    });
    await source.fill("go");
    await expect(source).toBeFocused();
    expect(
      await source.evaluate((node, initial) => node === initial, original),
    ).toBe(true);
    await expect(
      page.getByRole("spinbutton", { name: "Derived", exact: true }),
    ).toHaveValue("8");
    await expect(
      page.getByRole("textbox", { name: "Result", exact: true }),
    ).toHaveValue("ready");
    const observed = await page.evaluate(() => ({
      data: window.ourformLogic.session.getData(),
      schema: window.ourformLogic.session.schema,
      patches: (window as unknown as { interleavePatches: unknown[] })
        .interleavePatches,
    }));
    expect(observed.data).toEqual({
      source: "go",
      bridge: 4,
      derived: 8,
      target: "ready",
    });
    expect(observed.patches).toHaveLength(1);
    const engine = createEngine({ logic: createLogic() });
    for (const field of builtinFields) engine.register(field.model);
    const compiled = engine.compile(observed.schema);
    if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
    expect((await validateSubmission(compiled.form, observed.data)).valid).toBe(
      true,
    );
    expect(
      (await new AxeBuilder({ page }).analyze()).violations.filter((v) =>
        ["serious", "critical"].includes(v.impact ?? ""),
      ),
    ).toEqual([]);
  });
