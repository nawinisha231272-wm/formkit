import { test, expect } from "vitest";
import { createEngine, englishMessage, englishMessages } from "../src/index";
import type { ValidatorContext } from "../src/index";
import { text, form, field, session } from "./helpers";
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
const bad = { code: "taken", messageKey: "demo.taken" };
function deferred() {
  const jobs: {
    ctx: ValidatorContext;
    value: unknown;
    resolve: (errors: typeof bad | null) => void;
  }[] = [];
  const e = createEngine({
    validators: {
      remote: {
        validate: (value, ctx) =>
          new Promise<typeof bad | null>((resolve) =>
            jobs.push({ ctx, value, resolve }),
          ),
      },
    },
  }).register(text);
  const s = session(
    e,
    form(
      [field("name", { validation: { custom: [{ validator: "remote" }] } })],
      { validateOn: "change" },
    ),
    { name: "first" },
  );
  return { e, s, jobs };
}
test("async pending and cancellation ignore stale results and rejections from hosts that ignore AbortSignal", async () => {
  const { s, jobs } = deferred();
  expect(s.getFieldState("name").pending).toBe(true);
  expect(jobs[0]!.ctx.signal).toBeInstanceOf(AbortSignal);
  s.setValue("name", "second");
  expect(jobs[0]!.ctx.signal.aborted).toBe(true);
  jobs[1]!.resolve(null);
  await flush();
  expect(s.getFieldState("name")).toMatchObject({
    pending: false,
    errors: [],
    value: "second",
  });
  jobs[0]!.resolve(bad);
  await flush();
  expect(s.getFieldState("name").errors).toEqual([]);
  s.dispose();
});
test("validate awaits async errors; superseded submission fails closed and never submits a newer value", async () => {
  const { s, jobs } = deferred();
  const pending = s.submit();
  expect(jobs[0]!.ctx.signal.aborted).toBe(true);
  s.setValue("name", "changed");
  expect(await pending).toMatchObject({
    ok: false,
    errors: [{ error: { code: "aborted" } }],
  });
  const validation = s.validate();
  const latest = jobs.at(-1)!;
  latest.resolve(bad);
  expect(await validation).toMatchObject({
    valid: false,
    errors: [{ componentId: "name", error: bad }],
  });
  const next = s.submit();
  jobs.at(-1)!.resolve(null);
  expect(await next).toEqual({ ok: true, data: { name: "changed" } });
  s.dispose();
});
test("reset/dispose abort pending work and settle waiters without late notifications", async () => {
  const { s, jobs } = deferred();
  let notifications = 0;
  s.subscribe(() => notifications++);
  const first = s.validate();
  s.reset();
  const afterReset = notifications;
  expect((await first).valid).toBe(false);
  expect(jobs.every((job) => job.ctx.signal.aborted)).toBe(true);
  jobs.forEach((job) => job.resolve(bad));
  await flush();
  expect(notifications).toBe(afterReset);
  s.setValue("name", "again");
  const second = s.validate();
  s.dispose();
  const afterDispose = notifications;
  expect((await second).valid).toBe(false);
  jobs.at(-1)!.resolve(bad);
  await flush();
  expect(notifications).toBe(afterDispose);
});
test("hiding a field aborts its validators and clears pending/error state", async () => {
  let signal: AbortSignal | undefined;
  const e = createEngine({
    validators: {
      wait: {
        validate: (_v, ctx) => {
          signal = ctx.signal;
          return new Promise(() => {});
        },
      },
    },
  }).register(text);
  const s = session(
    e,
    form(
      [
        field("show"),
        field("name", {
          visibleWhen: ["eq", { ref: "show" }, "yes"],
          validation: { custom: [{ validator: "wait" }] },
        }),
      ],
      { validateOn: "change" },
    ),
    { show: "yes", name: "value" },
  );
  expect(s.getFieldState("name").pending).toBe(true);
  s.setValue("show", "no");
  expect(signal!.aborted).toBe(true);
  expect(s.getFieldState("name")).toMatchObject({
    visible: false,
    pending: false,
    errors: [],
  });
  s.dispose();
});
test("custom validators receive frozen snapshots, config, provider context and compiled argument dependencies", async () => {
  let last: ValidatorContext | undefined;
  const e = createEngine({
    validators: {
      match: {
        validate: (value, ctx) => {
          last = ctx;
          return value === ctx.args.other ? null : bad;
        },
      },
    },
    functions: {
      upper: {
        pure: true,
        availableInNode: true,
        run: (v) => String(v).toUpperCase(),
      },
    },
    providers: { account: "demo" },
  }).register(text);
  const s = session(
    e,
    form(
      [
        field("password"),
        field("confirm", {
          validation: {
            custom: [
              {
                validator: "match",
                args: { other: ["call", "upper", { path: "data.password" }] },
              },
            ],
          },
        }),
      ],
      { validateOn: "change" },
    ),
    { password: "one", confirm: "ONE" },
  );
  expect((await s.validate()).valid).toBe(true);
  expect(last!.providers.account).toBe("demo");
  expect(Object.isFrozen(last!.data)).toBe(true);
  s.setValue("password", "two");
  expect(s.getFieldState("confirm").errors).toEqual([bad]);
  expect(last!.args.other).toBe("TWO");
  expect(last!.path).toEqual(["confirm"]);
  s.dispose();
  const other = createEngine().register(text);
  expect(
    other.compile(
      form([field("x", { validation: { custom: [{ validator: "match" }] } })]),
    ).ok,
  ).toBe(false);
});
test("sync/async host failures and malformed results become validation errors rather than unhandled rejections", async () => {
  for (const validate of [
    () => {
      throw new Error("host");
    },
    () => Promise.reject(new Error("remote")),
    () => 1,
    () => Promise.resolve({ code: 1 }),
  ]) {
    const e = createEngine({
      validators: { broken: { validate: validate as never } },
    }).register(text);
    const s = session(
      e,
      form([
        field("name", { validation: { custom: [{ validator: "broken" }] } }),
      ]),
      { name: "v" },
    );
    expect(await s.validate()).toMatchObject({
      valid: false,
      errors: [{ error: { code: "unavailable" } }],
    });
    s.dispose();
  }
});
test("registry copies validator metadata and diagnoses unknown rules, bad args and dependency cycles", () => {
  expect(() =>
    createEngine({ validators: { email: { validate: () => null } } }),
  ).toThrow("Reserved");
  const validators = ["check"];
  const e = createEngine({
    validators: { check: { validate: () => null } },
  }).register({ ...text, validators });
  validators.push("unknown");
  expect(e.getField("text")!.validators).toEqual(["check"]);
  expect(
    e.compile(
      form([
        field("x", {
          validation: {
            custom: [{ validator: "check", args: { arg: { ref: "missing" } } }],
          },
        }),
      ]),
    ).ok,
  ).toBe(false);
  expect(
    e.compile(
      form([
        field("x", {
          validation: {
            custom: [{ validator: "check", args: { arg: { path: "bad" } } }],
          },
        }),
      ]),
    ).ok,
  ).toBe(false);
  expect(
    e.compile(
      form([
        field("x", {
          validation: {
            custom: [{ validator: "check", args: { self: { ref: "x" } } }],
          },
        }),
      ]),
    ).ok,
  ).toBe(true);
  expect(
    e
      .compile(
        form([
          field("x", {
            validation: {
              custom: [{ validator: "check", args: { b: { ref: "y" } } }],
            },
          }),
          field("y", { visibleWhen: { ref: "x" } }),
        ]),
      )
      .diagnostics.some((d) => d.code === "cycle"),
  ).toBe(true);
});
test("localization uses locale/provider with an English/key fallback and validation counts Unicode code points", async () => {
  const e = createEngine({
    providers: {
      localization: (key, params, locale) =>
        key === "of.validation.required"
          ? `${locale}: ${params.label}`
          : undefined,
    },
  }).register(text);
  const s = session(
    e,
    {
      ...form([field("name", { validation: { minLength: 2 } })]),
      settings: { locale: "fr" },
    },
    { name: "😀" },
  );
  expect(s.localize("of.validation.required", { label: "Nom" })).toBe(
    "fr: Nom",
  );
  expect(s.localize("of.button.reset")).toBe("Reset");
  expect(s.localize("unknown")).toBe("unknown");
  expect(englishMessage("of.validation.min", { label: "Age" })).toContain(
    "{min}",
  );
  expect(Object.isFrozen(englishMessages)).toBe(true);
  expect((await s.validate()).errors[0]!.error.code).toBe("minLength");
  s.dispose();
});

