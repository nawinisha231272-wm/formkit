import { createEngine } from "@ourform/core";
import { builtinComponents, ratingField } from "@ourform/components";
import { defineComposite, definePreset, definePlugin } from "@ourform/sdk";
import type { RegisteredField } from "@ourform/sdk";
import type { FormDefinition } from "@ourform/schema";
import { createFormController } from "@ourform/renderer-dom";
import { checkBuilderRoundTrip, renderComponent } from "@ourform/testing";
import { createElement as el } from "react";
import { createRoot } from "react-dom/client";
import { Form, registerReactField } from "@ourform/react";
import { baseTheme } from "@ourform/themes/base";
import { bootstrap4Theme } from "@ourform/themes/bootstrap4";
import { bootstrap5Theme } from "@ourform/themes/bootstrap5";
import { tailwindTheme } from "@ourform/themes/tailwind";
import { materialTheme } from "@ourform/themes/material";

const themes = [
  baseTheme,
  bootstrap4Theme,
  bootstrap5Theme,
  tailwindTheme,
  materialTheme,
];

export const shortRating = definePreset("sample.short-rating", {
  base: ratingField,
  title: "Quick rating",
  defaults: { max: 3 },
});
export const address = defineComposite({
  type: "sample.address",
  title: "Address",
  dataScope: "object",
  components: [
    {
      id: "street",
      type: "text",
      key: "street",
      label: "Street",
      validation: { required: true },
    },
    {
      id: "city",
      type: "text",
      key: "city",
      label: "City",
      validation: { required: true },
    },
    {
      id: "postal",
      type: "text",
      key: "postal",
      label: "Postal code",
      validation: { required: true },
    },
    {
      id: "country",
      type: "select",
      key: "country",
      label: "Country",
      defaultValue: "US",
      properties: {
        options: [
          { value: "US", label: "United States" },
          { value: "GB", label: "United Kingdom" },
        ],
      },
    },
  ],
});
export const plugin = definePlugin({
  id: "sample.extensions",
  version: "1.0.0",
  engine: "^0.0.1",
  components: [...builtinComponents, address, shortRating],
});
const engine = createEngine({ plugins: [plugin] });
const fields = plugin.components.filter(
  (component): component is RegisteredField => "model" in component,
);
export const schema: FormDefinition = {
  $formVersion: "1.0",
  id: "sdk-extensions",
  display: "form",
  requires: [{ plugin: plugin.id, version: "^1.0.0" }],
  components: [
    {
      id: "billing",
      type: address.model.type,
      key: "billing",
      label: "Billing address",
      description: "Customer-owned address data",
    },
    {
      id: "rating",
      type: shortRating.model.type,
      key: "rating",
      label: "Quick rating",
      validation: { required: true },
    },
  ],
};
const form = createFormController(document.querySelector("#form")!, {
  engine,
  fields,
  schema,
  themes,
  idPrefix: "extensions-",
  onSubmit: (result) => {
    document.querySelector("#result")!.textContent = JSON.stringify(
      result,
      null,
      2,
    );
  },
});
checkBuilderRoundTrip(engine, address.model.type);
checkBuilderRoundTrip(engine, shortRating.model.type);
document.querySelector("#theme")!.addEventListener("change", (event) => {
  const theme = (event.target as HTMLSelectElement).value;
  form.view.setTheme(theme);
  window.sdkExtensions.react?.view.setTheme(theme);
});
document.querySelector("#submit")!.addEventListener("click", () => {
  void form.submit();
});
document.querySelector("#missing")!.addEventListener("click", () => {
  const empty = createEngine();
  document.querySelector("#diagnostics")!.textContent = JSON.stringify(
    empty.compile(schema).diagnostics,
    null,
    2,
  );
});
let harness: ReturnType<typeof renderComponent> | undefined;
let harnessValidationCalls = 0;
document.querySelector("#harness")!.addEventListener("click", () => {
  harness?.destroy();
  harnessValidationCalls = 0;
  const harnessEngine = createEngine({
    validators: {
      harness: {
        validate: () => {
          harnessValidationCalls++;
          return null;
        },
      },
    },
  });
  const isAddress =
    document.querySelector<HTMLSelectElement>("#harness-kind")!.value ===
    "address";
  harness = renderComponent(isAddress ? address : shortRating, {
    engine: harnessEngine,
    host: document.querySelector("#test-harness")!,
    theme: "bootstrap4",
    readOnly:
      document.querySelector<HTMLInputElement>("#harness-readonly")!.checked,
    ...(isAddress
      ? {
          fields: builtinComponents,
          data: {
            value: {
              street: "Guide Street",
              city: "Guide City",
              postal: "01234",
              country: "GB",
            },
          },
        }
      : {}),
    node: {
      label: isAddress ? "Harness address" : "Harness rating",
      validation: {
        required: !isAddress,
        ...(!isAddress ? { custom: [{ validator: "harness" }] } : {}),
      },
    },
  });
});

