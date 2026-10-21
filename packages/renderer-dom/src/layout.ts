import { resolveSlots, h } from "@ourform/sdk";
import type { VNode, VNodeProps, LayoutView } from "@ourform/sdk";
import type { CompiledNode, FieldState } from "@ourform/core";

export interface LayoutInteraction {
  mode?: "edit" | "design";
  activeSlot?: string;
  selectSlot?: (slot: string, focus: boolean) => void;
}
export function layoutVNode(
  entry: CompiledNode,
  layout: LayoutView,
  root: VNodeProps,
  state: FieldState,
  prefix: string,
  interaction: LayoutInteraction,
  t: (key: string) => string,
): VNode {
  const id = `${prefix}${entry.node.id}`;
  const slots = resolveSlots(entry.model, entry.node);
  const caption = (slot: (typeof slots)[number]): string => {
    const translated = slot.labelKey ? t(slot.labelKey) : undefined;
    return translated === undefined || translated === slot.labelKey
      ? slot.label
      : translated;
  };
  const tabs = !!layout.tabs && interaction.mode !== "design";
  const active = slots.some((slot) => slot.name === interaction.activeSlot)
    ? interaction.activeSlot
    : slots[0]?.name;
  const tabId = (name: string) => `${id}_tab_${name}`;
  const panelId = (name: string) => `${id}_panel_${name}`;
  return h(
    layout.tag,
    {
      ...root,
      id,
      class: `${root.class} of-layout of-${entry.node.type}${layout.columns ? " of-columns" : ""}`,
      ...(entry.node.label && layout.tag !== "fieldset"
        ? { "aria-labelledby": `${id}_label` }
        : {}),
      ...(entry.node.label && layout.tag === "div" ? { role: "group" } : {}),
      ...(entry.node.description
        ? { "aria-describedby": `${id}_description` }
        : {}),
    },
    entry.node.label
      ? h(
          layout.tag === "fieldset" ? "legend" : "h3",
          { key: "heading", id: `${id}_label`, class: "of-layout-title" },
          entry.node.label,
        )
      : null,
    entry.node.description
      ? h(
          "p",
          {
            key: "description",
            id: `${id}_description`,
            class: "of-description",
          },
          entry.node.description,
        )
      : null,
    tabs
      ? h(
          "div",
          {
            key: "tablist",
            role: "tablist",
            class: "of-tablist",
            "aria-label": entry.node.label ?? entry.model.title,
          },
          slots.map((slot, index) =>
            h(
              "button",
              {
                key: slot.name,
                type: "button",
                role: "tab",
                id: tabId(slot.name),
                "data-of-tab": slot.name,
                "aria-selected": String(active === slot.name),
                "aria-controls": panelId(slot.name),
                tabindex: active === slot.name ? 0 : -1,
                disabled: state.disabled,
                onclick: () => interaction.selectSlot?.(slot.name, false),
                onkeydown: (event: Event) => {
                  const key = (event as KeyboardEvent).key;
                  const target =
                    key === "Home"
                      ? 0
                      : key === "End"
                        ? slots.length - 1
                        : key === "ArrowRight"
                          ? (index + 1) % slots.length
                          : key === "ArrowLeft"
                            ? (index + slots.length - 1) % slots.length
                            : undefined;
                  if (target !== undefined) {
                    event.preventDefault();
                    interaction.selectSlot?.(slots[target]!.name, true);
                  }
                },
              },
              caption(slot),
            ),
          ),
        )
      : null,
    entry.node.columns || layout.tabs || slots.length > 1
      ? slots.map((slot) =>
          h(
            "div",
            {
              key: `slot-${slot.name}`,
              id: panelId(slot.name),
              "data-of-slot": slot.name,
              "data-of-slot-owner": entry.node.id,
              class: entry.node.columns ? "of-column" : "of-slot",
              ...(entry.node.columns
                ? {
                    style: `--of-column-span:${entry.node.columns[slots.indexOf(slot)]!.width}`,
                  }
                : {}),
              ...(tabs
                ? {
                    role: "tabpanel",
                    "aria-labelledby": tabId(slot.name),
                    tabindex: 0,
                    hidden: active !== slot.name,
                  }
                : {
                    role: "group",
                    ...(entry.node.columns && interaction.mode !== "design"
                      ? { "aria-label": caption(slot) }
                      : { "aria-labelledby": `${id}_slot_${slot.name}` }),
                  }),
            },
            tabs || (entry.node.columns && interaction.mode !== "design")
              ? null
              : h(
                  "h4",
                  {
                    key: "slot-heading",
                    id: `${id}_slot_${slot.name}`,
                    class: "of-slot-title",
                  },
                  caption(slot),
                ),
          ),
        )
      : null,
  );
}
