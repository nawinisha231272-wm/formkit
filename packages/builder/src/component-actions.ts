import { DuplicateComponent, RemoveComponent, Unwrap } from "@ourform/builder-core";
import type { DropTarget } from "@ourform/builder-core";
import type { ComponentNode } from "@ourform/schema";
import type { ToolbarAction, UI } from "./types";
import { actionButton, disableAction } from "./primitives";
import { element } from "./types";
import { icon } from "./icons";
import type { BuilderIcons } from "./icons";
import { mountActionMenu } from "./features/secondary-tools";

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
  entries(): readonly ComponentNode[];
  slots(node: ComponentNode): readonly import("@ourform/sdk").ComponentSlot[];
  caption(slot: import("@ourform/sdk").ComponentSlot): string;
  target(): DropTarget;
  choose(target: DropTarget): void;
  wrap(id: string, type: string): void;
}
const order: ToolbarAction[] = [
  "edit",
  "move",
  "duplicate",
  "delete",
  "more",
];
const shortcuts: Partial<Record<Action, string>> = {
  edit: "Enter",
  move: "Space",
  duplicate: "Control+D Meta+D",
  delete: "Delete",
  more: "Shift+F10",
};
/** Toolbar, context menu and keyboard routes execute the same command path. */
export class ComponentActions {
  #menu: HTMLElement | undefined;
  constructor(readonly _ofbContext: Context) {
    const { root, ui } = _ofbContext;
    root.addEventListener(
      "pointerdown",
      (event) => {
        if (this.#menu && !this.#menu.contains(event.target as Node))
          this._ofbCloseMenu();
      },
      { signal: ui.signal },
    );
  }
  _ofbLabel(action: Action) {
    return this._ofbContext.ui.t(
      action === "json" ? "ofb.editJson" : `ofb.${action}`,
    );
  }
  _ofbReason(action: Action, id: string): string | undefined {
    const { ui } = this._ofbContext,
      level = ui.builder.lockLevel(id);
    if (action === "json") return;
    if (level === "all")
      return ui.t(action === "move" ? "ofb.lock.move" : "ofb.lock.edit");
    if (level === "structure" && ["delete", "cut", "unwrap"].includes(action))
      return ui.t("ofb.lock.delete");
    return;
  }
  _ofbExecute(action: Action, node: ComponentNode, anchor?: HTMLElement) {
    const { ui } = this._ofbContext;
    const reason = this._ofbReason(action, node.id);
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
        this._ofbContext.move(node);
        break;
      case "duplicate":
        ui.dispatch(new DuplicateComponent(node.id));
        break;
      case "copy":
        this._ofbContext.copy(node.id);
        break;
      case "cut":
        this._ofbContext.cut(node.id);
        break;
      case "paste":
        this._ofbContext.paste();
        break;
      case "delete":
        ui.dispatch(new RemoveComponent(node.id));
        break;
      case "wrap":
        this._ofbContext.wrap(node.id, "panel");
        break;
      case "unwrap":
        ui.dispatch(new Unwrap(node.id));
        break;
      case "collapse":
        this._ofbContext.collapse(node.id);
        break;
      case "more":
        this._ofbOpenMenu(node, anchor, true);
        break;
    }
  }
  _ofbToolbar(node: ComponentNode) {
    const { ui } = this._ofbContext;
    const toolbar = element(ui.document, "div", "", "ofb-component-toolbar");
    toolbar.setAttribute("role", "group");
    toolbar.setAttribute("aria-label", ui.t("ofb.toolbar"));
    toolbar.dataset.componentToolbar = node.id;
    const primitiveContext = ui;
    for (const action of order.filter(
      (action) => ui.actions?.includes(action) ?? true,
    )) {
      const button = actionButton(
        primitiveContext,
        this._ofbLabel(action),
        () => this._ofbExecute(action, node, button),
        {
          icon: action,
          iconOnly: true,
          ...(shortcuts[action] ? { shortcut: shortcuts[action] } : {}),
          ...(action === "delete" ? { variant: "danger" as const } : {}),
        },
      );
      button.dataset.ofbAction = action;
      disableAction(button, this._ofbReason(action, node.id));
      toolbar.append(button);
    }
    if (ui.builder.lockLevel(node.id)) {
      const lock = element(ui.document, "span", "", "ofb-lock");
      lock.title = ui.t("ofb.lock");
      lock.setAttribute("role", "img");
      lock.setAttribute("aria-label", ui.t("ofb.lock"));
      lock.append(icon(ui.document, "lock", this._ofbContext.icons));
      toolbar.prepend(lock);
    }
    return toolbar;
  }
  _ofbOpenMenu(node: ComponentNode, anchor?: HTMLElement, more = false) {
    this._ofbCloseMenu();
    const { ui, root } = this._ofbContext;
    const close = () => {
      this._ofbCloseMenu();
      anchor?.focus();
    };
    const popup = element(ui.document, "div", "", "ofb-action-menu");
    const bounds = (anchor ?? root).getBoundingClientRect(),
      outer = root.getBoundingClientRect();
    root.append(popup);
    ui._ofbStyle(
      popup,
      "inset-inline-start",
      `${Math.max(0, Math.min(bounds.left - outer.left, outer.width - 230))}px`,
      "inset-block-start",
      `${bounds.bottom - outer.top + root.scrollTop}px`,
    );
    this.#menu = popup;
    mountActionMenu(popup, ui, {
      more,
      ...(ui.actions ? { enabled: ui.actions } : {}),
      label: (action) => this._ofbLabel(action as Action),
      reason: (action) => this._ofbReason(action as Action, node.id),
      execute: (action) => this._ofbExecute(action as Action, node, anchor),
      close,
      entries: this._ofbContext.entries,
      slots: this._ofbContext.slots,
      caption: this._ofbContext.caption,
      target: this._ofbContext.target,
      choose: this._ofbContext.choose,
      wrap: (type) => this._ofbContext.wrap(node.id, type),
      actionButton,
      disableAction,
    });
  }
  _ofbCloseMenu() {
    this.#menu?.remove();
    this.#menu = undefined;
  }
}
