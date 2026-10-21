import { createFormController, createFormHost } from "@ourform/renderer-dom";
import type {
  FormController,
  HostOptions,
  NativeHost,
} from "@ourform/renderer-dom";
import { registerNativeField, mapNativeProps } from "@ourform/sdk";
import type { NativeFieldOptions } from "@ourform/sdk";
import { builtinComponents } from "@ourform/components";
import { createBuilderController } from "@ourform/builder";
import type { BuilderController, BuilderOptions } from "@ourform/builder";
export type {
  BuilderController,
  BuilderOptions,
  SchemaChange,
} from "@ourform/builder";
export type { FormController, HostOptions } from "@ourform/renderer-dom";
export function registerElementField<V = string>(
  type: string,
  component: string | CustomElementConstructor,
  options: NativeFieldOptions<V> = {},
) {
  return registerNativeField("element", type, component, options);
}
const builtins = builtinComponents;
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
export function renderBuilder(
  root: string | Element,
  options: BuilderOptions,
): BuilderController {
  const target = typeof root === "string" ? document.querySelector(root) : root;
  if (!target) throw new Error(`Builder container not found: ${root}`);
  return createBuilderController(target, {
    ...options,
    adapter: "element",
    nativeHost,
    fields: [...builtins, ...(options.fields ?? [])],
  });
}
export interface OurFormBuilderElement extends HTMLElement {
  schema: unknown;
  theme: BuilderOptions["theme"];
  engine: BuilderOptions["engine"];
  fields: NonNullable<BuilderOptions["fields"]>;
  readonly controller: BuilderController | undefined;
}
export function defineOurFormBuilderElement(
  tag = "our-form-builder",
): CustomElementConstructor {
  if (!tag.includes("-") || customElements.get(tag))
    throw new Error(`Invalid or already registered builder tag: ${tag}`);
  const empty = () => ({
    $formVersion: "1.0",
    id: "builder",
    display: "form",
    components: [],
  });
  class OurBuilder extends HTMLElement implements OurFormBuilderElement {
    static observedAttributes = ["schema", "theme"];
    #schema: unknown = empty();
    #theme: BuilderOptions["theme"] = "base";
    #engine: BuilderOptions["engine"];
    #fields: NonNullable<BuilderOptions["fields"]> = [];
    #controller: BuilderController | undefined;
    #mount: HTMLElement | undefined;
    #reflecting = false;
    get controller() {
      return this.#controller;
    }
    get schema() {
      return this.#controller?.builder.getState().definition ?? this.#schema;
    }
    set schema(value: unknown) {
      const previous = this.#schema;
      if (this.#controller) {
        const diagnostics = this.#controller.load(value);
        if (diagnostics.some((d) => d.severity === "error"))
          throw new Error(diagnostics.map((d) => d.message).join("; "));
        this.#schema = value;
      } else {
        this.#schema = value;
        try {
          if (this.isConnected) this.rebuild();
        } catch (cause) {
          this.#schema = previous;
          throw cause;
        }
      }
    }

    get theme() {
      return this.#theme;
    }
    set theme(value: BuilderOptions["theme"]) {
      this.#controller?.setTheme(value ?? "base");
      this.#theme = value;
      this.#reflecting = true;
      try {
        if (typeof value === "string") this.setAttribute("theme", value);
        else this.removeAttribute("theme");
      } finally {
        this.#reflecting = false;
      }
    }
    get engine() {
      return this.#engine;
    }
    set engine(value: BuilderOptions["engine"]) {
      const previous = this.#engine;
      this.#engine = value;
      try {
        this.rebuild();
      } catch (cause) {
        this.#engine = previous;
        throw cause;
      }
    }
    get fields() {
      return this.#fields;
    }
    set fields(value: NonNullable<BuilderOptions["fields"]>) {
      const previous = this.#fields;
      this.#fields = value;
      try {
        this.rebuild();
      } catch (cause) {
        this.#fields = previous;
        throw cause;
      }
    }
    attributeChangedCallback(
      name: string,
      old: string | null,
      value: string | null,
    ) {
      if (old === value || this.#reflecting) return;
      try {
        if (name === "schema")
          this.schema = value === null ? empty() : JSON.parse(value);
        else this.theme = value ?? "base";
      } catch (cause) {
        this.error(cause);
      }
    }
    connectedCallback() {
      try {
        this.rebuild();
      } catch (cause) {
        this.error(cause);
      }
    }
    disconnectedCallback() {
      this.#schema = this.schema;
      this.#controller?.destroy();
      this.#controller = undefined;
    }
    private error(cause: unknown) {
      this.dispatchEvent(
        new CustomEvent("of-error", {
          detail: {
            message:
              cause instanceof Error
                ? cause.message
                : "Invalid builder configuration",
          },
          bubbles: true,
          composed: true,
        }),
      );
    }
    private rebuild() {
      if (!this.isConnected) return;
      const fields = [...builtins, ...this.#fields];
      const { engine } = createFormHost(fields, this.#engine);
      const compiled = engine.compile(this.schema);
      if (!compiled.ok)
        throw new Error(compiled.diagnostics.map((d) => d.message).join("; "));
      this.#schema = this.schema;
      this.#controller?.destroy();
      this.#controller = undefined;
      if (!this.#mount) {
        this.#mount = this.ownerDocument.createElement("div");
        (this.hasAttribute("shadow")
          ? (this.shadowRoot ?? this.attachShadow({ mode: "open" }))
          : this
        ).append(this.#mount);
      }
      this.#controller = renderBuilder(this.#mount, {
        schema: this.#schema,
        engine,
        fields: this.#fields,
        ...(this.#theme ? { theme: this.#theme } : {}),
        onSchemaChange: ({ definition }) => {
          this.#schema = definition;
        },
      });
      this.dispatchEvent(
        new CustomEvent("of-ready", {
          detail: this.#controller,
          bubbles: true,
          composed: true,
        }),
      );
    }
  }
  customElements.define(tag, OurBuilder);
  return OurBuilder;
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
    static get observedAttributes() {
      return ["schema", "data", "theme", "read-only"];
    }
    attributeChangedCallback(
      name: string,
      old: string | null,
      value: string | null,
    ) {
      if (old === value || this.#reflecting) return;
      try {
        if (name === "theme") this.theme = value ?? "base";
        else if (name === "read-only") this.readOnly = value !== null;
        else if (name === "data")
          this.data = value === null ? {} : JSON.parse(value);
        else this.schema = value === null ? undefined : JSON.parse(value);
      } catch (error) {
        this.reportError(error);
      }
    }
    private reportError(error: unknown) {
      this.dispatchEvent(
        new CustomEvent("of-error", {
          detail: {
            message:
              error instanceof Error ? error.message : "Invalid form attribute",
          },
          bubbles: true,
          composed: true,
        }),
      );
    }
    #reflecting = false;
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
      const previous = this.#schema;
      this.#schema = value;
      try {
        this.rebuild();
      } catch (error) {
        this.#schema = previous;
        throw error;
      }
    }
    get data() {
      return this.#controller?.session.getData() ?? this.#data;
    }
    set data(value: unknown) {
      this.#controller?.setData(value);
      this.#data = value;
    }
    get theme() {
      return this.#theme;
    }
    set theme(value: HostOptions["theme"]) {
      if (this.#theme === value) return;
      this.#controller?.view.setTheme(value ?? "base");
      this.#theme = value;
      this.#reflecting = true;
      try {
        if (typeof value === "string") this.setAttribute("theme", value);
        else this.removeAttribute("theme");
      } finally {
        this.#reflecting = false;
      }
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
      this.toggleAttribute("read-only", value);
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
      try {
        this.rebuild();
      } catch (error) {
        this.reportError(error);
      }
    }
    disconnectedCallback() {
      this.#data = this.data;
      this.#controller?.destroy();
      this.#controller = undefined;
    }
    private rebuild() {
      if (!this.isConnected) return;
      if (this.#schema == null) {
        this.#data = this.data;
        this.#controller?.destroy();
        this.#controller = undefined;
        (this.shadowRoot ?? this).replaceChildren();
        return;
      }
      const preflight = createFormHost(
        [...builtins, ...this.#fields],
        this.#engine,
      ).engine.compile(this.#schema);
      if (!preflight.ok)
        throw new Error(
          preflight.diagnostics
            .map((d) => `${d.code}: ${d.message}`)
            .join("; "),
        );
      this.#data = this.data;
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
