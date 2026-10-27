import type { ComponentModel, PropertyMap } from "@ourform/core";
import { resolveSlots } from "@ourform/core";
import type { LayoutView, RegisteredField } from "./native";
import { defineDisplay } from "./define-display";
import { h } from "./vnode";
/** Declarative child-owning layout; renderer mounts independently keyed children into its root. */
export function defineLayout(spec: {
  type: string;
  title: string;
  caption?: string | false;
  dataScope?: "none" | "object";
  tag?: LayoutView["tag"];
  columns?: boolean;
  properties?: PropertyMap;
  slots?: ComponentModel["slots"];
  tabs?: boolean;
  rootOnly?: boolean;
}): RegisteredField {
  const metadata = defineDisplay({
    type: spec.type,
    title: spec.title,
    properties: spec.properties ?? {},
    control: () => h("div", null),
  });
  const model: ComponentModel = Object.freeze({
    ...metadata.model,
    kind: "layout",
    dataScope: spec.dataScope ?? "none",
    ...(spec.slots === undefined
      ? {}
      : {
          slots:
            typeof spec.slots === "function"
              ? spec.slots
              : resolveSlots(
                  {
                    type: spec.type,
                    title: spec.title,
                    kind: "layout",
                    slots: spec.slots,
                  },
                  { id: "layout", type: spec.type },
                ),
        }),
    builder: Object.freeze({
      title: spec.title,
      group: "Layouts",
      ...(spec.caption !== undefined ? { caption: spec.caption } : {}),
      ...(spec.rootOnly ? { rootOnly: true } : {}),
    }),
  });
  return Object.freeze({
    model,
    views: Object.freeze({
      layout: Object.freeze({
        tag: spec.tag ?? "div",
        columns: spec.columns ?? false,
        ...(spec.tabs ? { tabs: true } : {}),
      }),
    }),
  });
}
