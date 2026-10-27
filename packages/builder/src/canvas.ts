import { componentChildren, childSlot } from "@ourform/schema";
import {
  AddComponent,
  MoveComponent,
  PasteComponent,
  UpdateProperty,
  WrapInLayout,
} from "@ourform/builder-core";
import type { DropTarget } from "@ourform/builder-core";
import type {
  ComponentNode,
  Diagnostic,
  FormDefinition,
} from "@ourform/schema";
import { resolveSlots } from "@ourform/sdk";
import { button, element, componentTitle } from "./types";
import type { UI } from "./types";
import { PointerDrag } from "./pointer";
import { ComponentActions } from "./component-actions";
import { icon, componentIcon } from "./icons";
import { paletteGroups } from "./palette";
import { describeExpression, controlledFields } from "./signals";
import { chip, placeSelection } from "./primitives";
import type { FeatureLoader } from "./feature-loader";
type Entry = { node: ComponentNode; parent?: ComponentNode };
const attribute = (element: HTMLElement, name: string, value: string) => {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
};
export class Canvas {
  _ofbTarget: DropTarget = {};
  _ofbCutId: string | undefined;
  _ofbClipboard: ComponentNode | undefined;
  readonly _ofbActions: ComponentActions;
  #toolbars = new Map<string, HTMLElement>();
  #mini: HTMLElement | undefined;
  #uses = new Map<string, number>();
  #unsubscribe: () => void;
  readonly _ofbPointer: PointerDrag;
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
  #typeAhead = "";
  #lastKey = 0;
  #labelPointer:
    | { id: string; at: number; clientX: number; clientY: number }
    | undefined;
  constructor(
    readonly _ofbRoot: HTMLElement,
    readonly _ofbHost: HTMLElement,
    readonly _ofbPalette: HTMLElement,
    readonly _ofbOutline: HTMLElement,
    readonly _ofbUi: UI,
    readonly _ofbFeatures: FeatureLoader,
    readonly _ofbOnLocalChange: () => void,
  ) {
    const root = _ofbRoot,
      host = _ofbHost,
      palette = _ofbPalette,
      outline = _ofbOutline,
      ui = _ofbUi;
    root.addEventListener("click", this.click);
    root.addEventListener("dblclick", this.doubleClick);
    root.addEventListener("pointerdown", this.labelPointerDown, {
      capture: true,
      signal: ui.signal,
    });
    root.addEventListener("keydown", this.keydown);
    root.addEventListener("focusin", this.followFocus);
    const position = () => {
      if (this._ofbPointer._ofbActive || ui.signal.aborted) return;
      const port =
        host.closest<HTMLElement>('[data-builder-part="canvas-panel"]') ?? host;
      const selected = ui.builder.getState().selection;
      const hovered = host.querySelector<HTMLElement>(
        "[data-field-id]:hover:not(:has([data-field-id]:hover))",
      );
      if (selected && this.#roots.has(selected))
        placeSelection(this.#roots.get(selected)!, port, this._ofbUi);
      if (hovered) placeSelection(hovered, port, this._ofbUi);
    };
    this._ofbPosition = () => requestAnimationFrame(position);
    ui.document.fonts.addEventListener("loadingdone", position, {
      signal: ui.signal,
    });
    for (const event of ["pointerover", "focusin"])
      root.addEventListener(event, this._ofbPosition, { signal: ui.signal });
    root.addEventListener("scroll", position, {
      capture: true,
      signal: ui.signal,
    });
    ui.document.defaultView!.addEventListener("resize", position, {
      signal: ui.signal,
    });

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
        add.prepend(
          icon(ui.document, componentIcon(item.type, item.icon), ui.icons),
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
          this._ofbCloseMini();
      },
      { signal: ui.signal },
    );
    this._ofbHost.setAttribute("role", "application");
    this._ofbHost.setAttribute("aria-label", ui.t("ofb.canvas"));
    this._ofbPointer = new PointerDrag({
      root,
      host,
      palette,
      outline,
      scroll: host.parentElement!,
      ui,
      entries: () => this._ofbEntries(),
      slots: (node) => this._ofbSlots(node),
      caption: (slot) => this._ofbCaption(slot),
      children: (parent, slot) => this._ofbChildren(parent, slot),
      location: (id) => this._ofbLocation(id),
      expand: (id) => {
        this.#collapsed.delete(id);
        this._ofbRefresh(true);
      },
      commit: (source, target) => {
        if (source.id)
          ui.dispatch(
            new MoveComponent(source.id, { ...target, renameConflicts: true }),
          );
        else this._ofbAdd(source.type, target);
      },
    });
    this._ofbActions = new ComponentActions({
      root,
      ui,
      ...(ui.icons ? { icons: ui.icons } : {}),
      copy: (id) => this._ofbCopy(id),
      cut: (id) => this._ofbCut(id),
      paste: () => this._ofbPaste(),
      move: (node) =>
        this._ofbPointer._ofbStart(
          {
            id: node.id,
            type: node.type,
            label: componentTitle(this._ofbUi, node),
          },
          true,
        ),
      collapse: (id) => {
        if (!this.#collapsed.delete(id)) this.#collapsed.add(id);
        this._ofbDecorate(true);
        this._ofbDrawOutline();
        this._ofbUpdateTargets();
      },
      entries: () => this._ofbEntries().map(({ node }) => node),
      slots: (node) => this._ofbSlots(node),
      caption: (slot) => this._ofbCaption(slot),
      target: () => this._ofbTarget,
      choose: (target) => this._ofbChoose(target),
      wrap: (id, type) => ui.dispatch(new WrapInLayout(id, type)),
    });
    root.addEventListener(
      "contextmenu",
      (event) => {
        const target = event.target as Element;
        const slotRow = target.closest<HTMLElement>(
          '[role="treeitem"][data-builder-slot]',
        );
        if (slotRow && this._ofbOutline.contains(slotRow)) {
          event.preventDefault();
          this._ofbSelectTreeRow(slotRow);
          return;
        }
        const id =
          target.closest<HTMLElement>("[data-field-id],[data-drag-id]")?.dataset
            .fieldId ??
          target.closest<HTMLElement>("[data-drag-id]")?.dataset.dragId;
        const node = this._ofbEntries().find((e) => e.node.id === id)?.node;
        if (!node || target.closest("dialog,.ofb-settings")) return;
        event.preventDefault();
        this._ofbActions._ofbOpenMenu(
          node,
          target.closest<HTMLElement>("[data-field-id],[data-drag-id]") ??
            undefined,
        );
      },
      { signal: ui.signal },
    );
  }
  _ofbCloseMini() {
    this.#mini?.remove();
    this.#mini = undefined;
  }
  _ofbEditLabel(id: string, origin?: HTMLElement) {
    const entry = this._ofbEntries().find(({ node }) => node.id === id);
    if (!entry) return;
    if (this._ofbUi.builder.lockLevel(id) === "all") {
      this._ofbUi.announce(this._ofbUi.t("ofb.lock.edit"));
      return;
    }
    const property =
      this._ofbUi.engine.getField(entry.node.type)?.builder?.caption ?? "label";
    const root = this.#roots.get(id);
    const caption =
      origin ??
      root?.querySelector<HTMLElement>(
        ":scope > .of-label,:scope > .of-layout-title,:scope > legend.of-label",
      );
    if (
      property === false ||
      !caption ||
      !caption.isConnected ||
      !caption.getClientRects().length
    ) {
      this._ofbUi.announce(this._ofbUi.t("ofb.noCaption"));
      return;
    }
    if (caption.dataset.ofbEditingLabel === "true") return;
    if (property === "label" && entry.node.labelKey?.trim()) {
      this._ofbUi.edit?.(id);
      return;
    }
    caption.dataset.ofbEditingLabel = "true";
    caption.hidden = true;
    const input = element(this._ofbUi.document, "input");
    input.className = "ofb-inline-label";
    const value = property
      .split(".")
      .reduce<unknown>(
        (value, key) =>
          value && typeof value === "object"
            ? (value as Record<string, unknown>)[key]
            : undefined,
        entry.node,
      );
    input.value =
      typeof value === "string"
        ? value
        : componentTitle(this._ofbUi, entry.node);
    input.setAttribute("aria-label", this._ofbUi.t("ofb.editLabel"));
    caption.after(input);
    let finished = false;
    const close = (commit: boolean, restoreFocus = true) => {
      if (finished) return;
      finished = true;
      const value = input.value.trim();
      input.remove();
      caption.hidden = false;
      delete caption.dataset.ofbEditingLabel;
      if (commit) {
        if (!value) {
          this._ofbUi.announce(this._ofbUi.t("ofb.labelRequired"));
          caption.focus();
          return;
        }
        this._ofbUi.dispatch(new UpdateProperty(id, property, value));
      }
      if (restoreFocus) this.#roots.get(id)?.focus();
    };
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        close(true);
      } else if (event.key === "Escape") {
        event.preventDefault();
        close(false);
      }
    });
    input.addEventListener("blur", () => close(true, false), { once: true });
    input.focus();
    input.select();
  }
  _ofbOpenMini(origin: HTMLElement, target: DropTarget) {
    this._ofbCloseMini();
    const ui = this._ofbUi;
    const popup = element(ui.document, "section", "", "ofb-mini-palette");
    popup.setAttribute("role", "dialog");
    popup.setAttribute("aria-label", ui.t("ofb.add"));
    popup.setAttribute("aria-busy", "true");
    popup.append(
      element(
        ui.document,
        "p",
        ui.t("ofb.featureLoading", { feature: ui.t("ofb.add") }),
      ),
    );
    ui.announce(ui.t("ofb.featureLoading", { feature: ui.t("ofb.add") }));
    const source = paletteGroups(ui)
      .flatMap((group) => group.components)
      .filter(
        (item) =>
          !ui.builder
            .canDrop(item.type, target)
            .some((diagnostic) => diagnostic.severity === "error"),
      )
      .map((item) => ({
        ...item,
        uses: this.#uses.get(item.type) ?? 0,
      }));
    const rect = origin.getBoundingClientRect(),
      root = this._ofbRoot.getBoundingClientRect();
    this._ofbRoot.append(popup);
    ui._ofbStyle(
      popup,
      "inset-inline-start",
      `${Math.max(0, Math.min(rect.left - root.left, root.width - 300))}px`,
      "inset-block-start",
      `${rect.bottom - root.top + this._ofbRoot.scrollTop}px`,
    );
    this.#mini = popup;
    const load = () => {
      popup.setAttribute("aria-busy", "true");
      void this._ofbFeatures
        .load("quickAdd")
        .then(({ mountQuickAdd }) => {
          if (this.#mini !== popup || ui.signal.aborted) return;
          mountQuickAdd(popup, ui, {
            items: source,
            add: (type) => this._ofbUi.add!(type, target, origin),
            close: () => this._ofbCloseMini(),
            origin,
          });
        })
        .catch((cause: unknown) => {
          if (this.#mini !== popup || ui.signal.aborted) return;
          popup.removeAttribute("aria-busy");
          popup.replaceChildren(
            element(
              ui.document,
              "p",
              ui.t("ofb.featureFailed", { feature: ui.t("ofb.add") }),
            ),
            button(ui, ui.t("ofb.retry"), load),
          );
          ui.announce(cause instanceof Error ? cause.message : String(cause));
        });
    };
    load();
  }
  _ofbChildren(
    parent: ComponentNode | undefined,
    slot?: string,
  ): ComponentNode[] {
    const first = parent ? this._ofbSlots(parent)[0]?.name : "children";
    return (
      parent
        ? componentChildren(parent)
        : this._ofbUi.builder.getState().definition.components
    ).filter(
      (node) =>
        ((parent ? childSlot(parent, node) : node.slot) ?? first) ===
        (slot ?? first),
    );
  }
  _ofbAdd(type: string, target: DropTarget): Diagnostic[] {
    return this._ofbUi.add!(type, target, this._ofbPointer._ofbOrigin);
  }
  _ofbEntries(): Entry[] {
    const result: Entry[] = [];
    function walk(nodes: ComponentNode[], parent?: ComponentNode) {
      for (const node of nodes) {
        result.push({ node, ...(parent ? { parent } : {}) });
        walk(componentChildren(node), node);
      }
    }
    walk(this._ofbUi.builder.getState().definition.components);
    return result;
  }
  _ofbSlots(node: ComponentNode) {
    const model = this._ofbUi.engine.getField(node.type)!;
    return model.kind === "composite" ? [] : resolveSlots(model, node);
  }
  _ofbCaption(slot: ReturnType<Canvas["_ofbSlots"]>[number]): string {
    const translated = slot.labelKey ? this._ofbUi.t(slot.labelKey) : undefined;
    return translated === undefined || translated === slot.labelKey
      ? slot.label
      : translated;
  }
  _ofbLocation(id: string) {
    const entry = this._ofbEntries().find((e) => e.node.id === id);
    if (!entry) return undefined;
    const first = entry.parent
      ? this._ofbSlots(entry.parent)[0]?.name
      : "children";
    const slot =
      (entry.parent ? childSlot(entry.parent, entry.node) : entry.node.slot) ??
      first;
    const siblings = (
      entry.parent
        ? componentChildren(entry.parent)
        : this._ofbUi.builder.getState().definition.components
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
  _ofbChoose(target: DropTarget): Diagnostic[] {
    const parent =
      target.parentId === undefined
        ? undefined
        : this._ofbEntries().find((e) => e.node.id === target.parentId)?.node;
    const slots = parent ? this._ofbSlots(parent) : [];
    const name = target.slot ?? slots[0]?.name;
    const count = parent
      ? componentChildren(parent).filter(
          (n) => (childSlot(parent, n) ?? slots[0]?.name) === name,
        ).length
      : this._ofbUi.builder.getState().definition.components.length;
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
          message: this._ofbUi.t("of.builder.invalidDestination"),
        },
      ];
      this._ofbUi.announce(diagnostics[0]!.message);
      return diagnostics;
    }
    this._ofbTarget = { ...target, ...(parent && name ? { slot: name } : {}) };
    this.#slotSelection =
      parent && name
        ? JSON.stringify({ parentId: parent.id, slot: name })
        : undefined;
    this._ofbUpdateTargets();
    this._ofbUi.announce(
      this._ofbUi.t("of.builder.targetSelected", {
        label: parent
          ? `${componentTitle(this._ofbUi, parent)} / ${this._ofbCaption(slots.find((s) => s.name === name)!)}`
          : this._ofbUi.t("of.builder.formRoot"),
      }),
    );
    return [];
  }
  _ofbPosition: () => void;
  _ofbRefresh(decorate: boolean): void {
    const selected = this._ofbUi.builder.getState().selection;
    const location = selected ? this._ofbLocation(selected) : undefined;
    const signature = JSON.stringify(
      location
        ? [selected, location.parent?.id, location.slot, location.index]
        : null,
    );
    if (signature !== this.#selectedLocation) {
      this.#selectedLocation = signature;
      this.#slotSelection = undefined;
      if (!location) this._ofbTarget = {};
      if (location) {
        const own = this._ofbSlots(location.node);
        this._ofbTarget = own.length
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
    if (
      this._ofbCutId &&
      !this._ofbEntries().some((e) => e.node.id === this._ofbCutId)
    )
      this._ofbCutId = undefined;
    if (
      this._ofbTarget.parentId &&
      !this._ofbEntries().some(
        (e) =>
          e.node.id === this._ofbTarget.parentId &&
          this._ofbSlots(e.node).some(
            (s) =>
              s.name ===
              (this._ofbTarget.slot ?? this._ofbSlots(e.node)[0]?.name),
          ),
      )
    )
      this._ofbTarget = {};
    if (decorate) this._ofbDecorate();
    this._ofbDrawOutline();
    this._ofbUpdateTargets();
    this._ofbOnLocalChange();
    this._ofbPosition();
  }
  _ofbDecorate(reuse = false): void {
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
    this._ofbHost
      .querySelectorAll(
        ".of-builder-handle,.of-builder-drop,.ofb-component-toolbar,.ofb-canvas-lock,.ofb-signal-row",
      )
      .forEach((el) => el.remove());
    this.#handles.clear();
    this.#targets.clear();
    const roots = new Map<string, HTMLElement>();
    this._ofbHost
      .querySelectorAll<HTMLElement>("[data-field-id]")
      .forEach((root) => roots.set(root.dataset.fieldId!, root));
    this.#roots = roots;
    const wire = this._ofbEntries();
    for (const { node } of wire) {
      const root = roots.get(node.id);
      if (!root) continue;
      const handle =
        (savedHandles.get(node.id) as HTMLButtonElement | undefined) ??
        button(
          this._ofbUi,
          this._ofbUi.t("of.builder.selectType", {
            label: componentTitle(this._ofbUi, node),
          }),
          () => {},
        );
      handle.textContent = componentTitle(this._ofbUi, node);
      if (node.key)
        handle.append(
          element(
            this._ofbUi.document,
            "span",
            ` · ${node.key}`,
            "ofb-selection-key",
          ),
        );
      handle.className = "of-builder-handle";
      handle.dataset.dragId = node.id;
      handle.dataset.id = node.id;
      handle.classList.add("ofb-selection-label");
      handle.title = handle.textContent;
      handle.setAttribute("aria-label", handle.textContent);
      root.prepend(handle);
      const toolbar =
        savedToolbars.get(node.id) ?? this._ofbActions._ofbToolbar(node);
      root.prepend(toolbar);
      this.#toolbars.set(node.id, toolbar);
      root.dataset.ofbLocked = this._ofbUi.builder.lockLevel(node.id) ?? "";
      if (root.dataset.ofbLocked) {
        const lock = element(
          this._ofbUi.document,
          "span",
          "",
          "ofb-canvas-lock",
        );
        lock.setAttribute("role", "img");
        lock.setAttribute("aria-label", this._ofbUi.t("ofb.lock"));
        lock.title = this._ofbUi.t("ofb.lock");
        lock.append(icon(this._ofbUi.document, "lock", this._ofbUi.icons));
        root.append(lock);
      }
      this.#handles.set(node.id, handle);
      const form = this._ofbUi.form?.();
      if (form) {
        const row = element(this._ofbUi.document, "div", "", "ofb-signal-row");
        const context = this._ofbUi;
        const count = form.byId[node.id]?.model.value
          ? controlledFields(form, node.id)
          : 0;
        if (count)
          row.append(
            chip(context, this._ofbUi.t("ofb.controls", { count }), "logic"),
          );
        if (node.visibleWhen !== undefined && node.visibleWhen !== true)
          row.append(
            chip(
              context,
              this._ofbUi.t("ofb.shownWhen", {
                condition: describeExpression(
                  node.visibleWhen,
                  form,
                  this._ofbUi.t,
                ),
              }),
              "info",
            ),
          );
        if (row.childNodes.length) root.append(row);
      }
      root.dataset.dragId = node.id;
      root.dataset.ofCollapsed = String(this.#collapsed.has(node.id));
      root.tabIndex =
        this._ofbUi.builder.getState().selection === node.id ? 0 : -1;
    }
    const indicators = (
      parent: ComponentNode | undefined,
      slot: string | undefined,
      owner: HTMLElement,
    ) => {
      const first = parent ? this._ofbSlots(parent)[0]?.name : "children";
      const children = (
        parent
          ? componentChildren(parent)
          : this._ofbUi.builder.getState().definition.components
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
            this._ofbUi,
            this._ofbUi.t("of.builder.insertHere", { index: index + 1 }),
            () => {},
          );
        marker.className = "of-builder-drop ofb-quick-add";
        if (!children.length || (!parent && index === children.length)) {
          marker.classList.add("ofb-empty-slot");
          marker.textContent = this._ofbUi.t("ofb.emptySlot");
        } else marker.textContent = "+";
        marker.dataset.dropParent = parent?.id ?? "";
        marker.dataset.dropSlot = slot ?? "";
        marker.dataset.dropIndex = String(index);
        marker.onpointerdown = (event) => {
          // Keep a pointer activation from moving focus to the insertion marker.
          // WebKit otherwise transfers focus to the containing design node when
          // the target state is refreshed, which changes the user's selection.
          event.preventDefault();
          event.stopPropagation();
        };
        marker.onclick = (event) => {
          event.stopPropagation();
          this._ofbChoose(target);
          this._ofbOpenMini(marker, target);
        };
        marker.setAttribute(
          "aria-label",
          this._ofbUi.t("of.builder.dropLocation", {
            label: parent
              ? `${componentTitle(this._ofbUi, parent)} / ${this._ofbCaption(this._ofbSlots(parent).find((s) => s.name === slot)!)}`
              : this._ofbUi.t("of.builder.formRoot"),
            index: index + 1,
          }),
        );
        this.#targets.set(marker, target);
        const child = children[index] && roots.get(children[index]!.id);
        if (child) child.prepend(marker);
        else owner.append(marker);
      }
    };
    indicators(undefined, undefined, this._ofbHost);
    for (const { node } of wire) {
      const root = roots.get(node.id);
      if (!root) continue;
      for (const slot of this._ofbSlots(node)) {
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
  _ofbDrawOutline(): void {
    const selected = this._ofbUi.builder.getState().selection;
    // A command may select a new/moved component while the old slot still owns focus.
    // Restore the current selection, never an ancestor inferred from the detached slot.
    const focused = this._ofbOutline.contains(
      this._ofbUi.document.activeElement,
    )
      ? selected
      : undefined;
    let location = selected ? this._ofbLocation(selected) : undefined;
    while (location?.parent) {
      const parent = location.parent;
      this.#collapsed.delete(parent.id);
      this.#collapsedSlots.delete(
        JSON.stringify({
          parentId: parent.id,
          slot: location.slot ?? this._ofbSlots(parent)[0]?.name,
        }),
      );
      location = this._ofbLocation(parent.id);
    }
    const definition = this._ofbUi.builder.getState().definition;
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
        attribute(item, "data-cut", String(id === this._ofbCutId));
      }
      return;
    }
    this.#outlineDefinition = definition;
    this.#outlineExpansion = expansion;
    this.#items.clear();
    this.#slotItems.clear();
    this.#visible = [];
    this._ofbOutline.replaceChildren();
    const walk = (
      nodes: ComponentNode[],
      depth: number,
      parent?: ComponentNode,
      visible = true,
    ): HTMLUListElement => {
      const list = element(this._ofbUi.document, "ul");
      list.setAttribute("role", depth === 1 ? "tree" : "group");
      if (depth === 1)
        list.setAttribute("aria-label", this._ofbUi.t("of.builder.outline"));
      nodes.forEach((node, index) => {
        const li = element(this._ofbUi.document, "li");
        li.setAttribute("role", "treeitem");
        li.setAttribute("aria-level", String(depth));
        li.setAttribute("aria-posinset", String(index + 1));
        li.setAttribute("aria-setsize", String(nodes.length));
        li.setAttribute(
          "aria-selected",
          String(selected === node.id && !this.#slotSelection),
        );
        li.setAttribute("aria-label", componentTitle(this._ofbUi, node));
        li.tabIndex =
          selected === node.id || (!selected && depth === 1 && index === 0)
            ? 0
            : -1;
        li.dataset.dragId = node.id;
        li.dataset.cut = String(this._ofbCutId === node.id);
        const text = element(
          this._ofbUi.document,
          "span",
          "",
          "of-builder-tree-name",
        );
        if (componentChildren(node).length || this._ofbSlots(node).length > 1) {
          const caret = element(
            this._ofbUi.document,
            "span",
            "",
            "ofb-tree-caret",
          );
          caret.append(
            icon(
              this._ofbUi.document,
              this.#collapsed.has(node.id) ? "collapse" : "expand",
              this._ofbUi.icons,
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
        text.append(componentTitle(this._ofbUi, node));
        if (this._ofbUi.builder.lockLevel(node.id)) {
          const lock = icon(this._ofbUi.document, "lock", this._ofbUi.icons);
          lock.setAttribute("role", "img");
          lock.setAttribute("aria-label", this._ofbUi.t("ofb.lock"));
          text.append(lock);
        }
        li.append(text);
        this.#items.set(node.id, li);
        if (visible)
          this.#visible.push({ node, ...(parent ? { parent } : {}) });
        const slots = this._ofbSlots(node);
        if (slots.length > 1) {
          const slotList = element(this._ofbUi.document, "ul");
          slotList.setAttribute("role", "group");
          slotList.hidden = this.#collapsed.has(node.id);
          for (const [slotIndex, slot] of slots.entries()) {
            const row = element(this._ofbUi.document, "li");
            const key = JSON.stringify({ parentId: node.id, slot: slot.name });
            row.dataset.builderSlot = key;
            row.setAttribute("role", "treeitem");
            row.setAttribute("aria-label", this._ofbCaption(slot));
            row.setAttribute("aria-level", String(depth + 1));
            row.setAttribute("aria-posinset", String(slotIndex + 1));
            row.setAttribute("aria-setsize", String(slots.length));
            row.setAttribute(
              "aria-selected",
              String(this.#slotSelection === key),
            );
            row.tabIndex = this.#slotSelection === key ? 0 : -1;
            const name = element(
              this._ofbUi.document,
              "span",
              "",
              "of-builder-tree-name ofb-slot-name",
            );
            const children = this._ofbChildren(node, slot.name);
            if (children.length) {
              const closed = this.#collapsedSlots.has(key);
              row.setAttribute("aria-expanded", String(!closed));
              const caret = element(
                this._ofbUi.document,
                "span",
                "",
                "ofb-tree-caret",
              );
              caret.append(
                icon(
                  this._ofbUi.document,
                  closed ? "collapse" : "expand",
                  this._ofbUi.icons,
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
            name.append(this._ofbCaption(slot));
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
    this._ofbOutline.append(
      walk(this._ofbUi.builder.getState().definition.components, 1),
    );
    if (focused) this.#items.get(focused)?.focus();
  }
  _ofbUpdateTargets(): void {
    for (const [button, target] of this.#targets)
      attribute(
        button,
        "aria-pressed",
        String(
          target.parentId === this._ofbTarget.parentId &&
            target.slot === this._ofbTarget.slot &&
            target.index === this._ofbTarget.index,
        ),
      );
    const selected = this._ofbUi.builder.getState().selection;
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
      const cut = id === this._ofbCutId;
      if (root.classList.contains("of-builder-cut") !== cut)
        root.classList.toggle("of-builder-cut", cut);
    }
  }
  _ofbFocusSelected(outline = false): void {
    let id = this._ofbUi.builder.getState().selection;
    if (!id && this.#visible[0]) {
      id = this.#visible[0].node.id;
      this._ofbUi.builder.select(id);
    }
    if (id) {
      this._ofbUi.reveal?.(id);
      if (outline)
        (this.#slotSelection
          ? this.#slotItems.get(this.#slotSelection)
          : this.#items.get(id)
        )?.focus();
      else
        this.#handles.get(id)?.closest<HTMLElement>("[data-field-id]")?.focus();
    } else this.#targets.keys().next().value?.focus();
  }

  _ofbCopy(id = this._ofbUi.builder.getState().selection ?? undefined): void {
    const node = this._ofbEntries().find((e) => e.node.id === id)?.node;
    const serialized = node ? JSON.stringify(node) : undefined;
    this._ofbClipboard = serialized
      ? (JSON.parse(serialized) as ComponentNode)
      : undefined;
    if (serialized)
      void this._ofbUi.document.defaultView?.navigator.clipboard
        ?.writeText(serialized)
        .catch(() => {});
    this._ofbCutId = undefined;
    this._ofbOnLocalChange();
    this._ofbUi.announce(
      this._ofbUi.t(node ? "ofb.copied" : "ofb.selectFirst", {
        label: node ? componentTitle(this._ofbUi, node) : "",
      }),
    );
  }
  _ofbCut(id = this._ofbUi.builder.getState().selection ?? undefined): void {
    this._ofbCutId = id;
    this._ofbRefresh(false);
    this._ofbUi.announce(
      this._ofbUi.t(
        this._ofbCutId ? "of.builder.cutReady" : "of.builder.selectFirst",
      ),
    );
  }
  _ofbPaste(): void {
    if (!this._ofbCutId && !this._ofbClipboard) {
      const clipboard = this._ofbUi.document.defaultView?.navigator.clipboard;
      if (clipboard)
        void clipboard
          .readText()
          .then((text) => {
            if (this._ofbUi.signal.aborted) return;
            try {
              this._ofbClipboard = JSON.parse(text) as ComponentNode;
              this._ofbPaste();
            } catch {
              this._ofbUi.announce(this._ofbUi.t("ofb.nothingToPaste"));
            }
          })
          .catch(() =>
            this._ofbUi.announce(this._ofbUi.t("ofb.nothingToPaste")),
          );
      else this._ofbUi.announce(this._ofbUi.t("ofb.nothingToPaste"));
      return;
    }
    const result = this._ofbUi.dispatch(
      this._ofbCutId
        ? new MoveComponent(this._ofbCutId, {
            ...this._ofbMoveTarget(this._ofbCutId, this._ofbTarget),
            renameConflicts: true,
          })
        : new PasteComponent(this._ofbClipboard!, this._ofbTarget),
    );
    if (!result.some((d) => d.severity === "error")) {
      this._ofbCutId = undefined;
      this._ofbRefresh(false);
    }
  }
  _ofbMoveTarget(id: string, target: DropTarget): DropTarget {
    const from = this._ofbLocation(id),
      parent = target.parentId
        ? this._ofbEntries().find((e) => e.node.id === target.parentId)?.node
        : undefined;
    const slot =
      target.slot ?? (parent ? this._ofbSlots(parent)[0]?.name : "children");
    return from &&
      from.parent?.id === target.parentId &&
      from.slot === slot &&
      target.index !== undefined &&
      from.index < target.index
      ? { ...target, index: target.index - 1 }
      : target;
  }
  _ofbSelectTreeRow(row: HTMLElement): void {
    if (row.dataset.builderSlot) {
      const target = JSON.parse(row.dataset.builderSlot) as DropTarget;
      if (
        target.parentId &&
        this._ofbUi.builder.lockLevel(target.parentId) === "all"
      ) {
        this._ofbUi.announce(this._ofbUi.t("ofb.lock.edit"));
        return;
      }
      this._ofbUi.builder.select(target.parentId ?? null);
      this._ofbChoose(target);
      this.#slotItems.get(row.dataset.builderSlot)?.focus();
    } else if (row.dataset.dragId) {
      if (this._ofbUi.builder.lockLevel(row.dataset.dragId) === "all") {
        row.focus();
        this._ofbUi.announce(this._ofbUi.t("ofb.lock.edit"));
        return;
      }
      this.#slotSelection = undefined;
      this._ofbUi.builder.select(row.dataset.dragId);
      this._ofbUi.reveal?.(row.dataset.dragId);
      this.#items.get(row.dataset.dragId)?.focus();
    }
  }
  followFocus = (event: FocusEvent) => {
    const target = event.target as HTMLElement;
    const row = target.closest<HTMLElement>('[role="treeitem"]');
    if (row && this._ofbOutline.contains(row)) this._ofbSelectTreeRow(row);
    else if (
      target.matches("[data-field-id][tabindex]") &&
      this._ofbHost.contains(target)
    ) {
      const id = target.dataset.fieldId!;
      if (this._ofbUi.builder.lockLevel(id) !== "all")
        this._ofbUi.builder.select(id);
    }
  };
  click = (event: MouseEvent) => {
    const target = event.target as Element;
    if (
      target.closest(
        "[data-ofb-action],dialog,.ofb-settings,[role=menu],.ofb-mini-palette,[data-of-tab]",
      )
    )
      return;
    const slotToggle = target.closest<HTMLElement>("[data-slot-toggle]");
    if (slotToggle && this._ofbOutline.contains(slotToggle)) {
      const key = slotToggle.dataset.slotToggle!;
      this._ofbSelectTreeRow(
        slotToggle.closest<HTMLElement>('[role="treeitem"]')!,
      );
      if (!this.#collapsedSlots.delete(key)) this.#collapsedSlots.add(key);
      this._ofbDrawOutline();
      this.#slotItems.get(key)?.focus();
      return;
    }
    const tree = target.closest<HTMLElement>('[role="treeitem"]');
    if (tree?.dataset.builderSlot && this._ofbOutline.contains(tree)) {
      this._ofbSelectTreeRow(tree);
      return;
    }
    const marker = target.closest<HTMLElement>(".of-builder-drop");
    if (marker && this.#targets.has(marker)) {
      this._ofbChoose(this.#targets.get(marker)!);
      this._ofbOpenMini(marker, this.#targets.get(marker)!);
      return;
    }
    const add = target.closest<HTMLElement>("[data-type]");
    if (add && this._ofbPalette.contains(add)) {
      this._ofbAdd(add.dataset.type!, this._ofbTarget);
      return;
    }
    const toggle = target.closest<HTMLElement>("[data-tree-toggle]");
    if (toggle && this._ofbOutline.contains(toggle)) {
      const id = toggle.dataset.treeToggle!;
      this.#slotSelection = undefined;
      if (!this.#collapsed.delete(id)) this.#collapsed.add(id);
      this._ofbUi.builder.select(id);
      this._ofbFocusSelected(true);
      return;
    }
    const handle = target.closest<HTMLElement>("[data-drag-id]");
    if (
      handle &&
      (this._ofbHost.contains(handle) || this._ofbOutline.contains(handle))
    ) {
      if (this._ofbUi.builder.lockLevel(handle.dataset.dragId!) === "all") {
        this._ofbUi.announce(this._ofbUi.t("ofb.lock.edit"));
        return;
      }
      this.#slotSelection = undefined;
      this._ofbUi.builder.select(handle.dataset.dragId!);
      if (this._ofbOutline.contains(handle))
        this._ofbUi.reveal?.(handle.dataset.dragId!);
      return;
    }
    let field = target.closest<HTMLElement>("[data-field-id]");
    while (field && this._ofbHost.contains(field)) {
      if (
        this._ofbEntries().some((e) => e.node.id === field!.dataset.fieldId)
      ) {
        if (this._ofbUi.builder.lockLevel(field.dataset.fieldId!) === "all") {
          this._ofbUi.announce(this._ofbUi.t("ofb.lock.edit"));
          return;
        }
        this.#slotSelection = undefined;
        this._ofbUi.builder.select(field.dataset.fieldId!);
        break;
      }
      field =
        field.parentElement?.closest<HTMLElement>("[data-field-id]") ?? null;
    }
  };
  labelPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    const target = event.target as Element;
    const field = target.closest<HTMLElement>("[data-field-id]");
    const id = field?.dataset.fieldId;
    const caption = target.closest<HTMLElement>(".of-label,.of-layout-title");
    const previous = this.#labelPointer;
    if (
      id &&
      previous?.id === id &&
      event.timeStamp - previous.at < 750 &&
      Math.hypot(
        event.clientX - previous.clientX,
        event.clientY - previous.clientY,
      ) < 8
    ) {
      // Selecting a component exposes its chrome between clicks. In Firefox
      // that chrome can become the second pointer target, so the browser never
      // emits `dblclick` on the original label. Detect the same-place pointer
      // sequence before presentation chrome can consume it.
      event.preventDefault();
      event.stopImmediatePropagation();
      this.#labelPointer = undefined;
      this._ofbUi.builder.select(id);
      this._ofbEditLabel(id, caption ?? undefined);
      return;
    }
    this.#labelPointer =
      caption && id
        ? {
            id,
            at: event.timeStamp,
            clientX: event.clientX,
            clientY: event.clientY,
          }
        : undefined;
  };
  doubleClick = (event: MouseEvent) => {
    const caption = (event.target as Element).closest<HTMLElement>(
      ".of-label,.of-layout-title",
    );
    const root = caption?.closest<HTMLElement>("[data-field-id]");
    if (!caption || !root || !this._ofbHost.contains(root)) return;
    event.preventDefault();
    event.stopPropagation();
    this._ofbUi.builder.select(root.dataset.fieldId!);
    this._ofbEditLabel(root.dataset.fieldId!, caption);
  };
  keydown = (event: KeyboardEvent) => {
    if (
      this._ofbPointer._ofbActive ||
      this._ofbRoot.hasAttribute("data-ofb-readonly")
    )
      return;
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
      this._ofbChoose(this.#targets.get(marker)!);
      this._ofbOpenMini(marker, this.#targets.get(marker)!);
      return;
    }
    const command = event.ctrlKey || event.metaKey;
    const tree = target.closest<HTMLElement>('[role="treeitem"]');
    if (tree && this._ofbOutline.contains(tree) && !event.altKey) {
      if (tree.dataset.builderSlot && ["Enter", " "].includes(event.key)) {
        event.preventDefault();
        this._ofbSelectTreeRow(tree);
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
          this._ofbSelectTreeRow(tree);
        const rows = [
          ...this._ofbOutline.querySelectorAll<HTMLElement>(
            '[role="treeitem"]',
          ),
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
            this._ofbDrawOutline();
            next = this.#slotItems.get(tree.dataset.builderSlot);
          } else if (
            tree.dataset.dragId &&
            this.#collapsed.delete(tree.dataset.dragId)
          ) {
            this._ofbDrawOutline();
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
            this._ofbDrawOutline();
            next = this.#slotItems.get(tree.dataset.builderSlot);
          } else if (
            tree.dataset.dragId &&
            tree.getAttribute("aria-expanded") === "true"
          ) {
            this.#collapsed.add(tree.dataset.dragId);
            this._ofbDrawOutline();
            next = this.#items.get(tree.dataset.dragId);
          } else
            next =
              tree.parentElement?.closest<HTMLElement>('[role="treeitem"]') ??
              undefined;
        }
        if (next) this._ofbSelectTreeRow(next);
        return;
      }
      if (
        tree.dataset.builderSlot &&
        (event.key === "Delete" ||
          event.key === "Backspace" ||
          (command && ["x", "c", "d"].includes(event.key.toLowerCase())))
      ) {
        event.preventDefault();
        this._ofbUi.announce(this._ofbUi.t("ofb.slotActions"));
        return;
      }
    }
    const selected =
      tree?.dataset.dragId ??
      target.closest<HTMLElement>("[data-field-id]")?.dataset.fieldId ??
      this._ofbUi.builder.getState().selection;
    const node = this._ofbEntries().find((e) => e.node.id === selected)?.node;
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
        this._ofbActions._ofbExecute(action, node, target);
        return;
      }
    }
    if (command && event.key.toLowerCase() === "x") {
      event.preventDefault();
      this._ofbCut();
      return;
    }
    if (command && event.key.toLowerCase() === "v") {
      event.preventDefault();
      this._ofbPaste();
      return;
    }
    if (target instanceof HTMLSelectElement) return;
    if (command && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) this._ofbUi.builder.redo();
      else this._ofbUi.builder.undo();
      return;
    }
    if (event.key === "Escape") {
      this._ofbCutId = undefined;
      this._ofbRefresh(false);
      return;
    }
    const id = target.closest<HTMLElement>("[data-drag-id]")?.dataset.dragId;
    if (!id) return;
    const location = this._ofbLocation(id);
    if (!location) return;
    const inOutline = this._ofbOutline.contains(target);
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      this._ofbActions._ofbExecute("delete", location.node);
      this._ofbFocusSelected(inOutline);
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
        const outer = this._ofbLocation(location.parent.id)!;
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
      if (to) this._ofbUi.dispatch(new MoveComponent(id, to));
      else this._ofbUi.announce(this._ofbUi.t("of.builder.noMoveTarget"));
      this._ofbFocusSelected(inOutline);
      return;
    }
    if (event.shiftKey && event.key === "F2") {
      event.preventDefault();
      this._ofbEditLabel(id);
      return;
    }
    if (event.key === "Enter" || event.key === "F2") {
      event.preventDefault();
      if (this._ofbUi.edit) {
        this._ofbUi.edit(id);
        return;
      }
      this._ofbRoot
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
      if (this.#collapsed.delete(id)) this._ofbDrawOutline();
      else next = componentChildren(location.node)[0]?.id;
    } else if (event.key === "ArrowLeft") {
      if (componentChildren(location.node).length && !this.#collapsed.has(id)) {
        this.#collapsed.add(id);
        this._ofbDrawOutline();
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
        componentTitle(this._ofbUi, e.node)
          .toLowerCase()
          .startsWith(this.#typeAhead),
      )?.node.id;
    } else return;
    event.preventDefault();
    if (next) {
      this._ofbUi.builder.select(next);
      this._ofbFocusSelected(inOutline);
    }
  };
  _ofbDestroy(): void {
    this.#unsubscribe();
    this._ofbCloseMini();
    this._ofbActions._ofbCloseMenu();
    this._ofbPointer._ofbDestroy();
    this._ofbRoot.removeEventListener("click", this.click);
    this._ofbRoot.removeEventListener("dblclick", this.doubleClick);
    this._ofbRoot.removeEventListener("keydown", this.keydown);
    this._ofbRoot.removeEventListener("focusin", this.followFocus);
    this.#targets.clear();
    this.#handles.clear();
    this.#items.clear();
    this.#collapsed.clear();
  }
}
