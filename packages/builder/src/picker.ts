import { element } from "./types";
import type { UI } from "./types";

/** Editable combobox: typing filters; only an explicit choice changes the definition. */
export function picker(
  ui: UI,
  label: string,
  choices: readonly { value: string; label: string }[],
  initial: string,
  change: (value: string) => void,
) {
  const host = element(ui.document, "label", label, "ofb-picker");
  const input = element(ui.document, "input");
  input.className = "ofb-primitive";
  input.dataset.ofbPrimitive = "Input";
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-label", label);
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.autocomplete = "off";
  const list = element(ui.document, "div", "", "ofb-picker-list");
  list.id = `ofb-picker-${globalThis.crypto.randomUUID()}`;
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", label);
  list.hidden = true;
  input.setAttribute("aria-controls", list.id);
  let value = initial,
    matches = [...choices],
    active = 0;
  const restore = () => {
    input.value = choices.find((c) => c.value === value)?.label ?? value;
  };
  const close = () => {
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  };
  const choose = (index: number) => {
    const selected = matches[index];
    if (!selected) return;
    value = selected.value;
    restore();
    close();
    change(value);
  };
  const draw = (filter = "") => {
    matches = choices.filter((c) =>
      c.label.toLowerCase().includes(filter.toLowerCase()),
    );
    active = Math.min(active, Math.max(0, matches.length - 1));
    list.replaceChildren();
    matches.forEach((choice, index) => {
      const item = element(ui.document, "div", choice.label);
      item.id = `${list.id}-${index}`;
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", String(index === active));
      item.onpointerdown = (event) => event.preventDefault();
      item.onclick = () => choose(index);
      list.append(item);
    });
    if (!matches.length) {
      const empty = element(ui.document, "div", ui.t("ofb.noMatches"));
      empty.setAttribute("role", "option");
      empty.setAttribute("aria-disabled", "true");
      list.append(empty);
    }
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    if (matches.length) {
      input.setAttribute("aria-activedescendant", `${list.id}-${active}`);
      list.children[active]?.scrollIntoView({ block: "nearest" });
    } else input.removeAttribute("aria-activedescendant");
  };
  input.onfocus = () => {
    active = Math.max(
      0,
      choices.findIndex((c) => c.value === value),
    );
    draw();
  };
  input.oninput = () => {
    active = 0;
    draw(input.value);
  };
  input.onblur = () => {
    close();
    restore();
  };
  input.onkeydown = (event) => {
    // Clear the virtual active descendant before native Tab chooses its next focus target.
    if (event.key === "Tab") {
      close();
      restore();
      return;
    }
    if (
      ["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(event.key) &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      if (event.key === "Escape" && list.hidden) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Escape") {
        close();
        restore();
      } else if (event.key === "Enter") {
        if (!list.hidden) choose(active);
      } else {
        if (list.hidden) draw();
        else {
          active =
            (active + (event.key === "ArrowDown" ? 1 : -1) + matches.length) %
            Math.max(1, matches.length);
          draw(
            input.value === choices.find((c) => c.value === value)?.label
              ? ""
              : input.value,
          );
        }
      }
    }
  };
  restore();
  host.append(input, list);
  return { element: host, input };
}
