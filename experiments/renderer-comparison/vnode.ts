export type Attr =
  | string
  | number
  | boolean
  | null
  | undefined
  | ((event: Event) => void);
export interface VNode {
  tag: string;
  props: Record<string, Attr>;
  children: (VNode | string)[];
}
export function h(
  tag: string,
  props: Record<string, Attr>,
  ...children: (VNode | string)[]
): VNode {
  return { tag, props, children };
}
function set(el: HTMLElement, name: string, value: Attr, previous: Attr): void {
  if (name === "key") return;
  if (name.startsWith("on")) {
    const event = name.slice(2);
    if (typeof previous === "function") el.removeEventListener(event, previous);
    if (typeof value === "function") el.addEventListener(event, value);
    return;
  }
  if (name === "value" && el instanceof HTMLInputElement) {
    if (el.value !== String(value ?? "")) el.value = String(value ?? "");
    return;
  }
  if (
    name === "disabled" &&
    (el instanceof HTMLButtonElement || el instanceof HTMLInputElement)
  ) {
    el.disabled = Boolean(value);
    return;
  }
  if (value === null || value === undefined || value === false)
    el.removeAttribute(name);
  else el.setAttribute(name, String(value));
}
interface Unit {
  el: Node;
  node: VNode | string;
  children: Unit[];
}
function make(node: VNode | string): Unit {
  if (typeof node === "string")
    return { el: document.createTextNode(node), node, children: [] };
  const el = document.createElement(node.tag);
  const unit: Unit = { el, node, children: node.children.map(make) };
  for (const [k, v] of Object.entries(node.props)) set(el, k, v, undefined);
  for (const c of unit.children) el.append(c.el);
  return unit;
}
function dispose(unit: Unit): void {
  for (const child of unit.children) dispose(child);
  if (typeof unit.node !== "string")
    for (const [k, v] of Object.entries(unit.node.props))
      if (k.startsWith("on")) set(unit.el as HTMLElement, k, undefined, v);
  unit.el.parentNode?.removeChild(unit.el);
}
function patch(unit: Unit, next: VNode | string): Unit {
  if (typeof next === "string" && typeof unit.node === "string") {
    if (next !== unit.node) unit.el.textContent = next;
    unit.node = next;
    return unit;
  }
  if (
    typeof next === "string" ||
    typeof unit.node === "string" ||
    next.tag !== unit.node.tag
  ) {
    const replacement = make(next);
    unit.el.parentNode?.replaceChild(replacement.el, unit.el);
    dispose(unit);
    return replacement;
  }
  const el = unit.el as HTMLElement;
  for (const key of new Set([
    ...Object.keys(unit.node.props),
    ...Object.keys(next.props),
  ]))
    if (next.props[key] !== unit.node.props[key])
      set(el, key, next.props[key], unit.node.props[key]);
  const keyed = new Map(
    unit.children
      .filter(
        (c) => typeof c.node !== "string" && c.node.props.key !== undefined,
      )
      .map((c) => [(c.node as VNode).props.key, c]),
  );
  const used = new Set<Unit>();
  const children = next.children.map((node, i) => {
    const key = typeof node === "string" ? undefined : node.props.key;
    const existing = key === undefined ? unit.children[i] : keyed.get(key);
    if (existing && !used.has(existing)) {
      used.add(existing);
      return patch(existing, node);
    }
    return make(node);
  });
  for (const old of unit.children) if (!used.has(old)) dispose(old);
  children.forEach((child, i) => {
    if (el.childNodes[i] !== child.el)
      el.insertBefore(child.el, el.childNodes[i] ?? null);
  });
  unit.children = children;
  unit.node = next;
  return unit;
}
export function mount(node: VNode) {
  let unit = make(node);
  return {
    get el() {
      return unit.el as HTMLElement;
    },
    update(next: VNode) {
      unit = patch(unit, next);
    },
    destroy() {
      dispose(unit);
    },
  };
}
const escape = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
export function ssr(node: VNode): string {
  const attrs = Object.entries(node.props)
    .filter(
      ([k, v]) =>
        k !== "key" && !k.startsWith("on") && v !== false && v != null,
    )
    .map(([k, v]) => ` ${k}="${escape(String(v))}"`)
    .join("");
  return `<${node.tag}${attrs}>${node.tag === "input" ? "" : node.children.map((c) => (typeof c === "string" ? escape(c) : ssr(c))).join("") + `</${node.tag}>`}`;
}
