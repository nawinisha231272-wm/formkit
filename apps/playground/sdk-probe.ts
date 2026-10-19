import { bootstrap5Theme } from "@ourform/theme-bootstrap5";
import { tailwindTheme } from "@ourform/theme-tailwind";
import "@angular/compiler";
import {
  Component,
  ElementRef,
  inject,
  createComponent,
  provideZonelessChangeDetection,
} from "@angular/core";
import { createApplication } from "@angular/platform-browser";
import { createElement, useLayoutEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { createEngine } from "@ourform/core";
import {
  textField,
  numberField,
  checkboxField,
  ratingField,
} from "@ourform/components";
import { mount, mountVNode } from "@ourform/renderer-dom";
import { h, defaultMessage, type FieldControlProps } from "@ourform/sdk";
const e = createEngine()
  .register(textField.model)
  .register(numberField.model)
  .register(checkboxField.model)
  .register(ratingField.model);
const result = e.compile({
  $formVersion: "1.0",
  id: "probe",
  display: "form",
  components: [
    {
      id: "name",
      type: "text",
      key: "name",
      label: "Name",
      description: "Your name",
      defaultValue: "abc",
    },
    { id: "age", type: "number", key: "age", label: "Age" },
    { id: "accept", type: "checkbox", key: "accept", label: "Accept" },
    {
      id: "rating",
      type: "rating",
      key: "rating",
      label: "Rating",
      properties: { max: 5, allowHalf: true },
      validation: { required: true },
    },
  ],
});
if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
const session = e.createSession(result.form);
let validationCalls = 0;
const original = session.validate.bind(session);
session.validate = (options) => {
  validationCalls++;
  return original(options);
};
const views = new Map([
  [textField.model.type, textField.views],
  [numberField.model.type, numberField.views],
  [checkboxField.model.type, checkboxField.views],
  [ratingField.model.type, ratingField.views],
]);
const view = mount(document.querySelector("#form")!, session, {
  engine: e,
  views,
  themes: [bootstrap5Theme, tailwindTheme],
  idPrefix: "",
});
export const sdk = {
  session,
  view,
  get validationCalls() {
    return validationCalls;
  },
};
function props(
  value = "before",
  setValue: (v: unknown) => void = () => {},
): FieldControlProps<unknown, Record<string, unknown>> {
  return {
    value,
    setValue,
    onBlur: () => {},
    config: {},
    state: {
      disabled: false,
      readOnly: false,
      invalid: false,
      pending: false,
      required: false,
    },
    a11y: { id: "host_input", name: "host", labelledBy: "host_label" },
    focusRef: () => {},
    theme: { classFor: () => "" },
    t: defaultMessage,
  };
}
function portable(p: FieldControlProps<unknown, Record<string, unknown>>) {
  const unit = mountVNode(textField.views.portable(p));
  return {
    ...unit,
    updateProps: (next: typeof p) =>
      unit.update(textField.views.portable(next)),
  };
}
type P = ReturnType<typeof props>;
function PortableHost({ p }: { p: P }) {
  const ref = useRef<HTMLDivElement>(null);
  const unit = useRef<ReturnType<typeof portable> | null>(null);
  useLayoutEffect(() => {
    unit.current = portable(p);
    ref.current!.append(unit.current.el);
    return () => unit.current!.destroy();
  }, []);
  useLayoutEffect(() => unit.current?.updateProps(p), [p]);
  return createElement("div", { ref });
}
class AngularHost {
  host = inject<ElementRef<HTMLElement>>(ElementRef);
  p = props();
  unit: ReturnType<typeof portable> | null = null;
  ngAfterViewInit() {
    this.unit = portable(this.p);
    this.host.nativeElement.append(this.unit.el);
  }
  ngOnDestroy() {
    this.unit?.destroy();
  }
}
Component({ selector: "m02-host", standalone: true, template: "" })(
  AngularHost,
);
export async function runHosts() {
  let changes = 0;
  const p = props("before", () => changes++);
  const root = document.querySelector("#hosts")!;
  const reactEl = document.createElement("div");
  root.append(reactEl);
  const reactRoot = createRoot(reactEl);
  flushSync(() => reactRoot.render(createElement(PortableHost, { p })));
  const reactInput = reactEl.querySelector("input")!;
  flushSync(() =>
    reactRoot.render(
      createElement(PortableHost, { p: { ...p, value: "after" } }),
    ),
  );
  const sameReactInput = reactInput === reactEl.querySelector("input");
  reactInput.dispatchEvent(new Event("input", { bubbles: true }));
  const reactValue = reactInput.value;
  reactRoot.unmount();
  const reactRemoved = !reactEl.querySelector("input");
  reactInput.dispatchEvent(new Event("input"));
  reactEl.remove();
  const app = await createApplication({
    providers: [provideZonelessChangeDetection()],
  });
  const angularEl = document.createElement("div");
  root.append(angularEl);
  const ref = createComponent(AngularHost, {
    hostElement: angularEl,
    environmentInjector: app.injector,
  });
  ref.instance.p = p;
  app.attachView(ref.hostView);
  ref.changeDetectorRef.detectChanges();
  const angularInput = angularEl.querySelector("input")!;
  ref.instance.unit!.updateProps({ ...p, value: "after" });
  const sameAngularInput = angularInput === angularEl.querySelector("input");
  angularInput.dispatchEvent(new Event("input", { bubbles: true }));
  const angularValue = angularInput.value;
  ref.destroy();
  app.destroy();
  const angularRemoved = !angularEl.querySelector("input");
  angularInput.dispatchEvent(new Event("input"));
  angularEl.remove();
  return {
    sameReactInput,
    sameAngularInput,
    reactValue,
    angularValue,
    reactRemoved,
    angularRemoved,
    changes,
  };
}
export function runLifecycle() {
  const root = document.querySelector("#lifecycle")!;
  let count = 0;
  const refs: (HTMLElement | null)[] = [];
  const unit = mountVNode(
    h(
      "button",
      {
        onclick: () => count++,
        ref: (el: HTMLElement | null) => refs.push(el),
      },
      "first",
    ),
  );
  root.append(unit.el);
  const button = unit.el;
  button.click();
  unit.update(
    h(
      "button",
      {
        onclick: () => (count += 2),
        ref: (el: HTMLElement | null) => refs.push(el),
      },
      "second",
    ),
  );
  button.click();
  const stable = unit.el === button && button.textContent === "second";
  unit.update(h("button", {}, "third"));
  button.click();
  unit.destroy();
  unit.destroy();
  button.click();
  let destroyedThrows = false;
  try {
    unit.update(h("button", {}));
  } catch {
    destroyedThrows = true;
  }
  const tree = mountVNode(
    h(
      "div",
      {},
      h("input", { key: "a", value: "abc" }),
      h("input", { key: "b", value: "def" }),
    ),
  );
  root.append(tree.el);
  const focused = tree.el.querySelectorAll("input")[1]!;
  focused.focus();
  focused.setSelectionRange(1, 2);
  tree.update(
    h(
      "div",
      {},
      h("input", { key: "b", value: "def" }),
      h("input", { key: "a", value: "abc" }),
    ),
  );
  const keyed = tree.el.querySelector("input") === focused;
  const caret =
    document.activeElement === focused &&
    focused.selectionStart === 1 &&
    focused.selectionEnd === 2;
  let replacementThrows = false;
  try {
    tree.update(h("span", {}));
  } catch {
    replacementThrows = true;
  }
  tree.destroy();
  return {
    count,
    stable,
    refsCleared: refs.at(-1) === null,
    destroyedThrows,
    keyed,
    caret,
    replacementThrows,
    empty: root.children.length === 0,
  };
}
declare global {
  interface Window {
    sdk: typeof sdk;
    runHosts: typeof runHosts;
    runLifecycle: typeof runLifecycle;
  }
}
window.sdk = sdk;
window.runHosts = runHosts;
window.runLifecycle = runLifecycle;
