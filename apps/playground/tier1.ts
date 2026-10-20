import "@angular/compiler";
import { createComponent, provideZonelessChangeDetection } from "@angular/core";
import { createApplication } from "@angular/platform-browser";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { Form } from "@ourform/react";
import { OurFormComponent } from "@ourform/angular";
import { renderForm } from "@ourform/element";
import { createConformanceEngine } from "@ourform/testing";
import { validateSubmission, toSubmissionSchema } from "@ourform/validation";
import type { FormController } from "@ourform/renderer-dom";
import type { FormDefinition, ThemeMode } from "@ourform/sdk";
import type {
  CompileResult,
  SubmitResult,
  ValidationResult,
} from "@ourform/core";
import schema from "../../fixtures/forms/tier1/registration.json";
import goodData from "../../fixtures/forms/tier1/registration.data.json";
const query = new URLSearchParams(location.search);
const definition = structuredClone(schema) as FormDefinition;
const locale = query.get("locale") ?? "en";
if (query.has("disabled"))
  for (const node of definition.components) node.disabledWhen = true;
definition.settings = { ...definition.settings, locale };
if (query.has("unsafe"))
  definition.components[0]!.properties!.html =
    '<p>Safe <strong>content</strong></p><script>window.m06Xss=true</script><img src=x onerror="window.m06Xss=true"><a href="java&#x73;cript:alert(1)" onclick="window.m06Xss=true">Blocked</a><a href="https://example.com">Allowed</a>';
definition.components.find((n) => n.id === "email")!.validation!.custom = [
  { validator: "available" },
];
const lookups: {
  value: unknown;
  signal: AbortSignal;
  resolve: (taken: boolean) => void;
}[] = [];
const engine = createConformanceEngine({
  validators: {
    available: {
      validate: async (value, ctx) => {
        const taken = await (
          ctx.providers.checkEmail as (
            value: unknown,
            signal: AbortSignal,
          ) => Promise<boolean>
        )(value, ctx.signal);
        return taken ? { code: "taken", messageKey: "demo.emailTaken" } : null;
      },
    },
  },
  providers: {
    checkEmail: (value: unknown, signal: AbortSignal) =>
      new Promise<boolean>((resolve) => {
        lookups.push({ value, signal, resolve });
        if (query.has("manual")) {
          signal.addEventListener("abort", () => resolve(false), {
            once: true,
          });
          return;
        }
        const abort = () => {
          clearTimeout(timer);
          resolve(false);
        };
        const timer = setTimeout(() => {
          signal.removeEventListener("abort", abort);
          resolve(value === "taken@example.com");
        }, 180);
        signal.addEventListener("abort", abort, { once: true });
      }),
    localization: (key, params, language) => {
      if (key === "demo.emailTaken")
        return language === "es"
          ? `${params.label}: correo ya utilizado`
          : `${params.label} is already in use`;
      if (language !== "es") return undefined;
      if (["of.required", "of.validation.required"].includes(key))
        return `${params.label} es obligatorio`;
      if (key === "of.errorSummary") return "Corrige estos errores";
      if (key === "of.select.placeholder") return "Elige una opción";
      if (key === "of.validation.email")
        return `${params.label}: correo no válido`;
      return undefined;
    },
  },
});
let form: FormController;
let unmount = () => {};
const output = document.querySelector("#tier-result")!;
const ready = (controller: FormController) => {
  form = controller;
};
const submitted = (result: SubmitResult) => {
  output.textContent = JSON.stringify(result, null, 2);
};
const host = document.querySelector<HTMLElement>("#host")!;
host.addEventListener("of-action", (event) => {
  output.textContent = JSON.stringify(
    (event as CustomEvent<unknown>).detail,
    null,
    2,
  );
});
const common = {
  engine,
  schema: definition,
  readOnly: query.has("readonly"),
  data: query.has("readonly") ? goodData : undefined,
  onSubmit: submitted,
};
const adapter = query.get("host") ?? "dom";
document.querySelector("#host-name")!.textContent =
  `Adapter: ${adapter} · Locale: ${locale}`;
if (adapter === "react") {
  const root = createRoot(host);
  root.render(createElement(Form, { ...common, onReady: ready }));
  unmount = () => root.unmount();
} else if (adapter === "angular") {
  const app = await createApplication({
    providers: [provideZonelessChangeDetection()],
  });
  const ref = createComponent(OurFormComponent, {
    hostElement: host,
    environmentInjector: app.injector,
  });
  ref.setInput("engine", engine);
  ref.setInput("schema", definition);
  ref.setInput("readOnly", common.readOnly);
  ref.setInput("data", common.data);
  ref.instance.ready.subscribe(ready);
  ref.instance.submitted.subscribe(submitted);
  app.attachView(ref.hostView);
  ref.changeDetectorRef.detectChanges();
  unmount = () => {
    ref.destroy();
    app.destroy();
  };
} else {
  ready(renderForm(host, common));
  unmount = () => form.destroy();
}
const theme = document.querySelector<HTMLSelectElement>("#tier-theme")!;
const mode = document.querySelector<HTMLSelectElement>("#tier-mode")!;
theme.addEventListener("change", () => form.view.setTheme(theme.value));
mode.addEventListener("change", () =>
  form.view.setMode(mode.value as ThemeMode),
);
const compiled = engine.compile(definition);
if (!compiled.ok) throw new Error("Invalid demo");
document.querySelector("#tier-schema")!.textContent = JSON.stringify(
  toSubmissionSchema(compiled.form),
  null,
  2,
);
async function validateCases(
  cases: {
    definition: unknown;
    data?: unknown;
    unknownKeys?: "reject" | "strip";
  }[],
) {
  const results: {
    compile: CompileResult["diagnostics"];
    result?: ValidationResult;
  }[] = [];
  for (const item of cases) {
    const e = createConformanceEngine();
    const compiled = e.compile(item.definition);
    const session = compiled.ok ? e.createSession(compiled.form) : undefined;
    const data = item.data ?? session?.getData();
    session?.dispose();
    results.push(
      compiled.ok
        ? {
            compile: compiled.diagnostics,
            result: await validateSubmission(compiled.form, data, {
              ...(item.unknownKeys ? { unknownKeys: item.unknownKeys } : {}),
            }),
          }
        : { compile: compiled.diagnostics },
    );
  }
  return results;
}
const unknownPolicy =
  document.querySelector<HTMLSelectElement>("#unknown-policy")!;
const unknownButton =
  document.querySelector<HTMLButtonElement>("#validate-unknown")!;
unknownButton.addEventListener("click", async () => {
  unknownButton.disabled = true;
  try {
    const data = { ...structuredClone(goodData), extra: "host metadata" };
    const [result] = await validateCases([
      {
        definition: schema,
        data,
        unknownKeys: unknownPolicy.value === "strip" ? "strip" : "reject",
      },
    ]);
    document.querySelector("#unknown-result")!.textContent = JSON.stringify(
      { validation: result?.result, originalExtra: data.extra },
      null,
      2,
    );
  } finally {
    unknownButton.disabled = false;
  }
});
declare global {
  interface Window {
    tier1Demo: {
      readonly form: FormController;
      lookups: typeof lookups;
      unmount(): void;
      validateCases: typeof validateCases;
    };
  }
}
let unmounted = false;
const cleanup = () => {
  if (unmounted) return;
  unmounted = true;
  unmount();
};
window.tier1Demo = {
  get form() {
    return form;
  },
  lookups,
  unmount: cleanup,
  validateCases,
};
window.addEventListener("pagehide", cleanup);
