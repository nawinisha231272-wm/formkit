import { componentChildren, childSlot } from "@ourform/schema";
import {
  AddComponent,
  MoveComponent,
  PasteComponent,
} from "@ourform/builder-core";
import type { DropTarget } from "@ourform/builder-core";
import type {
  ComponentNode,
  Diagnostic,
  FormDefinition,
} from "@ourform/schema";
import { resolveSlots } from "@ourform/sdk";
import { button, element } from "./types";
import type { UI } from "./types";
import { PointerDrag } from "./pointer";
import { ComponentActions } from "./component-actions";
import { icon, isIconName } from "./icons";
import { paletteGroups } from "./palette";
import { describeExpression, controlledFields } from "./signals";
import { chip, labelledInput } from "./primitives";
type Entry = { node: ComponentNode; parent?: ComponentNode };
const attribute = (element: HTMLElement, name: string, value: string) => {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
};
export class Canvas {
  target: DropTarget = {};
  cutId: string | undefined;
  clipboard: ComponentNode | undefined;
  readonly actions: ComponentActions;
  #toolbars = new Map<string, HTMLElement>();
  #mini: HTMLElement | undefined;
  #uses = new Map<string, number>();
  #unsubscribe: () => void;
  readonly pointer: PointerDrag;
  #targets = new Map<HTMLElement, DropTarget>();
  #items = new Map<string, HTMLElement>();
  #slotItems = new Map<string, HTMLElement>();
  #slotSelection: string | undefined;
  #outlineDefinition: FormDefinition | undefined;
  #outlineExpansion = "";
  #handles = new Map<string, HTMLElement>();
  #roots = new Map<string, HTMLElement>();
  #collapsed = new Set<string>();
  #collapsedSlots = new Set<string>();
  #visible: Entry[] = [];
  #selectedLocation = "";
  #choices: DropTarget[] = [];
  #typeAhead = "";
  #lastKey = 0;
  constructor(
    readonly root: HTMLElement,
    readonly host: HTMLElement,
    readonly palette: HTMLElement,
    readonly outline: HTMLElement,
    readonly picker: HTMLSelectElement,
    readonly ui: UI,
    readonly onLocalChange: () => void,
  ) {
    root.addEventListener("click", this.click);
    root.addEventListener("keydown", this.keydown);
    picker.addEventListener("change", this.pick);
    for (const group of paletteGroups(ui)) {
      palette.append(element(ui.document, "h3", group.label));
      for (const item of group.components) {
        const add = button(ui, ui.t(item.title), () => {});
        add.dataset.type = item.type;
        add.dataset.componentType = item.type;
        add.setAttribute(
          "aria-label",
          ui.t("of.builder.addType", { title: ui.t(item.title) }),
        );
        // Preserve the familiar visible palette names while making purpose explicit to AT.
        add.textContent = ui.t(item.title);
        const iconName = item.icon ?? item.type;
        add.prepend(
          icon(
            ui.document,
            isIconName(iconName)
              ? iconName
              : ui.engine.getField(item.type)?.kind === "layout"
                ? "panel"
                : "text",
            ui.icons,
          ),
        );
        palette.append(add);
      }
    }
    this.#unsubscribe = ui.builder.subscribe((state, patch) => {
      const last = state.history.past.at(-1);
      if (patch.length && last instanceof AddComponent)
        this.#uses.set(
          last.componentType,
          (this.#uses.get(last.componentType) ?? 0) + 1,
        );
    });
    root.addEventListener(
      "pointerdown",
      (event) => {
        if (this.#mini && !this.#mini.contains(event.target as Node))
          this.closeMini();
      },
      { signal: ui.signal },
    );
    this.host.setAttribute("role", "application");
    this.host.setAttribute("aria-label", ui.t("ofb.canvas"));
    this.pointer = new PointerDrag({
      root,
      host,
      palette,
      outline,
      scroll: host.parentElement!,
      ui,
      entries: () => this.entries(),
      slots: (node) => this.slots(node),
      caption: (slot) => this.caption(slot),
      children: (parent, slot) => this.children(parent, slot),
      location: (id) => this.location(id),
      expand: (id) => {
        this.#collapsed.delete(id);
        this.refresh(true);
      },
      commit: (source, target, label) => {
        const before = ui.builder.getState().definition;
        const result = source.id
          ? ui.dispatch(
              new MoveComponent(source.id, {
                ...target,
                renameConflicts: true,
              }),
            )
          : this.add(source.type, target);
        if (
          !result.some((d) => d.severity === "error") &&
          before !== ui.builder.getState().definition
        )
          ui.announce(
            ui.t(source.id ? "ofb.moved" : "ofb.added", {
              label: source.label,
              target: label,
              index: (target.index ?? 0) + 1,
              count: 1,
            }),
          );
      },
    });
    this.actions = new ComponentActions({
      root,
      ui,
      ...(ui.icons ? { icons: ui.icons } : {}),
      copy: (id) => this.copy(id),
      cut: (id) => this.cut(id),
      paste: () => this.paste(),
      move: (node) =>
        this.pointer.start(
          { id: node.id, type: node.type, label: node.label ?? node.type },
          true,
        ),
      collapse: (id) => {
        if (!this.#collapsed.delete(id)) this.#collapsed.add(id);
        this.decorate(true);
        this.drawOutline();
        this.updateTargets();
      },
    });
    root.addEventListener(
      "contextmenu",
      (event) => {
        const target = event.target as Element;
        const slotRow = target.closest<HTMLElement>(
          '[role="treeitem"][data-builder-slot]',
        );
        if (slotRow && this.outline.contains(slotRow)) {
          event.preventDefault();
          this.selectTreeRow(slotRow);
          return;
        }
        const id =
          target.closest<HTMLElement>("[data-field-id],[data-drag-id]")?.dataset
            .fieldId ??
          target.closest<HTMLElement>("[data-drag-id]")?.dataset.dragId;
        const node = this.entries().find((e) => e.node.id === id)?.node;
        if (!node || target.closest("dialog,.ofb-settings")) return;
        event.preventDefault();
        this.actions.openMenu(
          node,
          target.closest<HTMLElement>("[data-field-id],[data-drag-id]") ??
            undefined,
        );
      },
      { signal: ui.signal },
    );
  }
  closeMini() {
    this.#mini?.remove();
    this.#mini = undefined;
  }
  openMini(origin: HTMLElement, target: DropTarget) {
    this.closeMini();
    const { ui } = this;
    const popup = element(ui.document, "section", "", "ofb-mini-palette");
    popup.setAttribute("role", "dialog");
    popup.setAttribute("aria-label", ui.t("ofb.add"));
    const context = { document: ui.document, signal: ui.signal };
    const search = labelledInput(context, ui.t("ofb.search"), "search");
    const input = search.input as HTMLInputElement;
    const items = element(ui.document, "div");
    const source = paletteGroups(ui)
      .flatMap((group) => group.components)
      .sort(
        (a, b) => (this.#uses.get(b.type) ?? 0) - (this.#uses.get(a.type) ?? 0),
      );
    const draw = () => {
      items.replaceChildren();
      const query = input.value.trim().toLowerCase();
      const results = query
        ? source.filter((item) =>
            `${ui.t(item.title)} ${item.type}`.toLowerCase().includes(query),
          )
        : source.slice(0, 6);
      for (const item of results) {
        const add = button(
          ui,
          ui.t("ofb.addType", { title: ui.t(item.title) }),
          () => {
            this.closeMini();
            if (this.ui.add) this.ui.add(item.type, target, origin);
            else this.add(item.type, target);
          },
        );
        items.append(add);
      }
      if (!results.length)
        items.append(element(ui.document, "p", ui.t("ofb.noMatches")));
    };
    input.addEventListener("input", draw, { signal: ui.signal });
    popup.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          this.closeMini();
          origin.focus();
        }
      },
      { signal: ui.signal },
    );
    popup.append(search.wrapper, items);
    const rect = origin.getBoundingClientRect(),
      root = this.root.getBoundingClientRect();
    popup.style.insetInlineStart = `${Math.max(0, Math.min(rect.left - root.left, root.width - 300))}px`;
    popup.style.insetBlockStart = `${rect.bottom - root.top + this.root.scrollTop}px`;
    this.root.append(popup);
    this.#mini = popup;
    draw();
    input.focus();
  }
  children(parent: ComponentNode | undefined, slot?: string): ComponentNode[] {
    const first = parent ? this.slots(parent)[0]?.name : "children";
    return (
      parent
        ? componentChildren(parent)
        : this.ui.builder.getState().definition.components
    ).filter(
      (node) =>
        ((parent ? childSlot(parent, node) : node.slot) ?? first) ===
        (slot ?? first),
    );
  }
  add(type: string, target: DropTarget): Diagnostic[] {
    if (this.ui.add) return this.ui.add(type, target, this.pointer.origin);
    const diagnostics = this.ui.dispatch(
      new AddComponent(type, { ...target, naming: "camel" }),
    );
    const id = this.ui.builder.getState().selection;
    if (id && !diagnostics.some((d) => d.severity === "error"))
      this.ui.added?.(id);
    return diagnostics;
  }
  entries(): Entry[] {
    const result: Entry[] = [];
    function walk(nodes: ComponentNode[], parent?: ComponentNode) {
      for (const node of nodes) {
        result.push({ node, ...(parent ? { parent } : {}) });
        walk(componentChildren(node), node);
      }
    }
    walk(this.ui.builder.getState().definition.components);
    return result;
  }
  slots(node: ComponentNode) {
    const model = this.ui.engine.getField(node.type)!;
    return model.kind === "composite" ? [] : resolveSlots(model, node);
  }
  caption(slot: ReturnType<Canvas["slots"]>[number]): string {
    const translated = slot.labelKey ? this.ui.t(slot.labelKey) : undefined;
    return translated === undefined || translated === slot.labelKey
      ? slot.label
      : translated;
  }
  location(id: string) {
    const entry = this.entries().find((e) => e.node.id === id);
    if (!entry) return undefined;
    const first = entry.parent ? this.slots(entry.parent)[0]?.name : "children";
    const slot =
      (entry.parent ? childSlot(entry.parent, entry.node) : entry.node.slot) ??
      first;
    const siblings = (
      entry.parent
        ? componentChildren(entry.parent)
        : this.ui.builder.getState().definition.components
    ).filter(
      (n) =>
        ((entry.parent ? childSlot(entry.parent, n) : n.slot) ?? first) ===
        slot,
    );
    return {
      ...entry,
      slot,
      index: siblings.findIndex((n) => n.id === id),
      siblings,
    };
  }
  choose(target: DropTarget): Diagnostic[] {
    const parent =
      target.parentId === undefined
        ? undefined
        : this.entries().find((e) => e.node.id === target.parentId)?.node;
    const slots = parent ? this.slots(parent) : [];
    const name = target.slot ?? slots[0]?.name;
    const count = parent
      ? componentChildren(parent).filter(
          (n) => (childSlot(parent, n) ?? slots[0]?.name) === name,
        ).length
      : this.ui.builder.getState().definition.components.length;
    if (
      (target.parentId !== undefined &&
        (!parent || !slots.some((s) => s.name === name))) ||
      (target.parentId === undefined && target.slot !== undefined) ||
      (target.index !== undefined &&
        (!Number.isInteger(target.index) ||
          target.index < 0 ||
          target.index > count))
    ) {
      const diagnostics: Diagnostic[] = [
        {
          severity: "error",
          code: "invalid-slot",
          message: this.ui.t("of.builder.invalidDestination"),
        },
      ];
      this.ui.announce(diagnostics[0]!.message);
      return diagnostics;
    }
    this.target = { ...target, ...(parent && name ? { slot: name } : {}) };
    this.#slotSelection =
      parent && name
        ? JSON.stringify({ parentId: parent.id, slot: name })
        : undefined;
    this.updateTargets();
    this.drawPicker();
    this.ui.announce(
      this.ui.t("of.builder.targetSelected", {
        label: parent
          ? `${parent.label ?? parent.type} / ${this.caption(slots.find((s) => s.name === name)!)}`
          : this.ui.t("of.builder.formRoot"),
      }),
    );
    return [];
  }
  refresh(decorate: boolean): void {
    const selected = this.ui.builder.getState().selection;
    const location = selected ? this.location(selected) : undefined;
    const signature = JSON.stringify(
      location
        ? [selected, location.parent?.id, location.slot, location.index]
        : null,
    );
    if (signature !== this.#selectedLocation) {
      this.#selectedLocation = signature;
      this.#slotSelection = undefined;
      if (!location) this.target = {};
      if (location) {
        const own = this.slots(location.node);
        this.target = own.length
          ? { parentId: location.node.id, slot: own[0]!.name }
          : {
              ...(location.parent
                ? {
                    parentId: location.parent.id,
                    ...(location.slot ? { slot: location.slot } : {}),
                  }
                : {}),
              index: location.index + 1,
            };
      }
    }
    if (this.cutId && !this.entries().some((e) => e.node.id === this.cutId))
      this.cutId = undefined;
    if (
      this.target.parentId &&
      !this.entries().some(
        (e) =>
          e.node.id === this.target.parentId &&
          this.slots(e.node).some(
            (s) => s.name === (this.target.slot ?? this.slots(e.node)[0]?.name),
          ),
      )
    )
      this.target = {};
    if (decorate) this.decorate();
    this.drawOutline();
    this.drawPicker();
    this.updateTargets();
    this.onLocalChange();
  }
  decorate(reuse = false): void {
    const savedHandles = reuse
      ? new Map(this.#handles)
      : new Map<string, HTMLElement>();
    const savedMarkers = reuse
      ? new Map(
          [...this.#targets].map(([button, target]) => [
            JSON.stringify(target),
            button,
          ]),
        )
      : new Map<string, HTMLElement>();
    const savedToolbars = reuse
      ? new Map(this.#toolbars)
      : new Map<string, HTMLElement>();
    this.#toolbars.clear();
    this.host
      .querySelectorAll(
        ".of-builder-handle,.of-builder-drop,.ofb-component-toolbar,.ofb-canvas-lock,.ofb-signal-row",
      )
      .forEach((el) => el.remove());
    this.#handles.clear();
    this.#targets.clear();
    const roots = new Map<string, HTMLElement>();
    this.host
      .querySelectorAll<HTMLElement>("[data-field-id]")
      .forEach((root) => roots.set(root.dataset.fieldId!, root));
    this.#roots = roots;
    const wire = this.entries();
    for (const { node } of wire) {
      const root = roots.get(node.id);
      if (!root) continue;
      const handle =
        (savedHandles.get(node.id) as HTMLButtonElement | undefined) ??
        button(
          this.ui,
          this.ui.t("of.builder.selectType", {
            label: node.label ?? node.type,
          }),
          () => {},
        );
      handle.textContent = node.key
        ? `${node.label ?? node.type} · ${node.key}`
        : (node.label ?? node.type);
      handle.className = "of-builder-handle";
      handle.dataset.dragId = node.id;
      handle.dataset.id = node.id;
      handle.classList.add("ofb-selection-label");
      root.prepend(handle);
      const toolbar = savedToolbars.get(node.id) ?? this.actions.toolbar(node);
      root.prepend(toolbar);
      this.#toolbars.set(node.id, toolbar);
      root.dataset.ofbLocked = this.ui.builder.lockLevel(node.id) ?? "";
      if (root.dataset.ofbLocked) {
        const lock = element(this.ui.document, "span", "", "ofb-canvas-lock");
        lock.setAttribute("role", "img");
        lock.setAttribute("aria-label", this.ui.t("ofb.lock"));
        lock.title = this.ui.t("ofb.lock");
        lock.append(icon(this.ui.document, "lock", this.ui.icons));
        root.append(lock);
      }
      this.#handles.set(node.id, handle);
      const form = this.ui.form?.();
      if (form) {
        const row = element(this.ui.document, "div", "", "ofb-signal-row");
        const context = { document: this.ui.document, signal: this.ui.signal };
        const count = form.byId[node.id]?.model.value
          ? controlledFields(form, node.id)
          : 0;
        if (count)
          row.append(
            chip(context, this.ui.t("ofb.controls", { count }), "logic"),
          );
        if (node.visibleWhen !== undefined && node.visibleWhen !== true)
          row.append(
            chip(
              context,
              this.ui.t("ofb.shownWhen", {
                condition: describeExpression(
                  node.visibleWhen,
                  form,
                  this.ui.t,
                ),
              }),
              "info",
            ),
          );
        if (row.childNodes.length) root.append(row);
      }
      root.dataset.dragId = node.id;
      root.dataset.ofCollapsed = String(this.#collapsed.has(node.id));
      root.tabIndex = this.ui.builder.getState().selection === node.id ? 0 : -1;
    }
    const indicators = (
      parent: ComponentNode | undefined,
      slot: string | undefined,
      owner: HTMLElement,
    ) => {
      const first = parent ? this.slots(parent)[0]?.name : "children";
      const children = (
        parent
          ? componentChildren(parent)
          : this.ui.builder.getState().definition.components
      ).filter(
        (n) =>
          ((parent ? childSlot(parent, n) : n.slot) ?? first) ===
          (slot ?? first),
      );
      for (let index = 0; index <= children.length; index++) {
        const target: DropTarget = {
          ...(parent ? { parentId: parent.id, ...(slot ? { slot } : {}) } : {}),
          index,
        };
        const marker =
          (savedMarkers.get(JSON.stringify(target)) as
            | HTMLButtonElement
            | undefined) ??
          button(
            this.ui,
            this.ui.t("of.builder.insertHere", { index: index + 1 }),
            () => {},
          );
        marker.className = "of-builder-drop";
        if (!children.length || (!parent && index === children.length)) {
          marker.classList.add("ofb-empty-slot");
          marker.textContent = this.ui.t("ofb.emptySlot");
        }
        marker.dataset.dropParent = parent?.id ?? "";
        marker.dataset.dropSlot = slot ?? "";
        marker.dataset.dropIndex = String(index);
        marker.setAttribute(
          "aria-label",
          this.ui.t("of.builder.dropLocation", {
            label: parent
              ? `${parent.label ?? parent.type} / ${this.caption(this.slots(parent).find((s) => s.name === slot)!)}`
              : this.ui.t("of.builder.formRoot"),
            index: index + 1,
          }),
        );
        this.#targets.set(marker, target);
        const child = children[index] && roots.get(children[index]!.id);
        if (child) child.prepend(marker);
        else owner.append(marker);
      }
    };
    indicators(undefined, undefined, this.host);
    for (const { node } of wire) {
      const root = roots.get(node.id);
      if (!root) continue;
      for (const slot of this.slots(node)) {
        const owner =
          Array.from(
            root.querySelectorAll<HTMLElement>("[data-of-slot-owner]"),
          ).find(
            (el) =>
              el.dataset.ofSlotOwner === node.id &&
              el.dataset.ofSlot === slot.name,
          ) ?? root;
        indicators(node, slot.name, owner);
      }
    }
  }
  drawOutline(): void {
    const focused = this.outline.contains(this.ui.document.activeElement)
      ? this.ui.document.activeElement?.closest<HTMLElement>("[data-drag-id]")
          ?.dataset.dragId
      : undefined;
    const selected = this.ui.builder.getState().selection;
    let location = selected ? this.location(selected) : undefined;
    while (location?.parent) {
      const parent = location.parent;
      this.#collapsed.delete(parent.id);
      this.#collapsedSlots.delete(
        JSON.stringify({
          parentId: parent.id,
          slot: location.slot ?? this.slots(parent)[0]?.name,
        }),
      );
      location = this.location(parent.id);
    }
    const definition = this.ui.builder.getState().definition;
    const expansion = JSON.stringify([
      [...this.#collapsed].sort(),
      [...this.#collapsedSlots].sort(),
    ]);
    if (
      this.#outlineDefinition === definition &&
      this.#outlineExpansion === expansion
    ) {
      for (const [id, item] of this.#items) {
        const value = String(id === selected && !this.#slotSelection);
        if (item.getAttribute("aria-selected") !== value)
          item.setAttribute("aria-selected", value);
        attribute(
          item,
          "tabindex",
          String(
            id === selected || (!selected && id === this.#visible[0]?.node.id)
              ? 0
              : -1,
          ),
        );
        attribute(item, "data-cut", String(id === this.cutId));
      }
      return;
    }
    this.#outlineDefinition = definition;
    this.#outlineExpansion = expansion;
    this.#items.clear();
    this.#slotItems.clear();
    this.#visible = [];
    this.outline.replaceChildren();
    const walk = (
      nodes: ComponentNode[],
      depth: number,
      parent?: ComponentNode,
      visible = true,
    ): HTMLUListElement => {
      const list = element(this.ui.document, "ul");
      list.setAttribute("role", depth === 1 ? "tree" : "group");
      if (depth === 1)
        list.setAttribute("aria-label", this.ui.t("of.builder.outline"));
      nodes.forEach((node, index) => {
        const li = element(this.ui.document, "li");
        li.setAttribute("role", "treeitem");
        li.setAttribute("aria-level", String(depth));
        li.setAttribute("aria-posinset", String(index + 1));
        li.setAttribute("aria-setsize", String(nodes.length));
        li.setAttribute(
          "aria-selected",
          String(selected === node.id && !this.#slotSelection),
        );
        li.setAttribute("aria-label", node.label ?? node.type);
        li.tabIndex =
          selected === node.id || (!selected && depth === 1 && index === 0)
            ? 0
            : -1;
        li.dataset.dragId = node.id;
        li.dataset.cut = String(this.cutId === node.id);
        const text = element(
          this.ui.document,
          "span",
          "",
          "of-builder-tree-name",
        );
        if (componentChildren(node).length || this.slots(node).length > 1) {
          const caret = element(this.ui.document, "span", "", "ofb-tree-caret");
          caret.append(
            icon(
              this.ui.document,
              this.#collapsed.has(node.id) ? "collapse" : "expand",
              this.ui.icons,
            ),
          );
          caret.setAttribute("aria-hidden", "true");
          caret.dataset.treeToggle = node.id;
          text.append(caret);
          li.setAttribute(
            "aria-expanded",
            String(!this.#collapsed.has(node.id)),
          );
        }
        text.append(node.label ?? node.type);
        if (this.ui.builder.lockLevel(node.id)) {
          const lock = icon(this.ui.document, "lock", this.ui.icons);
          lock.setAttribute("role", "img");
          lock.setAttribute("aria-label", this.ui.t("ofb.lock"));
          text.append(lock);
        }
        li.append(text);
        this.#items.set(node.id, li);
        if (visible)
          this.#visible.push({ node, ...(parent ? { parent } : {}) });
        const slots = this.slots(node);
        if (slots.length > 1) {
          const slotList = element(this.ui.document, "ul");
          slotList.setAttribute("role", "group");
          slotList.hidden = this.#collapsed.has(node.id);
          for (const [slotIndex, slot] of slots.entries()) {
            const row = element(this.ui.document, "li");
            const key = JSON.stringify({ parentId: node.id, slot: slot.name });
            row.dataset.builderSlot = key;
            row.setAttribute("role", "treeitem");
            row.setAttribute("aria-label", this.caption(slot));
            row.setAttribute("aria-level", String(depth + 1));
            row.setAttribute("aria-posinset", String(slotIndex + 1));
            row.setAttribute("aria-setsize", String(slots.length));
            row.setAttribute(
              "aria-selected",
              String(this.#slotSelection === key),
            );
            row.tabIndex = this.#slotSelection === key ? 0 : -1;
            const name = element(
              this.ui.document,
              "span",
              "",
              "of-builder-tree-name ofb-slot-name",
            );
            const children = this.children(node, slot.name);
            if (children.length) {
              const closed = this.#collapsedSlots.has(key);
              row.setAttribute("aria-expanded", String(!closed));
              const caret = element(
                this.ui.document,
                "span",
                "",
                "ofb-tree-caret",
              );
              caret.append(
                icon(
                  this.ui.document,
                  closed ? "collapse" : "expand",
                  this.ui.icons,
                ),
              );
              caret.dataset.slotToggle = key;
              caret.setAttribute("aria-hidden", "true");
              name.append(caret);
              const nested = walk(
                children,
                depth + 2,
                node,
                visible && !this.#collapsed.has(node.id) && !closed,
              );
              nested.hidden = closed;
              row.append(nested);
            }
            name.append(this.caption(slot));
            row.prepend(name);
            this.#slotItems.set(key, row);
            slotList.append(row);
          }
          li.append(slotList);
        } else if (componentChildren(node).length) {
          const nested = walk(
            componentChildren(node),
            depth + 1,
            node,
            visible && !this.#collapsed.has(node.id),
          );
          nested.hidden = this.#collapsed.has(node.id);
          li.append(nested);
        }
        list.append(li);
      });
      return list;
    };
    this.outline.append(
      walk(this.ui.builder.getState().definition.components, 1),
    );
    if (focused) this.#items.get(focused)?.focus();
  }
  drawPicker(): void {
    this.picker.replaceChildren();
    this.#choices = [{}];
    const labels = [this.ui.t("of.builder.formRoot")];
    for (const { node } of this.entries())
      for (const slot of this.slots(node)) {
        this.#choices.push({ parentId: node.id, slot: slot.name });
        labels.push(`${node.label ?? node.type} / ${this.caption(slot)}`);
      }
    labels.forEach((label, index) => {
      const option = element(this.ui.document, "option", label);
      option.value = String(index);
      this.picker.append(option);
    });
    this.picker.value = String(
      Math.max(
        0,
        this.#choices.findIndex(
          (target) =>
            target.parentId === this.target.parentId &&
            (target.slot ??
              (target.parentId
                ? this.slots(
                    this.entries().find((e) => e.node.id === target.parentId)!
                      .node,
                  )[0]?.name
                : undefined)) === this.target.slot,
        ),
      ),
    );
  }
  updateTargets(): void {
    for (const [button, target] of this.#targets)
      attribute(
        button,
        "aria-pressed",
        String(
          target.parentId === this.target.parentId &&
            target.slot === this.target.slot &&
            target.index === this.target.index,
        ),
      );
    const selected = this.ui.builder.getState().selection;
    for (const [key, row] of this.#slotItems) {
      attribute(row, "aria-selected", String(key === this.#slotSelection));
      attribute(row, "tabindex", String(key === this.#slotSelection ? 0 : -1));
    }
    for (const [id, row] of this.#items) {
      attribute(
        row,
        "aria-selected",
        String(id === selected && !this.#slotSelection),
      );
      attribute(
        row,
        "tabindex",
        String(
          !this.#slotSelection &&
            (id === selected || (!selected && id === this.#visible[0]?.node.id))
            ? 0
            : -1,
        ),
      );
    }
    for (const [id, handle] of this.#handles) {
      attribute(handle, "aria-pressed", String(id === selected));
      const root = this.#roots.get(id)!;
      attribute(root, "data-of-selected", String(id === selected));
      attribute(root, "tabindex", String(id === selected ? 0 : -1));
      const cut = id === this.cutId;
      if (root.classList.contains("of-builder-cut") !== cut)
        root.classList.toggle("of-builder-cut", cut);
    }
  }
  focusSelected(outline = false): void {
    let id = this.ui.builder.getState().selection;
    if (!id && this.#visible[0]) {
      id = this.#visible[0].node.id;
      this.ui.builder.select(id);
    }
    if (id) {
      this.ui.reveal?.(id);
      if (outline)
        (this.#slotSelection
          ? this.#slotItems.get(this.#slotSelection)
          : this.#items.get(id)
        )?.focus();
      else
        this.#handles.get(id)?.closest<HTMLElement>("[data-field-id]")?.focus();
    } else this.#targets.keys().next().value?.focus();
  }

  copy(id = this.ui.builder.getState().selection ?? undefined): void {
    const node = this.entries().find((e) => e.node.id === id)?.node;
    this.clipboard = node
      ? (JSON.parse(JSON.stringify(node)) as ComponentNode)
      : undefined;
    this.cutId = undefined;
    this.onLocalChange();
    this.ui.announce(
      this.ui.t(node ? "ofb.copied" : "ofb.selectFirst", {
        label: node?.label ?? node?.type,
      }),
    );
  }
  cut(id = this.ui.builder.getState().selection ?? undefined): void {
    this.cutId = id;
    this.refresh(false);
    this.ui.announce(
      this.ui.t(this.cutId ? "of.builder.cutReady" : "of.builder.selectFirst"),
    );
  }
  paste(): void {
    if (!this.cutId && !this.clipboard) {
      this.ui.announce(this.ui.t("ofb.nothingToPaste"));
      return;
    }
    const result = this.ui.dispatch(
      this.cutId
        ? new MoveComponent(this.cutId, {
            ...this.moveTarget(this.cutId, this.target),
            renameConflicts: true,
          })
        : new PasteComponent(this.clipboard!, this.target),
    );
    if (!result.some((d) => d.severity === "error")) {
      this.cutId = undefined;
      this.refresh(false);
    }
  }
  moveTarget(id: string, target: DropTarget): DropTarget {
    const from = this.location(id),
      parent = target.parentId
        ? this.entries().find((e) => e.node.id === target.parentId)?.node
        : undefined;
    const slot =
      target.slot ?? (parent ? this.slots(parent)[0]?.name : "children");
    return from &&
      from.parent?.id === target.parentId &&
      from.slot === slot &&
      target.index !== undefined &&
      from.index < target.index
      ? { ...target, index: target.index - 1 }
      : target;
  }
  pick = () => {
    const target = this.#choices[Number(this.picker.value)];
    if (target) this.choose(target);
  };
  selectTreeRow(row: HTMLElement): void {
    if (row.dataset.builderSlot) {
      const target = JSON.parse(row.dataset.builderSlot) as DropTarget;
      if (
        target.parentId &&
        this.ui.builder.lockLevel(target.parentId) === "all"
      ) {
        this.ui.announce(this.ui.t("ofb.lock.edit"));
        return;
      }
      this.ui.builder.select(target.parentId ?? null);
      this.choose(target);
      this.#slotItems.get(row.dataset.builderSlot)?.focus();
    } else if (row.dataset.dragId) {
      if (this.ui.builder.lockLevel(row.dataset.dragId) === "all") {
        row.focus();
        this.ui.announce(this.ui.t("ofb.lock.edit"));
        return;
      }
      this.#slotSelection = undefined;
      this.ui.builder.select(row.dataset.dragId);
      this.ui.reveal?.(row.dataset.dragId);
      this.#items.get(row.dataset.dragId)?.focus();
    }
  }
  click = (event: MouseEvent) => {
    const target = event.target as Element;
    if (
      target.closest(
        "[data-ofb-action],dialog,.ofb-settings,[role=menu],.ofb-mini-palette,[data-of-tab]",
      )
    )
      return;
    const slotToggle = target.closest<HTMLElement>("[data-slot-toggle]");
    if (slotToggle && this.outline.contains(slotToggle)) {
      const key = slotToggle.dataset.slotToggle!;
      this.selectTreeRow(slotToggle.closest<HTMLElement>('[role="treeitem"]')!);
      if (!this.#collapsedSlots.delete(key)) this.#collapsedSlots.add(key);
      this.drawOutline();
      this.#slotItems.get(key)?.focus();
      return;
    }
    const tree = target.closest<HTMLElement>('[role="treeitem"]');
    if (tree?.dataset.builderSlot && this.outline.contains(tree)) {
      this.selectTreeRow(tree);
      return;
    }
    const marker = target.closest<HTMLElement>(".of-builder-drop");
    if (marker && this.#targets.has(marker)) {
      this.choose(this.#targets.get(marker)!);
      if (marker.classList.contains("ofb-empty-slot"))
        this.openMini(marker, this.#targets.get(marker)!);
      return;
    }
    const add = target.closest<HTMLElement>("[data-type]");
    if (add && this.palette.contains(add)) {
      this.add(add.dataset.type!, this.target);
      return;
    }
    const toggle = target.closest<HTMLElement>("[data-tree-toggle]");
    if (toggle && this.outline.contains(toggle)) {
      const id = toggle.dataset.treeToggle!;
      this.#slotSelection = undefined;
      if (!this.#collapsed.delete(id)) this.#collapsed.add(id);
      this.ui.builder.select(id);
      this.focusSelected(true);
      return;
    }
    const handle = target.closest<HTMLElement>("[data-drag-id]");
    if (
      handle &&
      (this.host.contains(handle) || this.outline.contains(handle))
    ) {
      if (this.ui.builder.lockLevel(handle.dataset.dragId!) === "all") {
        this.ui.announce(this.ui.t("ofb.lock.edit"));
        return;
      }
      this.#slotSelection = undefined;
      this.ui.builder.select(handle.dataset.dragId!);
      if (this.outline.contains(handle))
        this.ui.reveal?.(handle.dataset.dragId!);
      return;
    }
    let field = target.closest<HTMLElement>("[data-field-id]");
    while (field && this.host.contains(field)) {
      if (this.entries().some((e) => e.node.id === field!.dataset.fieldId)) {
        if (this.ui.builder.lockLevel(field.dataset.fieldId!) === "all") {
          this.ui.announce(this.ui.t("ofb.lock.edit"));
          return;
        }
        this.#slotSelection = undefined;
        this.ui.builder.select(field.dataset.fieldId!);
        break;
      }
      field =
        field.parentElement?.closest<HTMLElement>("[data-field-id]") ?? null;
    }
  };
  keydown = (event: KeyboardEvent) => {
    if (this.pointer.active) return;
    const target = event.target as HTMLElement;
    if (
      target.closest(
        '[data-builder-part="preview"],dialog,.ofb-settings,[role="menu"]',
      ) ||
      target.matches("input,textarea,[contenteditable=true]")
    )
      return;
    // Let native buttons activate their own action; Enter must not bubble into Edit.
    if (
      target.closest("[data-ofb-action]") &&
      ["Enter", " "].includes(event.key)
    )
      return;
    const marker = target.closest<HTMLElement>(".of-builder-drop");
    if (
      marker &&
      this.#targets.has(marker) &&
      ["Enter", " "].includes(event.key)
    ) {
      event.preventDefault();
      this.choose(this.#targets.get(marker)!);
      return;
    }
    const command = event.ctrlKey || event.metaKey;
    const tree = target.closest<HTMLElement>('[role="treeitem"]');
    if (tree && this.outline.contains(tree) && !event.altKey) {
      if (tree.dataset.builderSlot && ["Enter", " "].includes(event.key)) {
        event.preventDefault();
        this.selectTreeRow(tree);
        return;
      }
      if (
        !command &&
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "Home",
          "End",
        ].includes(event.key)
      ) {
        event.preventDefault();
        // Collapse the focused row, even if focus entered it from a selected descendant.
        if (["ArrowLeft", "ArrowRight"].includes(event.key))
          this.selectTreeRow(tree);
        const rows = [
          ...this.outline.querySelectorAll<HTMLElement>('[role="treeitem"]'),
        ].filter((row) => !row.closest("[hidden]"));
        const index = rows.indexOf(tree);
        let next: HTMLElement | undefined;
        if (event.key === "ArrowUp") next = rows[index - 1];
        else if (event.key === "ArrowDown") next = rows[index + 1];
        else if (event.key === "Home") next = rows[0];
        else if (event.key === "End") next = rows.at(-1);
        else if (event.key === "ArrowRight") {
          if (
            tree.dataset.builderSlot &&
            this.#collapsedSlots.delete(tree.dataset.builderSlot)
          ) {
            this.drawOutline();
            next = this.#slotItems.get(tree.dataset.builderSlot);
          } else if (
            tree.dataset.dragId &&
            this.#collapsed.delete(tree.dataset.dragId)
          ) {
            this.drawOutline();
            next = this.#items.get(tree.dataset.dragId);
          } else
            next =
              tree.querySelector<HTMLElement>(
                ':scope>[role="group"]>[role="treeitem"]',
              ) ?? undefined;
        } else if (event.key === "ArrowLeft") {
          if (
            tree.dataset.builderSlot &&
            tree.getAttribute("aria-expanded") === "true"
          ) {
            this.#collapsedSlots.add(tree.dataset.builderSlot);
            this.drawOutline();
            next = this.#slotItems.get(tree.dataset.builderSlot);
          } else if (
            tree.dataset.dragId &&
            tree.getAttribute("aria-expanded") === "true"
          ) {
            this.#collapsed.add(tree.dataset.dragId);
            this.drawOutline();
            next = this.#items.get(tree.dataset.dragId);
          } else
            next =
              tree.parentElement?.closest<HTMLElement>('[role="treeitem"]') ??
              undefined;
        }
        if (next) this.selectTreeRow(next);
        return;
      }
      if (
        tree.dataset.builderSlot &&
        (event.key === "Delete" ||
          event.key === "Backspace" ||
          (command && ["x", "c", "d"].includes(event.key.toLowerCase())))
      ) {
        event.preventDefault();
        this.ui.announce(this.ui.t("ofb.slotActions"));
        return;
      }
    }
    const selected = this.ui.builder.getState().selection;
    const node = this.entries().find((e) => e.node.id === selected)?.node;
    if (node) {
      const action =
        command && event.shiftKey && event.key.toLowerCase() === "j"
          ? "json"
          : command && event.key.toLowerCase() === "d"
            ? "duplicate"
            : command && event.key.toLowerCase() === "c"
              ? "copy"
              : event.shiftKey && event.key === "F10"
                ? "more"
                : undefined;
      if (action) {
        event.preventDefault();
        this.actions.execute(action, node, target);
        return;
      }
    }
    if (command && event.key.toLowerCase() === "x") {
      event.preventDefault();
      this.cut();
      return;
    }
    if (command && event.key.toLowerCase() === "v") {
      event.preventDefault();
      this.paste();
      return;
    }
    if (target instanceof HTMLSelectElement) return;
    if (command && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) this.ui.builder.redo();
      else this.ui.builder.undo();
      return;
    }
    if (event.key === "Escape") {
      this.cutId = undefined;
      this.refresh(false);
      return;
    }
    const id = target.closest<HTMLElement>("[data-drag-id]")?.dataset.dragId;
    if (!id) return;
    const location = this.location(id);
    if (!location) return;
    const inOutline = this.outline.contains(target);
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      this.actions.execute("delete", location.node);
      this.focusSelected(inOutline);
      return;
    }
    if (event.altKey && event.key.startsWith("Arrow")) {
      event.preventDefault();
      let to: DropTarget | undefined;
      const membership = {
        ...(location.parent
          ? {
              parentId: location.parent.id,
              ...(location.slot ? { slot: location.slot } : {}),
            }
          : {}),
      };
      if (event.key === "ArrowUp" || event.key === "ArrowDown")
        to = {
          ...membership,
          index: location.index + (event.key === "ArrowUp" ? -1 : 1),
        };
      else if (event.key === "ArrowLeft" && location.parent) {
        const outer = this.location(location.parent.id)!;
        to = {
          ...(outer.parent
            ? {
                parentId: outer.parent.id,
                ...(outer.slot ? { slot: outer.slot } : {}),
              }
            : {}),
          index: outer.index + 1,
        };
      } else if (event.key === "ArrowRight") {
        const previous = location.siblings[location.index - 1];
        if (previous) to = { parentId: previous.id };
      }
      if (to) this.ui.dispatch(new MoveComponent(id, to));
      else this.ui.announce(this.ui.t("of.builder.noMoveTarget"));
      this.focusSelected(inOutline);
      return;
    }
    if (event.key === "Enter" || event.key === "F2") {
      event.preventDefault();
      if (this.ui.edit) {
        this.ui.edit(id);
        return;
      }
      this.root
        .querySelector<HTMLElement>(
          '[data-builder-part="properties"] input,[data-builder-part="properties"] textarea,[data-builder-part="properties"] select',
        )
        ?.focus();
      return;
    }
    const position = this.#visible.findIndex((e) => e.node.id === id);
    let next: string | undefined;
    if (event.key === "ArrowUp") next = this.#visible[position - 1]?.node.id;
    else if (event.key === "ArrowDown")
      next = this.#visible[position + 1]?.node.id;
    else if (event.key === "Home") next = this.#visible[0]?.node.id;
    else if (event.key === "End") next = this.#visible.at(-1)?.node.id;
    else if (event.key === "ArrowRight") {
      if (this.#collapsed.delete(id)) this.drawOutline();
      else next = componentChildren(location.node)[0]?.id;
    } else if (event.key === "ArrowLeft") {
      if (componentChildren(location.node).length && !this.#collapsed.has(id)) {
        this.#collapsed.add(id);
        this.drawOutline();
      } else next = location.parent?.id;
    } else if (!command && event.key.length === 1 && inOutline) {
      const now = Date.now();
      this.#typeAhead =
        now - this.#lastKey < 700
          ? this.#typeAhead + event.key.toLowerCase()
          : event.key.toLowerCase();
      this.#lastKey = now;
      const ordered = [
        ...this.#visible.slice(position + 1),
        ...this.#visible.slice(0, position + 1),
      ];
      next = ordered.find((e) =>
        (e.node.label ?? e.node.type).toLowerCase().startsWith(this.#typeAhead),
      )?.node.id;
    } else return;
    event.preventDefault();
    if (next) {
      this.ui.builder.select(next);
      this.focusSelected(inOutline);
    }
  };
  destroy(): void {
    this.#unsubscribe();
    this.closeMini();
    this.actions.closeMenu();
    this.pointer.destroy();
    this.root.removeEventListener("click", this.click);
    this.root.removeEventListener("keydown", this.keydown);
    this.picker.removeEventListener("change", this.pick);
    this.#targets.clear();
    this.#handles.clear();
    this.#items.clear();
    this.#collapsed.clear();
  }
}