interface InputProps {
  value: string;
  onValueChange(value: string): void;
  onBlur(): void;
  disabled: boolean;
  readOnly: boolean;
  id: string;
  name: string;
  "aria-labelledby": string;
  "aria-describedby"?: string;
  "aria-invalid": string;
  "aria-required": string;
  "aria-busy": string;
  className: string;
  focusRef(target: HTMLInputElement | null): void;
}
function inputAttributes(props: InputProps) {
  return {
    id: props.id,
    name: props.name,
    disabled: props.disabled,
    readOnly: props.readOnly,
    className: props.className,
    ref: props.focusRef,
    "aria-labelledby": props["aria-labelledby"],
    "aria-describedby": props["aria-describedby"],
    "aria-invalid": props["aria-invalid"],
    "aria-required": props["aria-required"],
    "aria-busy": props["aria-busy"],
  };
}
function ConventionalInput(props: InputProps) {
  return el("input", {
    ...inputAttributes(props),
    value: props.value,
    onBlur: props.onBlur,
    onChange: (event) => props.onValueChange(event.currentTarget.value),
  });
}
// SDK scenario B: one registration statement, with no wrapper or mapping.
export const conventional = registerReactField(
  "sample.conventional",
  ConventionalInput,
);
type UnusualProps = Omit<
  InputProps,
  "value" | "onValueChange" | "onBlur" | "disabled"
> & {
  current: string;
  commit(event: { detail: { text: string } }): void;
  leave(): void;
  inactive: boolean;
};
function UnusualInput(props: UnusualProps) {
  return el("input", {
    ...inputAttributes({
      ...props,
      value: props.current,
      onValueChange: () => {},
      onBlur: props.leave,
      disabled: props.inactive,
    }),
    value: props.current,
    onBlur: props.leave,
    onChange: (event) =>
      props.commit({ detail: { text: event.currentTarget.value } }),
  });
}
export const unusual = registerReactField("sample.unusual", UnusualInput, {
  valueProp: "current",
  changeProp: "commit",
  blurProp: "leave",
  disabledProp: "inactive",
  mapChange: (event) => (event as { detail: { text: string } }).detail.text,
});
const reactRoot = createRoot(document.querySelector("#react")!);
reactRoot.render(
  el(Form, {
    fields: [conventional, unusual],
    themes,
    theme: baseTheme,
    schema: {
      $formVersion: "1.0",
      id: "registration",
      display: "form",
      components: [
        {
          id: "conventional",
          type: conventional.model.type,
          key: "conventional",
          label: "Conventional input",
          validation: { required: true },
        },
        {
          id: "unusual",
          type: unusual.model.type,
          key: "unusual",
          label: "Mapped input",
          validation: { required: true },
        },
      ],
    },
    onReady: (controller) => {
      window.sdkExtensions.react = controller;
    },
  }),
);
window.sdkExtensions = {
  form,
  get harness() {
    return harness;
  },
  get harnessValidationCalls() {
    return harnessValidationCalls;
  },
  react: undefined,
  renderComponent,
};
window.addEventListener(
  "pagehide",
  () => {
    harness?.destroy();
    form.destroy();
    reactRoot.unmount();
  },
  { once: true },
);
declare global {
  interface Window {
    sdkExtensions: {
      form: typeof form;
      readonly harness: typeof harness;
      readonly harnessValidationCalls: number;
      react: typeof form | undefined;
      renderComponent: typeof renderComponent;
    };
  }
}
