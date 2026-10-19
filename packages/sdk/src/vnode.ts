export type VNodeAttribute =
  | string
  | number
  | boolean
  | null
  | undefined
  | ((event: Event) => void)
  | ((element: HTMLElement | null) => void);
export interface VNode {
  readonly tag: string;
  readonly props: Readonly<Record<string, VNodeAttribute>>;
  readonly children: readonly (VNode | string)[];
}
export type VNodeChild =
  | VNode
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly VNodeChild[];
export type VNodeProps = Record<string, VNodeAttribute>;
const forbidden = new Set([
  "innerhtml",
  "outerhtml",
  "textcontent",
  "srcdoc",
  "__proto__",
  "constructor",
  "prototype",
]);
export function h(
  tag: string,
  props: VNodeProps | null,
  ...children: VNodeChild[]
): VNode {
  if (
    !/^[a-z][a-z0-9-]*$/.test(tag) ||
    ["script", "style", "iframe", "object", "embed"].includes(tag)
  )
    throw new Error(`Invalid portable tag: ${tag}`);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (key.toLowerCase().startsWith("on") && key !== key.toLowerCase())
      throw new Error("Use lowercase event props.");
    if (!/^[a-zA-Z_:][\w:.-]*$/.test(key) || forbidden.has(key.toLowerCase()))
      throw new Error(`Unsafe attribute: ${key}`);
    if (typeof value === "function" && key !== "ref" && !key.startsWith("on"))
      throw new Error("Functions belong only in refs or event props.");
    if (key === "ref" && value != null && typeof value !== "function")
      throw new Error("Ref must be a callback.");
    if (
      key === "key" &&
      value != null &&
      typeof value !== "string" &&
      typeof value !== "number"
    )
      throw new Error("VNode keys must be strings or numbers.");
    if (key.startsWith("on") && value != null && typeof value !== "function")
      throw new Error("Event attributes require host functions.");
    if (
      ["href", "src", "action", "formaction"].includes(key.toLowerCase()) &&
      typeof value === "string" &&
      !/^(https?:|mailto:|tel:|\/|#|\.|[^:\s]+$)/i.test(value.trim())
    )
      throw new Error("Unsupported URL protocol.");
  }
  const flat: (VNode | string)[] = [];
  const append = (value: VNodeChild): void => {
    if (Array.isArray(value)) {
      value.forEach(append);
      return;
    }
    if (value === null || value === undefined || typeof value === "boolean")
      return;
    flat.push(
      typeof value === "number" ? String(value) : (value as VNode | string),
    );
  };
  children.forEach(append);
  const keys = new Set<VNodeAttribute>();
  for (const child of flat)
    if (typeof child !== "string" && child.props.key !== undefined) {
      if (keys.has(child.props.key)) throw new Error("Duplicate VNode key.");
      keys.add(child.props.key);
    }
  return Object.freeze({
    tag,
    props: Object.freeze({ ...props }),
    children: Object.freeze(flat),
  });
}
export function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
const voidTags = new Set([
  "input",
  "br",
  "hr",
  "img",
  "area",
  "base",
  "col",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);
export function renderVNodeToString(node: VNode | string): string {
  if (typeof node === "string") return escapeHtml(node);
  const attributes = Object.entries(node.props)
    .filter(
      ([key, value]) =>
        !["key", "ref"].includes(key) &&
        !key.toLowerCase().startsWith("on") &&
        value !== null &&
        value !== undefined &&
        (value !== false || key.startsWith("aria-")),
    )
    .map(
      ([key, value]) =>
        ` ${key === "readOnly" ? "readonly" : key}="${escapeHtml(value)}"`,
    )
    .join("");
  return `<${node.tag}${attributes}>${voidTags.has(node.tag) ? "" : node.children.map(renderVNodeToString).join("") + `</${node.tag}>`}`;
}
