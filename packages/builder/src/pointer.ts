import { componentTitle } from "./types";
import type { DropTarget } from "@ourform/builder-core";
import type { ComponentNode } from "@ourform/schema";
import type { ComponentSlot } from "@ourform/sdk";
import { element } from "./types";
import type { UI } from "./types";

type Source = { type: string; label: string; id?: string };
type Rect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
};
type Slot = {
  target: DropTarget;
  label: string;
  depth: number;
  owner: HTMLElement;
  rect: Rect;
  children: { id: string; rect: Rect }[];
};
type Position = { slot: Slot; index: number; vertical?: boolean };
type Pending = {
  source: Source;
  x: number;
  y: number;
  pointerId: number;
  touch: boolean;
  timer?: ReturnType<typeof setTimeout>;
};
export interface PointerContext {
  root: HTMLElement;
  host: HTMLElement;
  palette: HTMLElement;
  outline: HTMLElement;
  scroll: HTMLElement;
  ui: UI;
  entries(): { node: ComponentNode; parent?: ComponentNode }[];
  slots(node: ComponentNode): readonly ComponentSlot[];
  caption(slot: ComponentSlot): string;
  children(parent: ComponentNode | undefined, slot?: string): ComponentNode[];
  location(
    id: string,
  ):
    | { parent?: ComponentNode; slot?: string | undefined; index: number }
    | undefined;
  expand(id: string): void;
  commit(source: Source, target: DropTarget, label: string): void;
}
/** Geometry is read at pickup and invalidation, never by the pointer-move handler. */
export class PointerDrag {
  #pending: Pending | undefined;
  origin: HTMLElement | undefined;
  #active:
    | { source: Source; keyboard: boolean; pointerId?: number }
    | undefined;
  #slots: Slot[] = [];
  #columnGroups: { slots: Slot[]; rect: Rect }[] = [];
  #position: Position | undefined;
  #origin: Rect | undefined;
  #clip: Rect | undefined;
  #ghost: HTMLElement;
  #line: HTMLElement;
  #feedback: HTMLElement;
  #cacheFrame = 0;
  #scrollFrame = 0;
  #velocity = 0;
  #hoverTimer: ReturnType<typeof setTimeout> | undefined;
  #hover: Element | undefined;
  #lastX = 0;
  #lastY = 0;
  #lastPosition = "";
  #preflightKey = "";
  #preflightDefinition: unknown;
  #preflight: ReturnType<UI["dispatch"]> = [];
  #hoverTargets: { element: HTMLElement; rect: Rect }[] = [];
  #suppressClick = false;
  #observer: ResizeObserver;
  #events = new AbortController();
  constructor(readonly context: PointerContext) {
    const { root, ui } = context;
    this.#ghost = element(ui.document, "div", "", "ofb-drag-ghost");
    this.#line = element(ui.document, "div", "", "ofb-insertion-line");
    this.#feedback = element(ui.document, "div", "", "ofb-drag-feedback");
    for (const node of [this.#ghost, this.#line, this.#feedback]) {
      node.hidden = true;
      node.setAttribute("aria-hidden", "true");
      root.append(node);
    }
    const signal = this.#events.signal;
    root.addEventListener("pointerdown", this.down, { signal });
    root.addEventListener("pointermove", this.move, { signal });
    root.addEventListener("pointerup", this.up, { signal });
    root.addEventListener("pointercancel", () => this.cancel(), { signal });
    root.addEventListener(
      "lostpointercapture",
      () => {
        if (this.#active?.pointerId !== undefined) this.cancel();
      },
      { signal },
    );
    root.addEventListener(
      "click",
      (event) => {
        if (this.#suppressClick && event.detail > 0) {
          this.#suppressClick = false;
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      { capture: true, signal },
    );
    root.addEventListener("keydown", this.keydown, { capture: true, signal });
    ui.document.addEventListener("scroll", this.invalidate, {
      capture: true,
      signal,
    });
    ui.document.defaultView!.addEventListener("resize", this.invalidate, {
      signal,
    });
    this.#observer = new ResizeObserver(this.invalidate);
    this.#observer.observe(context.host);
    this.#observer.observe(context.root);
  }
  get active() {
    return this.#active !== undefined;
  }
  #source(target: Element): Source | undefined {
    const { palette, outline, host } = this.context;
    if (target.closest<HTMLElement>('[role="treeitem"]')?.dataset.builderSlot)
      return;
    const add = target.closest<HTMLElement>("[data-type]");
    if (add && palette.contains(add))
      return {
        type: add.dataset.type!,
        label: add.textContent?.trim() ?? add.dataset.type!,
      };
    const source = target.closest<HTMLElement>(
      "[data-drag-id],[data-field-id]",
    );
    if (!source || (!host.contains(source) && !outline.contains(source)))
      return undefined;
    const id = source.dataset.dragId ?? source.dataset.fieldId;
    const node = this.context
      .entries()
      .find((entry) => entry.node.id === id)?.node;
    return node
      ? {
          id: node.id,
          type: node.type,
          label: componentTitle(this.context.ui, node),
        }
      : undefined;
  }
  down = (event: PointerEvent) => {
    if (event.button !== 0 || this.#active || this.#pending) return;
    this.#suppressClick = false;
    this.origin = this.context.ui.document.activeElement as
      | HTMLElement
      | undefined;
    const target = event.target as Element;
    const action =
      target.closest<HTMLElement>("[data-ofb-action]")?.dataset.ofbAction;
    if (
      (action && action !== "move") ||
      target.closest(
        "[data-of-tab],dialog,.ofb-settings,input:not(:disabled),textarea,select",
      )
    )
      return;
    const source = this.#source(target);
    if (!source) return;
    const pending: Pending = {
      source,
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
      touch: event.pointerType === "touch",
    };
    this.#pending = pending;
    if (pending.touch)
      pending.timer = setTimeout(() => {
        if (this.#pending === pending)
          this.start(source, false, event.pointerId);
      }, 300);
  };
  move = (event: PointerEvent) => {
    const pending = this.#pending;
    if (pending?.pointerId === event.pointerId && !this.#active) {
      if (Math.hypot(event.clientX - pending.x, event.clientY - pending.y) < 4)
        return;
      if (pending.touch) {
        this.#clearPending();
        return;
      }
      this.start(pending.source, false, event.pointerId);
    }
    if (
      !this.#active ||
      this.#active.keyboard ||
      this.#active.pointerId !== event.pointerId
    )
      return;
    event.preventDefault();
    this.#lastX = event.clientX;
    this.#lastY = event.clientY;
    this.#at(event.clientX, event.clientY);
    const hovered = this.#hoverTargets.find(
      (target) =>
        event.clientX >= target.rect.left &&
        event.clientX <= target.rect.right &&
        event.clientY >= target.rect.top &&
        event.clientY <= target.rect.bottom,
    );
    this.#hoverOpen(hovered?.element);
    const clip = this.#clip;
    if (clip) {
      const top = event.clientY - clip.top,
        bottom = clip.bottom - event.clientY;
      this.#velocity =
        top < 48
          ? -Math.max(1, (48 - top) / 3)
          : bottom < 48
            ? Math.max(1, (48 - bottom) / 3)
            : 0;
      if (this.#velocity && !this.#scrollFrame)
        this.#scrollFrame = requestAnimationFrame(this.#autoScroll);
    }
  };
  up = (event: PointerEvent) => {
    if (!this.#active) {
      this.#clearPending();
      return;
    }
    if (this.#active.keyboard || this.#active.pointerId !== event.pointerId)
      return;
    event.preventDefault();
    this.#at(event.clientX, event.clientY);
    this.#drop();
  };
  start(source: Source, keyboard: boolean, pointerId?: number): void {
    this.#clearPending();
    if (source.id && this.context.ui.builder.lockLevel(source.id) === "all") {
      this.context.ui.announce(this.context.ui.t("ofb.lock.move"));
      return;
    }
    if (source.id) this.context.ui.builder.select(source.id);
    this.#active = {
      source,
      keyboard,
      ...(pointerId === undefined ? {} : { pointerId }),
    };
    this.context.root.dataset.ofbDragging = "true";
    if (pointerId !== undefined) this.context.root.setPointerCapture(pointerId);
    this.#ghost.textContent = source.label;
    this.#ghost.hidden = false;
    this.#cache();
    this.context.ui.announce(
      this.context.ui.t("ofb.pickedUp", { label: source.label }),
    );
    if (keyboard && source.id) {
      const from = this.context.location(source.id);
      const slot = this.#slots.find(
        (slot) =>
          slot.target.parentId === from?.parent?.id &&
          (slot.target.slot ?? "children") === (from?.slot ?? "children"),
      );
      if (slot)
        this.#show({
          slot,
          index: Math.min(from?.index ?? 0, slot.children.length),
        });
    }
  }
  keyboard(id: string): void {
    if (this.active) return;
    const node = this.context
      .entries()
      .find((entry) => entry.node.id === id)?.node;
    if (node)
      this.start(
        { type: node.type, id, label: componentTitle(this.context.ui, node) },
        true,
      );
  }
  #cache() {
    if (!this.#active) return;
    const { root, host, scroll, entries, children, slots } = this.context;
    this.#origin = root.getBoundingClientRect();
    const frame = scroll.getBoundingClientRect(),
      form = host.getBoundingClientRect();
    this.#clip = {
      left: Math.max(frame.left, form.left),
      right: Math.min(frame.right, form.right),
      top: Math.max(frame.top, form.top),
      bottom: Math.min(frame.bottom, form.bottom),
      width: Math.min(frame.width, form.width),
      height: Math.min(frame.height, form.height),
    };
    const roots = new Map(
      [...host.querySelectorAll<HTMLElement>("[data-field-id]")].map((node) => [
        node.dataset.fieldId!,
        node,
      ]),
    );
    const all = entries();
    const parents = new Map(
      all.map((entry) => [entry.node.id, entry.parent?.id]),
    );
    const make = (
      parent: ComponentNode | undefined,
      name: string | undefined,
      label: string,
      owner: HTMLElement,
      depth: number,
    ): Slot | undefined => {
      const rect = owner.getBoundingClientRect();
      if (!rect.width || !rect.height) return undefined;
      return {
        target: parent
          ? { parentId: parent.id, ...(name ? { slot: name } : {}) }
          : {},
        label,
        depth,
        owner,
        rect,
        children: children(parent, name)
          .filter((node) => node.id !== this.#active?.source.id)
          .flatMap((node) => {
            const root = roots.get(node.id);
            if (!root) return [];
            const rect = root.getBoundingClientRect();
            return rect.height && rect.width ? [{ id: node.id, rect }] : [];
          }),
      };
    };
    this.#slots = [];
    const outer = make(
      undefined,
      undefined,
      this.context.ui.t("ofb.formRoot"),
      host,
      0,
    );
    if (outer) this.#slots.push(outer);
    for (const { node } of all) {
      const root = roots.get(node.id);
      if (!root || root.closest("[hidden]")) continue;
      let depth = 1,
        parent = parents.get(node.id);
      while (parent) {
        depth++;
        parent = parents.get(parent);
      }
      for (const slot of slots(node)) {
        const owner =
          [...root.querySelectorAll<HTMLElement>("[data-of-slot-owner]")].find(
            (owner) =>
              owner.dataset.ofSlotOwner === node.id &&
              owner.dataset.ofSlot === slot.name,
          ) ?? root;
        const target = make(
          node,
          slot.name,
          `${componentTitle(this.context.ui, node)} / ${this.context.caption(slot)}`,
          owner,
          depth,
        );
        if (target) this.#slots.push(target);
      }
    }
    this.#slots.sort((a, b) => b.depth - a.depth);
    this.#columnGroups = [];
    for (const { node } of all.filter((entry) => entry.node.columns)) {
      const columns = this.#slots.filter(
        (slot) => slot.target.parentId === node.id,
      );
      if (!columns.length) continue;
      const left = Math.min(...columns.map((c) => c.rect.left)),
        right = Math.max(...columns.map((c) => c.rect.right)),
        top = Math.min(...columns.map((c) => c.rect.top)),
        bottom = Math.max(...columns.map((c) => c.rect.bottom));
      this.#columnGroups.push({
        slots: columns,
        rect: {
          left,
          right,
          top,
          bottom,
          width: right - left,
          height: bottom - top,
        },
      });
    }
    this.#hoverTargets = [
      ...host.querySelectorAll<HTMLElement>(
        "[data-of-tab],[data-of-collapsed=true]",
      ),
    ]
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter((target) => target.rect.width && target.rect.height);
    this.#preflightKey = "";
  }
  invalidate = () => {
    if (!this.#active || this.#cacheFrame) return;
    this.#cacheFrame = requestAnimationFrame(() => {
      this.#cacheFrame = 0;
      this.#cache();
      if (!this.#active?.keyboard) this.#at(this.#lastX, this.#lastY);
    });
  };
  #at(x: number, y: number) {
    const bounds = this.#clip,
      origin = this.#origin;
    if (origin) {
      this.#ghost.style.setProperty(
        "--ofb-pointer-x",
        `${x - origin.left + 14}px`,
      );
      this.#ghost.style.setProperty(
        "--ofb-pointer-y",
        `${y - origin.top + 14}px`,
      );
    }
    if (
      !bounds ||
      x < bounds.left ||
      x > bounds.right ||
      y < bounds.top ||
      y > bounds.bottom
    ) {
      this.#position = undefined;
      this.#line.hidden = this.#feedback.hidden = true;
      return;
    }
    let slot = this.#slots.find(
      (slot) =>
        x >= slot.rect.left &&
        x <= slot.rect.right &&
        y >= slot.rect.top &&
        y <= slot.rect.bottom,
    );
    let vertical = false;
    const group = this.#columnGroups.find(
      (group) =>
        x >= group.rect.left &&
        x <= group.rect.right &&
        y >= group.rect.top &&
        y <= group.rect.bottom,
    );
    if (group) {
      const closest = group.slots.reduce((best, current) =>
        Math.abs(x - (current.rect.left + current.rect.right) / 2) <
        Math.abs(x - (best.rect.left + best.rect.right) / 2)
          ? current
          : best,
      );
      if (closest && (!slot || slot.depth <= closest.depth)) {
        slot = closest;
        vertical =
          x < slot.rect.left ||
          x > slot.rect.right ||
          Math.min(
            Math.abs(x - slot.rect.left),
            Math.abs(x - slot.rect.right),
          ) < 8;
      }
    }
    if (!slot) {
      this.#position = undefined;
      return;
    }
    const index = slot.children.findIndex(
      (child) => y < (child.rect.top + child.rect.bottom) / 2,
    );
    this.#show({
      slot,
      index: index < 0 ? slot.children.length : index,
      vertical,
    });
  }
  #show(position: Position) {
    const active = this.#active,
      origin = this.#origin;
    if (!active || !origin) return;
    const target = {
      ...position.slot.target,
      index: position.index,
      renameConflicts: true,
    };
    const key = JSON.stringify(target),
      definition = this.context.ui.builder.getState().definition;
    if (
      key !== this.#preflightKey ||
      definition !== this.#preflightDefinition
    ) {
      this.#preflightKey = key;
      this.#preflightDefinition = definition;
      this.#preflight = this.context.ui.builder.canDrop(
        active.source.type,
        target,
        active.source.id,
      );
    }
    const diagnostics = this.#preflight;
    const signature = JSON.stringify([target, diagnostics.map((d) => d.code)]);
    if (signature !== this.#lastPosition) {
      this.#lastPosition = signature;
      this.context.ui.announce(
        diagnostics.length
          ? this.context.ui.t("ofb.refused", {
              reason: diagnostics.map((d) => d.message).join(" · "),
            })
          : this.context.ui.t("ofb.position", {
              label: active.source.label,
              target: position.slot.label,
              index: position.index + 1,
              count: position.slot.children.length + 1,
            }),
      );
    }
    for (const slot of this.#slots) {
      delete slot.owner.dataset.ofbDropTarget;
      delete slot.owner.dataset.ofbDropRefused;
    }
    position.slot.owner.dataset.ofbDropTarget = "true";
    position.slot.owner.dataset.ofbDropRefused = String(!!diagnostics.length);
    this.#position = position;
    const y =
      position.slot.children[position.index]?.rect.top ??
      position.slot.children.at(-1)?.rect.bottom ??
      position.slot.rect.top + 12;
    this.#line.style.setProperty(
      "--ofb-line-x",
      `${position.slot.rect.left - origin.left}px`,
    );
    this.#line.style.setProperty("--ofb-line-y", `${y - origin.top}px`);
    this.#line.style.setProperty(
      "--ofb-line-width",
      `${position.slot.rect.width}px`,
    );
    this.#line.dataset.orientation = position.vertical
      ? "vertical"
      : "horizontal";
    if (position.vertical) {
      const edge =
        Math.abs(this.#lastX - position.slot.rect.left) <
        Math.abs(this.#lastX - position.slot.rect.right)
          ? position.slot.rect.left
          : position.slot.rect.right;
      this.#line.style.setProperty("--ofb-line-x", `${edge - origin.left}px`);
      this.#line.style.setProperty(
        "--ofb-line-y",
        `${position.slot.rect.top - origin.top}px`,
      );
      this.#line.style.setProperty(
        "--ofb-line-height",
        `${position.slot.rect.height}px`,
      );
    }
    this.#line.dataset.refused = String(!!diagnostics.length);
    this.#line.hidden = false;
    this.#feedback.textContent = diagnostics.length
      ? diagnostics.map((d) => d.message).join(" · ")
      : position.slot.label;
    this.#feedback.dataset.refused = String(!!diagnostics.length);
    this.#feedback.style.setProperty(
      "--ofb-pointer-x",
      `${position.slot.rect.left - origin.left}px`,
    );
    this.#feedback.style.setProperty(
      "--ofb-pointer-y",
      `${y - origin.top - 28}px`,
    );
    this.#feedback.hidden = false;
  }
  #hoverOpen(target: Element | undefined) {
    if (this.#hover === target) return;
    clearTimeout(this.#hoverTimer);
    this.#hover = target;
    if (target)
      this.#hoverTimer = setTimeout(() => {
        if (!this.active) return;
        const element = target as HTMLElement;
        if (element.dataset.ofTab) element.click();
        else if (element.dataset.fieldId)
          this.context.expand(element.dataset.fieldId);
        // Opening changes hit targets immediately; the next pointer event must use their new bounds.
        this.#cache();
      }, 600);
  }
  #autoScroll = () => {
    this.#scrollFrame = 0;
    if (!this.#active || !this.#velocity) return;
    this.context.scroll.scrollTop += this.#velocity;
    this.#scrollFrame = requestAnimationFrame(this.#autoScroll);
  };
  keydown = (event: KeyboardEvent) => {
    if (!this.#active) {
      this.origin = undefined;
      if (
        event.key !== " " ||
        (event.target as HTMLElement).matches("input,textarea,select")
      )
        return;
      const source = this.#source(event.target as Element);
      if (!source?.id) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      this.start(source, true);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.cancel();
      return;
    }
    if (!this.#active.keyboard) return;
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.#drop();
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      return;
    }
    if (!event.key.startsWith("Arrow") && !["Home", "End"].includes(event.key))
      return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const positions = this.#slots.flatMap((slot) =>
      Array.from({ length: slot.children.length + 1 }, (_, index) => ({
        slot,
        index,
      })),
    );
    const current = positions.findIndex(
      (position) =>
        position.slot === this.#position?.slot &&
        position.index === this.#position.index,
    );
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? positions.length - 1
          : Math.max(
              0,
              Math.min(
                positions.length - 1,
                current +
                  (["ArrowUp", "ArrowLeft"].includes(event.key) ? -1 : 1),
              ),
            );
    if (positions[next]) this.#show(positions[next]);
  };
  #drop() {
    const active = this.#active,
      position = this.#position;
    if (!active) return;
    const target = position
      ? {
          ...position.slot.target,
          index: position.index,
          renameConflicts: true,
        }
      : undefined;
    const errors = target
      ? this.context.ui.builder.canDrop(
          active.source.type,
          target,
          active.source.id,
        )
      : [];
    this.#suppressClick = !active.keyboard;
    this.#finish();
    if (!position || !target) {
      this.context.ui.announce(this.context.ui.t("ofb.dragCancelled"));
      return;
    }
    if (errors.length) {
      this.context.ui.announce(
        this.context.ui.t("ofb.refused", {
          reason: errors.map((d) => d.message).join(" · "),
        }),
      );
      return;
    }
    this.context.commit(active.source, target, position.slot.label);
  }
  #clearPending() {
    clearTimeout(this.#pending?.timer);
    this.#pending = undefined;
  }
  #finish() {
    const pointer = this.#active?.pointerId;
    this.#active = undefined;
    this.#clearPending();
    this.#position = undefined;
    clearTimeout(this.#hoverTimer);
    this.#hover = undefined;
    cancelAnimationFrame(this.#cacheFrame);
    cancelAnimationFrame(this.#scrollFrame);
    this.#cacheFrame = this.#scrollFrame = this.#velocity = 0;
    this.#ghost.hidden = this.#line.hidden = this.#feedback.hidden = true;
    delete this.context.root.dataset.ofbDragging;
    for (const slot of this.#slots) {
      delete slot.owner.dataset.ofbDropTarget;
      delete slot.owner.dataset.ofbDropRefused;
    }
    this.#slots = [];
    this.#columnGroups = [];
    this.#lastPosition = this.#preflightKey = "";
    this.#preflight = [];
    this.#hoverTargets = [];
    if (pointer !== undefined && this.context.root.hasPointerCapture(pointer))
      this.context.root.releasePointerCapture(pointer);
  }
  cancel(): void {
    const active = this.active;
    if (this.#active && !this.#active.keyboard) this.#suppressClick = true;
    this.#finish();
    if (active)
      this.context.ui.announce(this.context.ui.t("ofb.dragCancelled"));
  }
  destroy(): void {
    this.#finish();
    this.#events.abort();
    this.#observer.disconnect();
    this.#ghost.remove();
    this.#line.remove();
    this.#feedback.remove();
  }
}
