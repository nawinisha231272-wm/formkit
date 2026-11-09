import type { UI } from "../types";
import { button, element } from "../types";
import { labelledInput } from "../primitives";

export interface QuickAddItem {
  type: string;
  title: string;
  uses: number;
}

export function mountQuickAdd(
  host: HTMLElement,
  ui: UI,
  options: {
    items: readonly QuickAddItem[];
    add(type: string): void;
    close(): void;
    origin: HTMLElement;
  },
) {
  host.removeAttribute("aria-busy");
  host.replaceChildren();
  const search = labelledInput(ui, ui.t("ofb.search"), "search");
  const input = search.input as HTMLInputElement;
  const items = element(ui.document, "div");
  const source = [...options.items].sort((a, b) => b.uses - a.uses);
  const draw = () => {
    items.replaceChildren();
    const query = input.value.trim().toLowerCase();
    const results = query
      ? source.filter((item) =>
          `${ui.t(item.title)} ${item.type}`.toLowerCase().includes(query),
        )
      : source.slice(0, 6);
    for (const item of results)
      items.append(
        button(ui, ui.t("ofb.addType", { title: ui.t(item.title) }), () => {
          options.close();
          options.add(item.type);
        }),
      );
    if (!results.length)
      items.append(element(ui.document, "p", ui.t("ofb.noMatches")));
  };
  input.addEventListener("input", draw, { signal: ui.signal });
  host.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        options.close();
        options.origin.focus();
      }
    },
    { signal: ui.signal },
  );
  host.append(search.wrapper, items);
  draw();
  input.focus();
}
