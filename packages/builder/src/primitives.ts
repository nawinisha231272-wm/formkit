import type { BuilderPrimitive } from "@ourform/sdk";
import { icon } from "./icons";
import type { BuilderIcons, BuilderIconName } from "./icons";

export interface PrimitiveContext {
  document: Document;
  signal: AbortSignal;
  icons?: BuilderIcons;
}
export function primitive<K extends keyof HTMLElementTagNameMap>(
  context: PrimitiveContext,
  tag: K,
  name: BuilderPrimitive,
): HTMLElementTagNameMap[K] {
  const element = context.document.createElement(tag);
  element.dataset.ofbPrimitive = name;
  element.classList.add("ofb-primitive");
  return element;
}
export function tooltip(
  context: PrimitiveContext,
  target: HTMLElement,
  text: string,
): HTMLElement {
  const tip = primitive(context, "span", "Tooltip");
  tip.id = `ofb-tip-${globalThis.crypto.randomUUID()}`;
  tip.setAttribute("role", "tooltip");
  tip.textContent = text;
  tip.hidden = true;
  const show = () => {
    tip.hidden = false;
    target.setAttribute("aria-describedby", tip.id);
  };
  const hide = () => {
    tip.hidden = true;
    target.removeAttribute("aria-describedby");
  };
  target.addEventListener("mouseenter", show, { signal: context.signal });
  target.addEventListener("mouseleave", hide, { signal: context.signal });
  target.addEventListener("focus", show, { signal: context.signal });
  target.addEventListener("blur", hide, { signal: context.signal });
  target.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") hide();
    },
    { signal: context.signal },
  );
  target.append(tip);
  return tip;
}
export function actionButton(
  context: PrimitiveContext,
  label: string,
  action: () => void,
  options: {
    icon?: BuilderIconName;
    iconOnly?: boolean;
    variant?: "primary" | "danger" | "quiet";
    shortcut?: string;
  } = {},
): HTMLButtonElement {
  const button = primitive(
    context,
    "button",
    options.iconOnly ? "IconButton" : "Button",
  );
  button.type = "button";
  button.setAttribute("aria-label", label);
  if (options.variant) button.dataset.variant = options.variant;
  if (options.shortcut)
    button.setAttribute("aria-keyshortcuts", options.shortcut);
  if (options.icon)
    button.append(icon(context.document, options.icon, context.icons));
  if (!options.iconOnly) button.append(label);
  else
    tooltip(
      context,
      button,
      `${label}${options.shortcut ? ` (${options.shortcut})` : ""}`,
    );
  button.addEventListener(
    "click",
    (event) => {
      if (button.getAttribute("aria-disabled") === "true") {
        event.preventDefault();
        return;
      }
      action();
    },
    { signal: context.signal },
  );
  return button;
}
export function disableAction(
  button: HTMLButtonElement,
  reason: string | undefined,
): void {
  button.setAttribute("aria-disabled", String(!!reason));
  if (reason) button.title = reason;
  else button.removeAttribute("title");
  const tip = button.querySelector<HTMLElement>('[role="tooltip"]');
  if (tip) tip.textContent = reason ?? button.getAttribute("aria-label") ?? "";
}
export function labelledInput(
  context: PrimitiveContext,
  label: string,
  kind: "text" | "number" | "search" | "textarea" | "select" = "text",
) {
  const wrapper = context.document.createElement("label");
  wrapper.className = "ofb-field";
  const caption = context.document.createElement("span");
  caption.textContent = label;
  const input =
    kind === "select"
      ? primitive(context, "select", "Select")
      : kind === "textarea"
        ? primitive(context, "textarea", "Input")
        : primitive(context, "input", "Input");
  if (input.tagName === "INPUT") (input as HTMLInputElement).type = kind;
  wrapper.append(caption, input);
  return { wrapper, input };
}
export function toggle(
  context: PrimitiveContext,
  label: string,
  checked = false,
  kind: "Switch" | "Checkbox" = "Switch",
) {
  const wrapper = context.document.createElement("label");
  wrapper.className = "ofb-toggle";
  const input = primitive(context, "input", kind);
  input.type = "checkbox";
  input.checked = checked;
  if (kind === "Switch") input.setAttribute("role", "switch");
  wrapper.append(input, label);
  return { wrapper, input };
}
export function chip(
  context: PrimitiveContext,
  text: string,
  tone: "logic" | "info" | "success" | "danger" | "quiet" = "quiet",
) {
  const element = primitive(context, "span", "Chip");
  element.dataset.tone = tone;
  element.textContent = text;
  return element;
}
export interface TabItem {
  value: string;
  label: string;
  disabled?: boolean;
}
export function tabs(
  context: PrimitiveContext,
  label: string,
  items: readonly TabItem[],
  initial: string,
  change: (value: string) => void,
  segmented = false,
) {
  const list = primitive(
    context,
    "div",
    segmented ? "SegmentedControl" : "Tabs",
  );
  list.setAttribute("role", segmented ? "group" : "tablist");
  list.setAttribute("aria-label", label);
  let current = initial;
  const buttons = items.map((item) => {
    const button = actionButton(context, item.label, () => {
      set(item.value);
      change(item.value);
    });
    if (!segmented) button.setAttribute("role", "tab");
    button.dataset.tab = item.value;
    button.disabled = !!item.disabled;
    button.addEventListener(
      "keydown",
      (event) => {
        const available = buttons.filter((button) => !button.disabled);
        const index = available.indexOf(button);
        const target =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? available.length - 1
              : event.key === "ArrowRight"
                ? (index + 1) % available.length
                : event.key === "ArrowLeft"
                  ? (index + available.length - 1) % available.length
                  : undefined;
        if (target !== undefined && available[target]) {
          event.preventDefault();
          available[target]!.focus();
          available[target]!.click();
        }
      },
      { signal: context.signal },
    );
    list.append(button);
    return button;
  });
  function set(value: string) {
    if (!items.some((item) => item.value === value))
      throw new Error(`Unknown tab: ${value}`);
    current = value;
    for (const button of buttons) {
      const selected = button.dataset.tab === value;
      button.setAttribute(
        segmented ? "aria-pressed" : "aria-selected",
        String(selected),
      );
      button.tabIndex = selected ? 0 : -1;
    }
  }
  set(initial);
  return {
    element: list,
    buttons,
    set,
    get value() {
      return current;
    },
  };
}
/** Native modal semantics trap focus and inert the owning document; no global body portal. */
export function dialog(
  context: PrimitiveContext,
  label: string,
  cancel: () => void,
) {
  const element = primitive(context, "dialog", "Dialog");
  element.setAttribute("aria-label", label);
  element.addEventListener(
    "cancel",
    (event) => {
      event.preventDefault();
      cancel();
    },
    { signal: context.signal },
  );
  element.addEventListener(
    "click",
    (event) => {
      if (event.target !== element) return;
      const bounds = element.getBoundingClientRect();
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      )
        cancel();
    },
    { signal: context.signal },
  );
  let origin: HTMLElement | undefined;
  return {
    element,
    show() {
      const active = context.document.activeElement;
      origin =
        active && "focus" in active ? (active as HTMLElement) : undefined;
      element.showModal();
    },
    close() {
      element.close();
      if (origin?.isConnected) origin.focus({ preventScroll: true });
    },
  };
}
export function drawer(context: PrimitiveContext, label: string) {
  const element = primitive(context, "aside", "Drawer");
  element.setAttribute("role", "complementary");
  element.setAttribute("aria-label", label);
  return element;
}
export function menu(
  context: PrimitiveContext,
  label: string,
  items: readonly { label: string; action: () => void; reason?: string }[],
  close: () => void,
) {
  const element = primitive(context, "div", "Menu");
  element.setAttribute("role", "menu");
  element.setAttribute("aria-label", label);
  const buttons = items.map((item, index) => {
    const button = actionButton(context, item.label, () => {
      close();
      item.action();
    });
    button.setAttribute("role", "menuitem");
    button.tabIndex = index === 0 ? 0 : -1;
    disableAction(button, item.reason);
    element.append(button);
    return button;
  });
  element.addEventListener(
    "keydown",
    (event) => {
      const index = buttons.indexOf(
        context.document.activeElement as HTMLButtonElement,
      );
      const target =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? buttons.length - 1
            : event.key === "ArrowDown"
              ? (index + 1) % buttons.length
              : event.key === "ArrowUp"
                ? (index + buttons.length - 1) % buttons.length
                : undefined;
      if (target !== undefined) {
        event.preventDefault();
        buttons[target]?.focus();
      }
      if (event.key === "Escape" || event.key === "Tab") {
        event.preventDefault();
        close();
      }
    },
    { signal: context.signal },
  );
  return element;
}
export function tree(context: PrimitiveContext, label: string) {
  const element = primitive(context, "ul", "Tree");
  element.setAttribute("role", "tree");
  element.setAttribute("aria-label", label);
  return element;
}
export function toast(context: PrimitiveContext, message: string) {
  const element = primitive(context, "div", "Toast");
  // Announcements are owned by the builder's single polite live region.
  element.textContent = message;
  return element;
}
