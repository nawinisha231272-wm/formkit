import type { VNode, VNodeAttribute } from "@ourform/sdk";
interface Unit {
  el: Node;
  node: VNode | string;
  children: Unit[];
  listeners: Map<string, EventListener>;
  composing: boolean;
  pending: VNodeAttribute;
  cleanup: (() => void)[];
}
const keyOf = (node: VNode | string) =>
  typeof node === "string" ? undefined : node.props.key;
function attribute(
  unit: Unit,
  name: string,
  value: VNodeAttribute,
  previous: VNodeAttribute,
): void {
  const el = unit.el as HTMLElement;
  if (name === "key") return;
  if (name === "ref") {
    if (previous !== value) {
      if (typeof previous === "function")
        (previous as (v: HTMLElement | null) => void)(null);
      if (typeof value === "function")
        (value as (v: HTMLElement | null) => void)(el);
    }
    return;
  }
  if (name.startsWith("on")) {
    const event = name.slice(2).toLowerCase();
    if (typeof value === "function" && !unit.listeners.has(event)) {
      const listener: EventListener = (e) => {
        if (
          event === "input" &&
          (unit.composing || ("isComposing" in e && e.isComposing))
        )
          return;
        const handler =
          typeof unit.node === "string" ? undefined : unit.node.props[name];
        if (typeof handler === "function") (handler as (e: Event) => void)(e);
      };
      el.addEventListener(event, listener);
      unit.listeners.set(event, listener);
    }
    if (typeof value !== "function") {
      const listener = unit.listeners.get(event);
      if (listener) el.removeEventListener(event, listener);
      unit.listeners.delete(event);
    }
    return;
  }
  if (
    name === "value" &&
    (el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLSelectElement)
  ) {
    if (unit.composing) {
      unit.pending = value;
      return;
    }
    const next = String(value ?? "");
    if (el.value !== next) el.value = next;
    return;
  }
  if (
    ["disabled", "readOnly", "checked", "required", "multiple"].includes(name)
  ) {
    Reflect.set(el, name, Boolean(value));
    return;
  }
  if (
    value === null ||
    value === undefined ||
    (value === false && !name.startsWith("aria-"))
  )
    el.removeAttribute(name);
  else el.setAttribute(name, String(value));
}
function make(node: VNode | string): Unit {
  const el =
    typeof node === "string"
      ? document.createTextNode(node)
      : document.createElement(node.tag);
  const unit: Unit = {
    el,
    node,
    children: [],
    listeners: new Map(),
    composing: false,
    pending: undefined,
    cleanup: [],
  };
  if (typeof node === "string") return unit;
  for (const [name, value] of Object.entries(node.props))
    attribute(unit, name, value, undefined);
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const start = () => {
      unit.composing = true;
    };
    const end: EventListener = (e) => {
      unit.composing = false;
      const pending = unit.pending;
      unit.pending = undefined;
      const handler =
        typeof unit.node === "string" ? undefined : unit.node.props.oninput;
      if (typeof handler === "function") (handler as (e: Event) => void)(e);
      else if (pending !== undefined)
        attribute(unit, "value", pending, undefined);
    };
    el.addEventListener("compositionstart", start);
    el.addEventListener("compositionend", end);
    unit.cleanup.push(
      () => el.removeEventListener("compositionstart", start),
      () => el.removeEventListener("compositionend", end),
    );
  }
  unit.children = node.children.map(make);
  for (const child of unit.children) el.appendChild(child.el);
  if (el instanceof HTMLSelectElement)
    attribute(unit, "value", node.props.value, undefined);
  return unit;
}
function release(unit: Unit): void {
  for (const child of unit.children) release(child);
  for (const [event, listener] of unit.listeners)
    unit.el.removeEventListener(event, listener);
  unit.listeners.clear();
  unit.cleanup.forEach((cleanup) => cleanup());
  unit.cleanup = [];
  if (
    typeof unit.node !== "string" &&
    typeof unit.node.props.ref === "function"
  )
    (unit.node.props.ref as (v: null) => void)(null);
  unit.el.parentNode?.removeChild(unit.el);
}
function patch(unit: Unit, next: VNode | string): Unit {
  const old = unit.node;
  if (typeof old === "string" && typeof next === "string") {
    if (old !== next) unit.el.textContent = next;
    unit.node = next;
    return unit;
  }
  if (
    typeof old === "string" ||
    typeof next === "string" ||
    old.tag !== next.tag
  ) {
    if (
      unit.el === document.activeElement ||
      unit.el.contains(document.activeElement)
    )
      throw new Error("A portable control cannot replace a focused node.");
    const replacement = make(next);
    unit.el.parentNode?.replaceChild(replacement.el, unit.el);
    release(unit);
    return replacement;
  }
  unit.node = next;
  for (const name of new Set([
    ...Object.keys(old.props),
    ...Object.keys(next.props),
  ]))
    if (
      old.props[name] !== next.props[name] ||
      name === "value" ||
      name === "checked"
    )
      attribute(unit, name, next.props[name], old.props[name]);
  const keyed = new Map(
    unit.children
      .filter((c) => keyOf(c.node) !== undefined)
      .map((c) => [keyOf(c.node), c]),
  );
  const unkeyed = unit.children.filter((c) => keyOf(c.node) === undefined);
  let cursor = 0;
  const used = new Set<Unit>();
  const children = next.children.map((node) => {
    const key = keyOf(node);
    const existing = key === undefined ? unkeyed[cursor++] : keyed.get(key);
    if (!existing) return make(node);
    used.add(existing);
    return patch(existing, node);
  });
  for (const child of unit.children) if (!used.has(child)) release(child);
  const parent = unit.el as HTMLElement;
  const focused = document.activeElement;
  const selection =
    focused instanceof HTMLInputElement
      ? ([
          focused.selectionStart,
          focused.selectionEnd,
          focused.selectionDirection,
        ] as const)
      : null;
  for (let i = 0; i < children.length; i++)
    if (parent.childNodes[i] !== children[i]!.el)
      parent.insertBefore(children[i]!.el, parent.childNodes[i] ?? null);
  if (
    focused instanceof HTMLElement &&
    focused.isConnected &&
    parent.contains(focused) &&
    document.activeElement !== focused
  ) {
    focused.focus({ preventScroll: true });
    if (
      selection &&
      focused instanceof HTMLInputElement &&
      selection[0] !== null &&
      selection[1] !== null
    )
      focused.setSelectionRange(
        selection[0],
        selection[1],
        selection[2] ?? undefined,
      );
  }
  unit.children = children;
  if (unit.el instanceof HTMLSelectElement)
    attribute(unit, "value", next.props.value, undefined);
  return unit;
}
export function mountVNode(node: VNode): {
  readonly el: HTMLElement;
  update(node: VNode): void;
  destroy(): void;
} {
  let unit = make(node);
  let destroyed = false;
  return {
    get el() {
      return unit.el as HTMLElement;
    },
    update(next) {
      if (destroyed) throw new Error("Control is destroyed.");
      unit = patch(unit, next);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      release(unit);
    },
  };
}
