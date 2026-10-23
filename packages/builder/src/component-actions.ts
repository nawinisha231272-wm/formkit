import {
  DuplicateComponent,
  RemoveComponent,
  Unwrap,
  WrapInLayout,
} from "@ourform/builder-core";
import type { ComponentNode } from "@ourform/schema";
import type { ToolbarAction, UI } from "./types";
import { actionButton, disableAction, menu } from "./primitives";
import { element } from "./types";
import { icon } from "./icons";
import type { BuilderIcons } from "./icons";

type Action = ToolbarAction | "cut" | "wrap" | "unwrap" | "collapse";
interface Context {
  root: HTMLElement;
  ui: UI;
  icons?: BuilderIcons;
  copy(id: string): void;
  cut(id: string): void;
  paste(): void;
  move(node: ComponentNode): void;
  collapse(id: string): void;
}
const order: ToolbarAction[] = [
  "edit",
  "move",
  "duplicate",
  "copy",
  "paste",
  "json",
  "delete",
  "more",
];
const shortcuts: Partial<Record<Action, string>> = {
  edit: "Enter",
  move: "Space",
  duplicate: "Control+D Meta+D",
  copy: "Control+C Meta+C",
  paste: "Control+V Meta+V",
  json: "Control+Shift+J Meta+Shift+J",
  delete: "Delete",
  cut: "Control+X Meta+X",
  more: "Shift+F10",
};
/** Toolbar, context menu and keyboard routes execute the same command path. */
export class ComponentActions {
  #menu: HTMLElement | undefined;
  constructor(readonly context: Context) {
    const { root, ui } = context;
    root.addEventListener(
      "pointerdown",
      (event) => {
        if (this.#menu && !this.#menu.contains(event.target as Node))
          this.closeMenu();
      },
      { signal: ui.signal },
    );
  }
  label(action: Action) {
    return this.context.ui.t(
      action === "json" ? "ofb.editJson" : `ofb.${action}`,
    );
  }
  reason(action: Action, id: string): string | undefined {
    const { ui } = this.context,
      level = ui.builder.lockLevel(id);
    if (action === "json") return;
    if (level === "all")
      return ui.t(action === "move" ? "ofb.lock.move" : "ofb.lock.edit");
    if (level === "structure" && ["delete", "cut", "unwrap"].includes(action))
      return ui.t("ofb.lock.delete");
    return;
  }
  execute(action: Action, node: ComponentNode, anchor?: HTMLElement) {
    const { ui } = this.context;
    const reason = this.reason(action, node.id);
    if (reason) {
      ui.announce(reason);
      return;
    }
    if (ui.builder.lockLevel(node.id) !== "all") ui.builder.select(node.id);
    switch (action) {
      case "edit":
        ui.edit?.(node.id);
        break;
      case "json":
        ui.edit?.(node.id, true);
        break;
      case "move":
        this.context.move(node);
        break;
      case "duplicate":
        ui.dispatch(new DuplicateComponent(node.id));
        break;
      case "copy":
        this.context.copy(node.id);
        break;
      case "cut":
        this.context.cut(node.id);
        break;
      case "paste":
        this.context.paste();
        break;
      case "delete":
        ui.dispatch(new RemoveComponent(node.id));
        break;
      case "wrap":
        ui.dispatch(new WrapInLayout(node.id, "panel"));
        break;
      case "unwrap":
        ui.dispatch(new Unwrap(node.id));
        break;
      case "collapse":
        this.context.collapse(node.id);
        break;
      case "more":
        this.openMenu(node, anchor, true);
        break;
    }
  }
  toolbar(node: ComponentNode) {
    const { ui } = this.context;
    const toolbar = element(ui.document, "div", "", "ofb-component-toolbar");
    toolbar.setAttribute("role", "group");
    toolbar.setAttribute("aria-label", ui.t("ofb.toolbar"));
    toolbar.dataset.componentToolbar = node.id;
    const primitiveContext = {
      document: ui.document,
      signal: ui.signal,
      ...(this.context.icons ? { icons: this.context.icons } : {}),
    };
    for (const action of order.filter(
      (action) => ui.actions?.includes(action) ?? true,
    )) {
      const button = actionButton(
        primitiveContext,
        this.label(action),
        () => this.execute(action, node, button),
        {
          icon: action,
          iconOnly: true,
          ...(shortcuts[action] ? { shortcut: shortcuts[action] } : {}),
          ...(action === "delete" ? { variant: "danger" as const } : {}),
        },
      );
      button.dataset.ofbAction = action;
      disableAction(button, this.reason(action, node.id));
      toolbar.append(button);
    }
    if (ui.builder.lockLevel(node.id)) {
      const lock = element(ui.document, "span", "", "ofb-lock");
      lock.title = ui.t("ofb.lock");
      lock.setAttribute("role", "img");
      lock.setAttribute("aria-label", ui.t("ofb.lock"));
      lock.append(icon(ui.document, "lock", this.context.icons));
      toolbar.prepend(lock);
    }
    return toolbar;
  }
  openMenu(node: ComponentNode, anchor?: HTMLElement, more = false) {
    this.closeMenu();
    const { ui, root } = this.context;
    const actions: Action[] = more
      ? ["copy", "paste", "json", "cut", "wrap", "unwrap", "collapse"]
      : [
          ...order.filter((a) => a !== "more"),
          "cut",
          "wrap",
          "unwrap",
          "collapse",
        ];
    const close = () => {
      this.closeMenu();
      anchor?.focus();
    };
    const popup = menu(
      { document: ui.document, signal: ui.signal },
      ui.t("ofb.toolbar"),
      actions
        .filter(
          (a) =>
            !ui.actions ||
            !order.includes(a as ToolbarAction) ||
            ui.actions.includes(a as ToolbarAction),
        )
        .map((action) => ({
          label: this.label(action),
          action: () => this.execute(action, node, anchor),
          ...(this.reason(action, node.id)
            ? { reason: this.reason(action, node.id)! }
            : {}),
        })),
      close,
    );
    const bounds = (anchor ?? root).getBoundingClientRect(),
      outer = root.getBoundingClientRect();
    popup.style.insetInlineStart = `${Math.max(0, Math.min(bounds.left - outer.left, outer.width - 230))}px`;
    popup.style.insetBlockStart = `${bounds.bottom - outer.top + root.scrollTop}px`;
    root.append(popup);
    this.#menu = popup;
    popup.querySelector<HTMLElement>("button")?.focus();
  }
  closeMenu() {
    this.#menu?.remove();
    this.#menu = undefined;
  }
}
