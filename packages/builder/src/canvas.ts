import {
  AddComponent,
  MoveComponent,
  RemoveComponent,
} from "@ourform/builder-core";
import type { DropTarget } from "@ourform/builder-core";
import type { ComponentNode, Diagnostic } from "@ourform/schema";
import { resolveSlots } from "@ourform/sdk";
import { button, element } from "./types";
import type { UI } from "./types";
type Entry = { node: ComponentNode; parent?: ComponentNode };
type Drag = { type: string; id?: string };
export class Canvas {
  target: DropTarget = {};
  cutId: string | undefined;
  #drag: Drag | undefined;
  #targets = new Map<HTMLElement, DropTarget>();
  #items = new Map<string, HTMLElement>();
  #handles = new Map<string, HTMLElement>();
  #collapsed = new Set<string>();
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
    root.addEventListener("dragstart", this.dragstart);
    root.addEventListener("dragover", this.dragover);
    root.addEventListener("drop", this.drop);
    root.addEventListener("dragend", this.dragend);
    picker.addEventListener("change", this.pick);
    for (const group of ui.builder.palette()) {
      palette.append(element(ui.document, "h3", group.name));
      for (const item of group.components) {
        const add = button(ui, ui.t(item.title), () => {});
        add.dataset.type = item.type;
        add.dataset.componentType = item.type;
        add.draggable = true;
        add.setAttribute(
          "aria-label",
          ui.t("of.builder.addType", { title: ui.t(item.title) }),
        );
        // Preserve the familiar visible palette names while making purpose explicit to AT.
        add.textContent = ui.t(item.title);
        palette.append(add);
      }
    }
  }
  entries(): Entry[] {
    const result: Entry[] = [];
    function walk(nodes: ComponentNode[], parent?: ComponentNode) {
      for (const node of nodes) {
        result.push({ node, ...(parent ? { parent } : {}) });
        walk(node.components ?? [], node);
      }
    }
    walk(this.ui.builder.getState().definition.components);
    return result;
  }
  slots(node: ComponentNode) {
    const model = this.ui.engine.getField(node.type)!;
    return model.kind === "composite" ? [] : resolveSlots(model, node);
  }
  location(id: string) {
    const entry = this.entries().find((e) => e.node.id === id);
    if (!entry) return undefined;
    const first = entry.parent ? this.slots(entry.parent)[0]?.name : "children";
    const slot = entry.node.slot ?? first;
    const siblings = (
      entry.parent?.components ??
      this.ui.builder.getState().definition.components
    ).filter((n) => (n.slot ?? first) === slot);
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
      ? (parent.components ?? []).filter(
          (n) => (n.slot ?? slots[0]?.name) === name,
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
    this.updateTargets();
    this.drawPicker();
    this.ui.announce(
      this.ui.t("of.builder.targetSelected", {
        label: parent
          ? `${parent.label ?? parent.type} / ${this.ui.t(slots.find((s) => s.name === name)!.label)}`
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
    this.host
      .querySelectorAll(".of-builder-handle,.of-builder-drop")
      .forEach((el) => el.remove());
    this.#handles.clear();
    this.#targets.clear();
    const roots = new Map<string, HTMLElement>();
    this.host
      .querySelectorAll<HTMLElement>("[data-field-id]")
      .forEach((root) => roots.set(root.dataset.fieldId!, root));
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
      handle.className = "of-builder-handle";
      handle.dataset.dragId = node.id;
      handle.dataset.id = node.id;
      handle.draggable = true;
      root.prepend(handle);
      this.#handles.set(node.id, handle);
    }
    const indicators = (
      parent: ComponentNode | undefined,
      slot: string | undefined,
      owner: HTMLElement,
    ) => {
      const first = parent ? this.slots(parent)[0]?.name : "children";
      const children = (
        parent?.components ?? this.ui.builder.getState().definition.components
      ).filter((n) => (n.slot ?? first) === (slot ?? first));
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
        marker.dataset.dropParent = parent?.id ?? "";
        marker.dataset.dropSlot = slot ?? "";
        marker.dataset.dropIndex = String(index);
        marker.setAttribute(
          "aria-label",
          this.ui.t("of.builder.dropLocation", {
            label: parent
              ? `${parent.label ?? parent.type} / ${this.ui.t(this.slots(parent).find((s) => s.name === slot)?.label ?? slot ?? "")}`
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
    this.#items.clear();
    this.#visible = [];
    this.outline.replaceChildren();
    const selected = this.ui.builder.getState().selection;
    let parent = selected ? this.location(selected)?.parent : undefined;
    while (parent) {
      this.#collapsed.delete(parent.id);
      parent = this.location(parent.id)?.parent;
    }
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
        li.setAttribute("aria-selected", String(selected === node.id));
        li.setAttribute("aria-label", node.label ?? node.type);
        li.tabIndex =
          selected === node.id || (!selected && depth === 1 && index === 0)
            ? 0
            : -1;
        li.dataset.dragId = node.id;
        li.draggable = true;
        li.dataset.cut = String(this.cutId === node.id);
        const text = element(
          this.ui.document,
          "span",
          "",
          "of-builder-tree-name",
        );
        if (node.components?.length) {
          const caret = element(
            this.ui.document,
            "span",
            this.#collapsed.has(node.id) ? "▸ " : "▾ ",
          );
          caret.setAttribute("aria-hidden", "true");
          text.append(caret);
          li.setAttribute(
            "aria-expanded",
            String(!this.#collapsed.has(node.id)),
          );
        }
        text.append(node.label ?? node.type);
        li.append(text);
        this.#items.set(node.id, li);
        if (visible)
          this.#visible.push({ node, ...(parent ? { parent } : {}) });
        if (node.components?.length) {
          const nested = walk(
            node.components,
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
        labels.push(`${node.label ?? node.type} / ${this.ui.t(slot.label)}`);
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
      button.setAttribute(
        "aria-pressed",
        String(
          target.parentId === this.target.parentId &&
            target.slot === this.target.slot &&
            target.index === this.target.index,
        ),
      );
    const selected = this.ui.builder.getState().selection;
    for (const [id, handle] of this.#handles) {
      handle.setAttribute("aria-pressed", String(id === selected));
      const root = handle.closest<HTMLElement>("[data-field-id]")!;
      root.dataset.ofSelected = String(id === selected);
      root.classList.toggle("of-builder-cut", id === this.cutId);
    }
  }
  focusSelected(outline = false): void {
    let id = this.ui.builder.getState().selection;
    if (!id && this.#visible[0]) {
      id = this.#visible[0].node.id;
      this.ui.builder.select(id);
    }
    if (id) (outline ? this.#items : this.#handles).get(id)?.focus();
    else this.#targets.keys().next().value?.focus();
  }

  cut(): void {
    this.cutId = this.ui.builder.getState().selection ?? undefined;
    this.refresh(false);
    this.ui.announce(
      this.ui.t(this.cutId ? "of.builder.cutReady" : "of.builder.selectFirst"),
    );
  }
  paste(): void {
    if (!this.cutId) return;
    const result = this.ui.dispatch(
      new MoveComponent(this.cutId, this.moveTarget(this.cutId, this.target)),
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
  click = (event: MouseEvent) => {
    const target = event.target as Element;
    const marker = target.closest<HTMLElement>(".of-builder-drop");
    if (marker && this.#targets.has(marker)) {
      this.choose(this.#targets.get(marker)!);
      return;
    }
    const add = target.closest<HTMLElement>("[data-type]");
    if (add && this.palette.contains(add)) {
      this.ui.dispatch(new AddComponent(add.dataset.type!, this.target));
      return;
    }
    const handle = target.closest<HTMLElement>("[data-drag-id]");
    if (
      handle &&
      (this.host.contains(handle) || this.outline.contains(handle))
    ) {
      this.ui.builder.select(handle.dataset.dragId!);
      return;
    }
    let field = target.closest<HTMLElement>("[data-field-id]");
    while (field && this.host.contains(field)) {
      if (this.entries().some((e) => e.node.id === field!.dataset.fieldId)) {
        this.ui.builder.select(field.dataset.fieldId!);
        break;
      }
      field =
        field.parentElement?.closest<HTMLElement>("[data-field-id]") ?? null;
    }
  };
  keydown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    if (
      target.closest('[data-builder-part="preview"]') ||
      target.matches("input,textarea,[contenteditable=true]")
    )
      return;
    const command = event.ctrlKey || event.metaKey;
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
      this.ui.dispatch(new RemoveComponent(id));
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
      else next = location.node.components?.[0]?.id;
    } else if (event.key === "ArrowLeft") {
      if (location.node.components?.length && !this.#collapsed.has(id)) {
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
  dragstart = (event: DragEvent) => {
    const el = (event.target as Element).closest<HTMLElement>(
      "[data-drag-id],[data-type]",
    );
    if (!el || !event.dataTransfer) return;
    const id = el.dataset.dragId,
      type = id ? this.location(id)?.node.type : el.dataset.type;
    if (!type) return;
    this.#drag = { type, ...(id ? { id } : {}) };
    event.dataTransfer.setData(
      "application/x-ourform",
      JSON.stringify(this.#drag),
    );
    event.dataTransfer.effectAllowed = "copyMove";
  };
  payload(event: DragEvent): Drag | undefined {
    if (this.#drag) return this.#drag;
    try {
      const value: unknown = JSON.parse(
        event.dataTransfer?.getData("application/x-ourform") ?? "",
      );
      if (
        value &&
        typeof value === "object" &&
        "type" in value &&
        typeof value.type === "string" &&
        (!("id" in value) || typeof value.id === "string")
      )
        return value as Drag;
    } catch {
      /* Unsupported external drag data is refused below. */
    }
    return undefined;
  }
  dragover = (event: DragEvent) => {
    const marker = (event.target as Element).closest<HTMLElement>(
      ".of-builder-drop",
    );
    const target = marker && this.#targets.get(marker);
    if (!marker || !target) return;
    event.preventDefault();
    event.stopPropagation();
    this.clearHighlight();
    marker.dataset.dropActive = "true";
    const payload = this.payload(event);
    if (!payload) return;
    const errors = this.ui.builder.canDrop(
      payload.type,
      payload.id ? this.moveTarget(payload.id, target) : target,
      payload.id,
    );
    marker.dataset.dropRefused = String(!!errors.length);
    if (errors.length)
      this.ui.announce(errors.map((d) => d.message).join(" · "));
    if (event.dataTransfer)
      event.dataTransfer.dropEffect = errors.length
        ? "none"
        : payload.id
          ? "move"
          : "copy";
  };
  drop = (event: DragEvent) => {
    const marker = (event.target as Element).closest<HTMLElement>(
      ".of-builder-drop",
    );
    const target = marker && this.#targets.get(marker);
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    const payload = this.payload(event);
    this.dragend();
    if (!payload) {
      this.ui.announce(this.ui.t("of.builder.unsupportedDrag"));
      return;
    }
    this.ui.dispatch(
      payload.id
        ? new MoveComponent(payload.id, this.moveTarget(payload.id, target))
        : new AddComponent(payload.type, target),
    );
  };
  clearHighlight() {
    for (const marker of this.#targets.keys()) {
      delete marker.dataset.dropActive;
      delete marker.dataset.dropRefused;
    }
  }
  dragend = () => {
    this.#drag = undefined;
    this.clearHighlight();
  };
  destroy(): void {
    this.root.removeEventListener("click", this.click);
    this.root.removeEventListener("keydown", this.keydown);
    this.root.removeEventListener("dragstart", this.dragstart);
    this.root.removeEventListener("dragover", this.dragover);
    this.root.removeEventListener("drop", this.drop);
    this.root.removeEventListener("dragend", this.dragend);
    this.picker.removeEventListener("change", this.pick);
    this.#targets.clear();
    this.#handles.clear();
    this.#items.clear();
    this.#collapsed.clear();
  }
}
