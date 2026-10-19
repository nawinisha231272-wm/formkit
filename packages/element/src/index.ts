import { createFormController } from "@ourform/renderer-dom";
import type {
  FormController,
  HostOptions,
  NativeHost,
} from "@ourform/renderer-dom";
import { registerNativeField, mapNativeProps } from "@ourform/sdk";
import type { NativeFieldOptions } from "@ourform/sdk";
import {
  textField,
  numberField,
  checkboxField,
  ratingField,
} from "@ourform/components";
export type { FormController, HostOptions } from "@ourform/renderer-dom";
export function registerElementField<V = string>(
  type: string,
  component: string | CustomElementConstructor,
  options: NativeFieldOptions<V> = {},
) {
  return registerNativeField("element", type, component, options);
}
const builtins = [textField, numberField, checkboxField, ratingField];
const nativeHost: NativeHost = {
  mount(slot, view, initial) {
    const element =
      typeof view.component === "string"
        ? slot.ownerDocument.createElement(view.component)
        : new (view.component as CustomElementConstructor)();
    let props = initial;
    const previous = new Map<string, unknown>();
    const change = (event: Event) =>
      (
        mapNativeProps(view, props)[view.mapping.changeProp] as (
          next: unknown,
        ) => void
      )((event as CustomEvent<unknown>).detail);
    const blur = () => props.onBlur();
    element.addEventListener(view.mapping.changeProp, change);
    element.addEventListener(view.mapping.blurProp, blur, true);
    const update = (next: typeof props) => {
      props = next;
      for (const [key, value] of Object.entries(mapNativeProps(view, props))) {
        if (
          typeof value === "function" ||
          (previous.has(key) && Object.is(previous.get(key), value))
        )
          continue;
        previous.set(key, value);
        if (key.startsWith("aria-")) {
          if (key === "aria-required") continue;
          if (value === undefined) element.removeAttribute(key);
          else element.setAttribute(key, String(value));
        } else Reflect.set(element, key, value);
      }
      props.focusRef(element);
    };
    slot.append(element);
    update(initial);
    return {
      update,
      destroy() {
        element.removeEventListener(view.mapping.changeProp, change);
        element.removeEventListener(view.mapping.blurProp, blur, true);
        props.focusRef(null);
        element.remove();
      },
    };
  },
};
export function renderForm(
  root: string | Element,
  options: HostOptions,
): FormController {
  const target = typeof root === "string" ? document.querySelector(root) : root;
  if (!target) throw new Error(`Form container not found: ${root}`);
  return createFormController(target, {
    ...options,
    adapter: "element",
    nativeHost,
    fields: [...builtins, ...(options.fields ?? [])],
  });
}
export interface OurFormElement extends HTMLElement {
  schema: unknown;
  data: unknown;
  theme: HostOptions["theme"];
  engine: HostOptions["engine"];
  readOnly: boolean;
  fields: NonNullable<HostOptions["fields"]>;
  readonly controller: FormController | undefined;
  submit(): ReturnType<FormController["submit"]>;
  validate(): ReturnType<FormController["validate"]>;
  reset(data?: unknown): void;
  focusField(id: string): void;
}
export function defineOurFormElement(
  tag = "our-form",
): CustomElementConstructor {
  if (!tag.includes("-")) throw new Error("Custom element tags need a hyphen.");
  if (customElements.get(tag))
    throw new Error(`Custom element already registered: ${tag}`);
  class OurForm extends HTMLElement implements OurFormElement {
    #schema: unknown;
    #data: unknown = {};
    #theme: HostOptions["theme"] = "base";
    #engine: HostOptions["engine"];
    #readOnly = false;
    #fields: NonNullable<HostOptions["fields"]> = [];
    #controller: FormController | undefined;
    get controller() {
      return this.#controller;
    }
    get schema() {
      return this.#schema;
    }
    set schema(value: unknown) {
      this.#schema = value;
      this.rebuild();
    }
    get data() {
      return this.#controller?.session.getData() ?? this.#data;
    }
    set data(value: unknown) {
      this.#data = value;
      this.#controller?.setData(value);
    }
    get theme() {
      return this.#theme;
    }
    set theme(value: HostOptions["theme"]) {
      this.#theme = value;
      if (value) this.#controller?.view.setTheme(value);
    }
    get engine() {
      return this.#engine;
    }
    set engine(value: HostOptions["engine"]) {
      this.#engine = value;
      this.rebuild();
    }
    get readOnly() {
      return this.#readOnly;
    }
    set readOnly(value: boolean) {
      if (this.#readOnly === value) return;
      this.#data = this.data;
      this.#readOnly = value;
      this.rebuild();
    }
    get fields() {
      return this.#fields;
    }
    set fields(value: NonNullable<HostOptions["fields"]>) {
      this.#fields = value;
      this.rebuild();
    }
    connectedCallback() {
      this.rebuild();
    }
    disconnectedCallback() {
      this.#data = this.data;
      this.#controller?.destroy();
      this.#controller = undefined;
    }
    private rebuild() {
      if (!this.isConnected || !this.#schema) return;
      this.#controller?.destroy();
      const root = this.hasAttribute("shadow")
        ? (this.shadowRoot ?? this.attachShadow({ mode: "open" }))
        : this;
      root.replaceChildren();
      const container = this.ownerDocument.createElement("div");
      root.append(container);
      this.#controller = renderForm(container, {
        schema: this.#schema,
        data: this.#data,
        fields: this.#fields,
        readOnly: this.#readOnly,
        ...(this.#engine ? { engine: this.#engine } : {}),
        ...(this.#theme ? { theme: this.#theme } : {}),
        onChange: (patch) => {
          this.#data = patch.data;
          this.dispatchEvent(
            new CustomEvent("of-change", {
              detail: { data: patch.data, changedPaths: patch.changedPaths },
              bubbles: true,
              composed: true,
            }),
          );
        },
        onSubmit: (result) =>
          this.dispatchEvent(
            new CustomEvent("of-submit", {
              detail: result,
              bubbles: true,
              composed: true,
            }),
          ),
      });
      this.dispatchEvent(
        new CustomEvent("of-ready", {
          detail: { session: this.#controller.session },
          bubbles: true,
          composed: true,
        }),
      );
    }
    private active() {
      if (!this.#controller) throw new Error("Form element is not ready.");
      return this.#controller;
    }
    submit() {
      return this.active().submit();
    }
    validate() {
      return this.active().validate();
    }
    reset(data: unknown = {}) {
      this.active().reset(data);
    }
    focusField(id: string) {
      this.active().focusField(id);
    }
  }
  customElements.define(tag, OurForm);
  return OurForm;
}
