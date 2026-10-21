import {
  renderBuilder,
  defineOurFormBuilderElement,
  registerElementField,
} from "@ourform/element";
import type { OurFormBuilderElement } from "@ourform/element";
import { stringProperty } from "@ourform/sdk";
import { recordBuilderEvents } from "../../shared/builder-types";
import schema from "../../../fixtures/forms/nested-tabs/customer.json";
import data from "../../../fixtures/forms/nested-tabs/customer.data.json";
class NativeText extends HTMLElement {
  static observedAttributes = [
    "aria-labelledby",
    "aria-describedby",
    "aria-invalid",
    "aria-busy",
  ];
  #value = "";
  #hint = "Native answer";
  #id = "";
  #class = "";
  #disabled = false;
  #readOnly = false;
  #required = false;
  #input: HTMLInputElement | undefined;
  get value() {
    return this.#value;
  }
  set value(value: string) {
    this.#value = value;
    this.sync();
  }
  get hint() {
    return this.#hint;
  }
  set hint(value: string) {
    this.#hint = value;
    this.sync();
  }
  get id() {
    return this.#id;
  }
  set id(value: string) {
    this.#id = value;
    this.sync();
  }
  get className() {
    return this.#class;
  }
  set className(value: string) {
    this.#class = value;
    this.sync();
  }
  get disabled() {
    return this.#disabled;
  }
  set disabled(value: boolean) {
    this.#disabled = value;
    this.sync();
  }
  get readOnly() {
    return this.#readOnly;
  }
  set readOnly(value: boolean) {
    this.#readOnly = value;
    this.sync();
  }
  get required() {
    return this.#required;
  }
  set required(value: boolean) {
    this.#required = value;
    this.sync();
  }
  connectedCallback() {
    if (!this.#input) {
      this.#input = this.ownerDocument.createElement("input");
      this.#input.type = "text";
      this.#input.dataset.builderNative = "";
      const context = this.ownerDocument.createElement("span");
      context.hidden = true;
      context.dataset.builderContext = "";
      context.textContent = "element-builder-context";
      this.append(this.#input, context);
      this.style.display = "block";
      this.style.flex = "1";
      this.style.minWidth = "0";
    }
    this.#input.oninput = () =>
      this.dispatchEvent(
        new CustomEvent("value-change", {
          detail: this.#input!.value,
          bubbles: true,
          composed: true,
        }),
      );
    this.sync();
  }
  disconnectedCallback() {
    if (this.#input) this.#input.oninput = null;
  }
  attributeChangedCallback() {
    this.sync();
  }
  focus(options?: FocusOptions) {
    this.#input?.focus(options);
  }
  private sync() {
    const input = this.#input;
    if (!input) return;
    if (input.value !== this.#value) input.value = this.#value;
    input.id = this.#id;
    input.className = this.#class;
    input.placeholder = this.#hint;
    input.disabled = this.#disabled;
    input.readOnly = this.#readOnly;
    input.required = this.#required;
    input.setAttribute("aria-required", String(this.#required));
    for (const attr of NativeText.observedAttributes) {
      const value = this.getAttribute(attr);
      if (value === null) input.removeAttribute(attr);
      else input.setAttribute(attr, value);
    }
  }
}
customElements.define("builder-native-input", NativeText);
const field = registerElementField("acme.native", "builder-native-input", {
  title: "Native text",
  properties: {
    hint: stringProperty({ label: "Hint", default: "Native answer" }),
  },
});
recordBuilderEvents();
const query = new URLSearchParams(location.search),
  mount = document.getElementById("mount")!;
let definition: unknown = schema;
if (query.has("element")) {
  defineOurFormBuilderElement();
  const builder = document.createElement(
    "our-form-builder",
  ) as OurFormBuilderElement;
  if (query.has("shadow")) builder.setAttribute("shadow", "");
  builder.schema = definition;
  builder.fields = [field];
  builder.addEventListener("of-ready", () => {
    window.builderHost = builder.controller!;
    builder.controller?.preview?.setData(data);
  });
  builder.addEventListener("of-schema-change", (event) => {
    const detail = (event as CustomEvent<Window["builderChanges"][number]>)
      .detail;
    window.builderChanges.push(detail);
  });
  window.builderDetach = () => builder.remove();
  window.builderAttach = () => mount.append(builder);
  window.builderTheme = (theme) => {
    builder.theme = theme;
  };
  mount.append(builder);
} else {
  let root: HTMLElement;
  window.builderAttach = () => {
    root = document.createElement("div");
    mount.append(root);
    window.builderHost = renderBuilder(root, {
      schema: definition,
      data,
      fields: [field],
      onSchemaChange: (change) => {
        definition = change.definition;
        window.builderChanges.push(change);
      },
    });
  };
  window.builderDetach = () => {
    window.builderHost.destroy();
    root.remove();
  };
  window.builderTheme = (theme) => window.builderHost.setTheme(theme);
  window.builderAttach();
}