test("built-in email and static-option validators reject unknown values with stable message keys", async () => {
  const e = createEngine()
    .register({ ...text, type: "email", validators: ["email"] })
    .register({
      ...text,
      type: "select",
      validators: ["options"],
      properties: {
        options: {
          kind: "options",
          label: "Options",
          group: "Display",
          default: [{ value: "a", label: "A" }],
        },
      },
    });
  const s = session(
    e,
    form([
      field("email", { type: "email" }),
      field("select", { type: "select" }),
    ]),
    { email: "invalid", select: "b" },
  );
  expect((await s.validate()).errors.map((e) => e.error.code)).toEqual([
    "email",
    "option",
  ]);
  s.setValue("email", "a@example.com");
  s.setValue("select", "a");
  expect((await s.validate()).valid).toBe(true);
  s.dispose();
});

test("English shell/catalog interpolation retains singular/plural and dynamic message defaults", () => {
  expect(englishMessage("of.errorCount", { count: 1 })).toBe(
    "1 error in the form",
  );
  expect(englishMessage("of.errorCount", { count: 2 })).toBe(
    "2 errors in the form",
  );
  expect(englishMessage("of.rating.stars", { score: 4, max: 5 })).toBe(
    "4 of 5 stars",
  );
});

test("unknown localization keys cannot read Object.prototype", () => {
  for (const key of ["constructor", "__proto__", "toString"])
    expect(englishMessage(key)).toBe(key);
});

test("duplicate validation paths start one run and do not cancel themselves", async () => {
  const { s, jobs } = deferred();
  const before = jobs.length;
  const result = s.validate({ paths: ["name", "name"] });
  expect(jobs.length - before).toBe(1);
  jobs.at(-1)!.resolve(null);
  expect((await result).valid).toBe(true);
  s.dispose();
});
