import type { Diagnostic } from "@ourform/schema";
import type { ComponentNode } from "@ourform/schema";
import type { ComponentSlot } from "@ourform/sdk";
import type { UI } from "../types";

type Action = string;
const labels: Readonly<Record<string, string>> = {
  copy: "Copy",
  paste: "Paste",
  cut: "Cut",
  wrap: "Wrap in layout",
  unwrap: "Unwrap",
  collapse: "Collapse or expand",
};
interface ActionMenuOptions {
  more: boolean;
  enabled?: readonly string[];
  label(action: Action): string;
  reason(action: Action): string | undefined;
  execute(action: Action): void;
  close(): void;
  entries(): readonly ComponentNode[];
  slots(node: ComponentNode): readonly ComponentSlot[];
  caption(slot: ComponentSlot): string;
  target(): import("@ourform/builder-core").DropTarget;
  choose(target: import("@ourform/builder-core").DropTarget): void;
  wrap(type: string): void;
  actionButton: typeof import("../primitives").actionButton;
  disableAction: typeof import("../primitives").disableAction;
}

export function mountActionMenu(
  host: HTMLElement,
  ui: UI,
  options: ActionMenuOptions,
): void {
  host.replaceChildren();
  host.removeAttribute("aria-busy");
  host.setAttribute("role", options.more ? "dialog" : "menu");
  host.setAttribute("aria-label", ui.t("ofb.toolbar"));
  const context = ui;
  if (options.more) {
    const selected = options.target();
    const destinations: {
      target: import("@ourform/builder-core").DropTarget;
      label: string;
    }[] = [
      { target: {}, label: ui.t("of.builder.formRoot") },
      ...options.entries().flatMap((node) =>
        options.slots(node).map((slot) => ({
          target: { parentId: node.id, slot: slot.name },
          label: `${node.label?.trim() || ui.t(ui.engine.getField(node.type)?.builder?.title ?? ui.engine.getField(node.type)?.title ?? node.type)} / ${options.caption(slot)}`,
        })),
      ),
    ];
    const destination = ui.document.createElement("select");
    destination.setAttribute("aria-label", ui.t("of.builder.insertInto"));
    destinations.forEach((item, index) => {
      const matches =
        item.target.parentId === selected.parentId &&
        item.target.slot === selected.slot;
      const option = ui.document.createElement("option");
      option.text = item.label;
      option.value = String(index);
      option.defaultSelected = matches;
      option.selected = matches;
      destination.append(option);
    });
    destination.onchange = () =>
      options.choose(destinations[Number(destination.value)]!.target);
    const layout = ui.document.createElement("select");
    layout.setAttribute("aria-label", ui.t("of.builder.wrapType"));
    for (const model of ui.engine
      .listFields()
      .filter((field) => field.kind === "layout")) {
      const option = ui.document.createElement("option");
      option.text = ui.t(model.builder?.title ?? model.title);
      option.value = model.type;
      layout.append(option);
    }
    host.append(
      destination,
      layout,
      options.actionButton(context, ui.t("of.builder.wrap"), () => {
        options.close();
        options.wrap(layout.value);
      }),
    );
  }
  const primary = ["edit", "move", "duplicate", "delete"];
  const actions = (
    options.more
      ? ["copy", "paste", "json", "cut", "unwrap", "collapse"]
      : [
          ...primary,
          "copy",
          "paste",
          "json",
          "cut",
          "wrap",
          "unwrap",
          "collapse",
        ]
  ).filter(
    (action) =>
      ![...primary, "copy", "paste", "json"].includes(action) ||
      !options.enabled ||
      options.enabled.includes(action),
  );
  const buttons = actions.map((action, index) => {
    const translated = options.label(action);
    const button = options.actionButton(
      context,
      translated === `ofb.${action}` ? labels[action]! : translated,
      () => {
        options.close();
        options.execute(action);
      },
    );
    if (!options.more) button.setAttribute("role", "menuitem");
    button.tabIndex = index === 0 ? 0 : -1;
    options.disableAction(button, options.reason(action));
    host.append(button);
    return button;
  });
  host.addEventListener(
    "keydown",
    (event) => {
      const index = buttons.indexOf(
        ui.document.activeElement as HTMLButtonElement,
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
        options.close();
      }
    },
    { signal: ui.signal },
  );
  buttons[0]?.focus();
}

export function mountIssues(
  host: HTMLElement,
  ui: UI,
  initial: readonly Diagnostic[],
  showOutline: () => void,
  tools: {
    actionButton: typeof import("../primitives").actionButton;
    element: typeof import("../types").element;
  },
) {
  ui._ofbStyle(host, "display", "grid", "gap", "8px");
  const context = ui;
  function update(diagnostics: readonly Diagnostic[]) {
    host.replaceChildren();
    for (const diagnostic of diagnostics) {
      const button = tools.actionButton(context, diagnostic.message, () => {
        if (diagnostic.componentId) {
          ui.builder.select(diagnostic.componentId);
          ui.reveal?.(diagnostic.componentId);
          showOutline();
        }
      });
      ui._ofbStyle(button, "white-space", "normal", "text-align", "start");
      host.append(button);
    }
    if (!diagnostics.length)
      host.append(tools.element(ui.document, "p", ui.t("ofb.noIssues")));
  }
  update(initial);
  return { update };
}
