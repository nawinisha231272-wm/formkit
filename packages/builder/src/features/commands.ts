import { componentChildren } from "@ourform/schema";
import type { ComponentNode, FormDefinition } from "@ourform/schema";
import type { DropTarget } from "@ourform/builder-core";
import { paletteGroups } from "../palette";
import { componentTitle, button, element } from "../types";
import type { UI } from "../types";
import { labelledInput } from "../primitives";

export function createCommandIndex() {
  let previous: FormDefinition | undefined;
  let pending: Promise<readonly ComponentNode[]> | undefined;
  let visits = 0;
  return {
    get visits() {
      return visits;
    },
    load(definition: FormDefinition) {
      if (previous === definition) return pending!;
      previous = definition;
      visits = 0;
      pending = (async () => {
        const nodes: ComponentNode[] = [];
        const stack = [...definition.components].reverse();
        while (stack.length) {
          const node = stack.pop()!;
          visits++;
          nodes.push(node);
          stack.push(...[...componentChildren(node)].reverse());
          if (nodes.length % 50 === 0 && stack.length)
            await new Promise<void>((resolve) => setTimeout(resolve, 0));
        }
        return nodes;
      })();
      return pending;
    },
  };
}
const indexes = new WeakMap<
  UI["builder"],
  ReturnType<typeof createCommandIndex>
>();
export function mountCommands(
  host: HTMLElement,
  ui: UI,
  options: {
    selection(): readonly string[];
    target(): DropTarget;
    jump(id: string): void;
    action(
      action:
        | "edit"
        | "move"
        | "duplicate"
        | "copy"
        | "paste"
        | "wrap"
        | "delete"
        | "required",
      ids: readonly string[],
    ): void;
    close(): void;
  },
) {
  host.removeAttribute("aria-busy");
  host.replaceChildren();
  const search = labelledInput(ui, ui.t("ofb.commandSearch"), "search");
  const input = search.input as HTMLInputElement;
  const results = element(ui.document, "div");
  ui._ofbStyle(host, "display", "grid", "gap", "12px");
  ui._ofbStyle(search.wrapper, "display", "grid", "gap", "6px");
  ui._ofbStyle(
    results,
    "display",
    "grid",
    "gap",
    "6px",
    "max-block-size",
    "55vh",
    "overflow",
    "auto",
  );
  host.append(search.wrapper, results);
  const index = indexes.get(ui.builder) ?? createCommandIndex();
  indexes.set(ui.builder, index);
  let nodes: readonly ComponentNode[] = [];
  let generation = 0;
  const draw = () => {
    results.replaceChildren();
    const query = input.value.trim().toLowerCase();
    const append = (
      group: string,
      items: { label: string; run(): void; reason?: string }[],
    ) => {
      const matches = items
        .filter((item) => item.label.toLowerCase().includes(query))
        .slice(0, 30);
      if (!matches.length) return;
      results.append(element(ui.document, "h3", ui.t(group)));
      for (const item of matches) {
        const control = button(ui, item.label, () => {
          if (item.reason) return ui.announce(item.reason);
          options.close();
          item.run();
        });
        if (item.reason) {
          control.setAttribute("aria-disabled", "true");
          control.title = item.reason;
        }
        results.append(control);
      }
    };
    append(
      "ofb.commandAdd",
      paletteGroups(ui)
        .flatMap((group) => group.components)
        .filter(
          (item) =>
            !ui.builder
              .canDrop(item.type, options.target())
              .some((d) => d.severity === "error"),
        )
        .map((item) => ({
          label: ui.t("ofb.addType", { title: ui.t(item.title) }),
          run: () => {
            ui.add!(item.type, options.target());
          },
        })),
    );
    append(
      "ofb.commandJump",
      nodes.map((node) => ({
        label: componentTitle(ui, node),
        run: () => options.jump(node.id),
      })),
    );
    const ids = options.selection();
    append(
      "ofb.commandActions",
      (
        [
          "edit",
          "move",
          "duplicate",
          "copy",
          "paste",
          "wrap",
          "delete",
          "required",
        ] as const
      ).map((action) => ({
        label:
          ids.length > 1
            ? ui.t("ofb.bulkAction", {
                action: ui.t(`ofb.${action}`),
                count: ids.length,
              })
            : ui.t(`ofb.${action}`),
        ...(ids.length === 0 ? { reason: ui.t("ofb.singleAction") } : {}),
        run: () => options.action(action, ids),
      })),
    );
  };
  input.addEventListener(
    "input",
    () => {
      generation++;
      queueMicrotask(draw);
    },
    { signal: ui.signal },
  );
  host.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        options.close();
      }
      const controls = [
        ...results.querySelectorAll<HTMLButtonElement>("button"),
      ];
      if (["ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        const current = controls.indexOf(
          ui.document.activeElement as HTMLButtonElement,
        );
        controls[
          (current + (event.key === "ArrowDown" ? 1 : controls.length - 1)) %
            controls.length
        ]?.focus();
      } else if (event.key === "Enter" && ui.document.activeElement === input) {
        event.preventDefault();
        controls[0]?.click();
      }
    },
    { signal: ui.signal },
  );
  draw();
  input.focus();
  const request = generation;
  void index.load(ui.builder.getState().definition).then((value) => {
    if (!host.isConnected || ui.signal.aborted) return;
    nodes = value;
    if (request <= generation) draw();
  });
}
