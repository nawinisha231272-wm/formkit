import { defineDisplay, h, stringProperty } from "@ourform/sdk";
import type { VNode, VNodeChild } from "@ourform/sdk";
const allowed = new Set([
  "p",
  "strong",
  "em",
  "b",
  "i",
  "ul",
  "ol",
  "li",
  "br",
  "a",
  "code",
  "pre",
  "span",
]);
const blocked = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "svg",
  "math",
  "template",
]);
function decode(text: string): string {
  const entities: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: "\u00a0",
    colon: ":",
    tab: "\t",
    newline: "\n",
  };
  return text.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);?/gi,
    (whole, entity: string) => {
      if (!entity.startsWith("#"))
        return entities[entity.toLowerCase()] ?? whole;
      const code =
        entity[1]?.toLowerCase() === "x"
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
      return code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : "\ufffd";
    },
  );
}
/** Supported HTML subset → safe VNodes. Never hands source HTML to a browser HTML sink. */
export function sanitizeContent(source: string): VNode {
  type Frame = {
    tag: string;
    attrs: Record<string, string>;
    children: VNodeChild[];
  };
  const stack: Frame[] = [{ tag: "div", attrs: {}, children: [] }];
  const suppress: string[] = [];
  for (const token of source
    .slice(0, 100000)
    .matchAll(/<!--[\s\S]*?(?:-->|$)|<[^>]*(?:>|$)|[^<]+|</g)) {
    const text = token[0];
    if (text.startsWith("<!--")) continue;
    const tag = /^<\s*(\/?)\s*([a-z][\w:-]*)\b([^>]*?)(?:>|$)/i.exec(text);
    if (!tag) {
      if (!suppress.length) stack.at(-1)!.children.push(decode(text));
      continue;
    }
    const name = tag[2]!.toLowerCase();
    const closing = !!tag[1];
    if (suppress.length) {
      if (closing && name === suppress.at(-1)) suppress.pop();
      else if (!closing && blocked.has(name)) suppress.push(name);
      continue;
    }
    if (blocked.has(name)) {
      if (!closing && !/\/\s*>$/.test(text) && name !== "embed")
        suppress.push(name);
      continue;
    }
    if (!allowed.has(name)) continue;
    if (closing) {
      const index = stack.map((frame) => frame.tag).lastIndexOf(name);
      if (index <= 0) continue;
      while (stack.length > index) {
        const frame = stack.pop()!;
        stack.at(-1)!.children.push(h(frame.tag, frame.attrs, frame.children));
      }
      continue;
    }
    const attrs: Record<string, string> = {};
    if (name === "a") {
      for (const match of tag[3]!.matchAll(
        /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g,
      )) {
        const key = match[1]!.toLowerCase();
        const value = decode(match[2] ?? match[3] ?? match[4] ?? "").trim();
        if (
          key === "href" &&
          /^(?:https?:|mailto:|tel:)/i.test(value) &&
          !Array.from(value).some((character) => {
            const code = character.charCodeAt(0);
            return code < 32 || code === 127;
          })
        )
          attrs.href = value;
        if (key === "title") attrs.title = value;
      }
      if (attrs.href) attrs.rel = "noopener noreferrer";
    }
    if (name === "br") stack.at(-1)!.children.push(h("br", null));
    else if (stack.length < 64) stack.push({ tag: name, attrs, children: [] });
  }
  while (stack.length > 1) {
    const frame = stack.pop()!;
    stack.at(-1)!.children.push(h(frame.tag, frame.attrs, frame.children));
  }
  return h("div", null, stack[0]!.children);
}
export const contentField = defineDisplay({
  type: "content",
  title: "Content",
  properties: {
    html: stringProperty({ label: "of.content.html", default: "" }),
  },
  control: (p) => sanitizeContent(p.config.html),
});
