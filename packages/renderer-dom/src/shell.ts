import type { CompiledNode, FormSession } from "@ourform/core";
import { defaultMessage, h, resolveConfig } from "@ourform/sdk";
import type {
  ComponentViews,
  FocusTarget,
  VNode,
  ShellVariant,
} from "@ourform/sdk";
import type { ResolvedTheme } from "./theme";
import { layoutVNode } from "./layout";
import type { LayoutInteraction } from "./layout";
export type Views = ReadonlyMap<string, ComponentViews>;
export interface FieldPresentation {
  help?: string;
  prefix?: string;
  suffix?: string;
  /** Accessible cell name, including column heading and stable row label. */
  cellLabel?: string;
}
export function fieldErrors(
  session: FormSession,
  entry: CompiledNode,
  t: typeof defaultMessage,
  label?: string,
): string[] {
  return session.getFieldState(entry.node.id).errors.map((error) =>
    t(
      error.code === "required" && error.messageKey === "of.validation.required"
        ? "of.required"
        : error.messageKey,
      {
        ...error.params,
        label: label ?? entry.node.label ?? entry.node.key ?? entry.node.id,
      },
    ),
  );
}
export function shellVNode(
  session: FormSession,
  entry: CompiledNode,
  views: Views,
  theme: ResolvedTheme,
  prefix: string,
  focusRef: (target: FocusTarget | null) => void,
  presentation: FieldPresentation = {},
  t: typeof defaultMessage = defaultMessage,
  actions?: { submit(): void; reset(): void; emit(name: string): void },
  onBlur?: () => void,
  layoutInteraction: LayoutInteraction = {},
  styleClass?: (key: string, declarations: string) => string,
): VNode {
  presentation = {
    ...presentation,
    ...(presentation.prefix === undefined && entry.node.prefix
      ? { prefix: entry.node.prefix }
      : {}),
    ...(presentation.suffix === undefined && entry.node.suffix
      ? { suffix: entry.node.suffix }
      : {}),
  };
  const design = layoutInteraction.mode === "design";
  const state = session.getFieldState(entry.node.id);
  const view = views.get(entry.node.type);
  const variant: ShellVariant = entry.model.value
    ? (view?.shell ?? "field")
    : "none";
  const id = `${prefix}${entry.node.id}`;
  const cl = (part: Parameters<ResolvedTheme["classFor"]>[1]) =>
    theme.classFor(variant, part);
  const translatedLabel = entry.node.labelKey
    ? t(entry.node.labelKey)
    : undefined;
  const label =
    presentation.cellLabel ??
    (translatedLabel !== entry.node.labelKey ? translatedLabel : undefined) ??
    entry.node.label ??
    entry.node.key ??
    entry.node.id;
  const accessibleLabel = design
    ? t("of.builder.designField", {
        label: entry.node.ariaLabel ?? label,
      })
    : typeof entry.node.ariaLabel === "string" && entry.node.ariaLabel
      ? entry.node.ariaLabel
      : undefined;
  const declarations = Object.entries({
    ...theme.tokens,
    "--of-column-span": String(entry.node.layout?.width ?? 12),
  })
    .map(([key, value]) => `${key}:${value}`)
    .join(";");
  const rootProps = {
    key: entry.node.id,
    ...(entry.node.tooltip ? { title: entry.node.tooltip } : {}),
    "data-field-id": entry.node.id,
    "data-of-shell": variant,
    "data-of-pending": String(state.pending),
    "data-of-readonly": String(state.readOnly),
    "data-of-disabled": String(state.disabled),
    ...(design ? { "data-of-design-node": entry.node.id } : {}),
    hidden: !state.visible && !design,
    class: `${cl("root")}${styleClass ? ` ${styleClass(entry.node.id, declarations)}` : ""}`,
    ...(styleClass ? {} : { style: declarations }),
  };
  if (view?.layout || (entry.model.slots && !entry.model.value))
    return layoutVNode(
      entry,
      view?.layout ?? { tag: "div" },
      rootProps,
      state,
      prefix,
      layoutInteraction,
      t,
      styleClass,
    );
  if (!entry.model.value && !view?.portable)
    return h(
      "div",
      rootProps,
      entry.node.label || entry.node.labelKey ? h("h3", null, label) : null,
    );
  if (!view?.portable) throw new Error(`No portable view: ${entry.node.type}`);
  const config = resolveConfig(
    entry.model.properties ?? {},
    entry.node.properties ?? {},
  );
  if (!config.ok) throw new Error("Compiled config is invalid.");
  const errors = fieldErrors(session, entry, t, label);
  const described = [
    entry.node.description ? `${id}_description` : "",
    presentation.help ? `${id}_help` : "",
    state.pending ? `${id}_pending` : "",
    errors.length ? `${id}_error` : "",
    variant === "group" && state.required ? `${id}_required` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const control = view.portable({
    value: state.value,
    setValue: (next) => {
      if (!design && entry.model.value)
        session.setValue(state.path, next, { source: "user" });
    },
    onBlur: design
      ? () => {}
      : (onBlur ??
        (() => {
          if (entry.model.value) session.touch(state.path);
        })),
    config: config.config,
    ...(actions && !design ? { actions } : {}),
    ...(entry.node.placeholder === undefined || design
      ? {}
      : { placeholder: entry.node.placeholder }),
    state: {
      disabled: state.disabled,
      readOnly: state.readOnly,
      invalid: !!errors.length,
      pending: state.pending,
      required: state.required,
    },
    a11y: {
      id,
      name: entry.node.key ?? entry.node.id,
      labelledBy: `${id}_label`,
      ...(described ? { describedBy: described } : {}),
      ...(errors.length ? { errorId: `${id}_error` } : {}),
    },
    focusRef,
    theme: { classFor: (part) => cl(part as Parameters<typeof cl>[0]) },
    t,
  });
  if (variant === "none")
    return h(
      "div",
      rootProps,
      design
        ? h(
            control.tag,
            { ...control.props, inert: true, "aria-hidden": "true" },
            ...control.children,
          )
        : control,
    );
  const labelNode = h(
    variant === "group" ? "legend" : "label",
    {
      key: "label",
      ...(variant === "group" ? {} : { for: id }),
      class: cl("label"),
    },
    h(
      "span",
      {
        id: `${id}_label`,
        ...(accessibleLabel ? { class: "of-sr-only" } : {}),
      },
      accessibleLabel ?? label,
    ),
    accessibleLabel ? h("span", { "aria-hidden": "true" }, label) : null,
    h(
      "span",
      {
        key: "required",
        id: `${id}_required`,
        "aria-hidden": "true",
        class: cl("required"),
        hidden: !state.required,
      },
      ` ${t("of.requiredMarker")}`,
    ),
  );
  const controlWrapper = h(
    "div",
    {
      key: "wrapper",
      class: cl("controlWrapper"),
      ...(design ? { inert: true, "aria-hidden": "true" } : {}),
    },
    h(
      "span",
      { key: "prefix", class: cl("prefix"), hidden: !presentation.prefix },
      presentation.prefix,
    ),
    control,
    h(
      "span",
      { key: "suffix", class: cl("suffix"), hidden: !presentation.suffix },
      presentation.suffix,
    ),
  );
  const description = h(
    "small",
    {
      key: "description",
      id: `${id}_description`,
      class: cl("description"),
      hidden: !entry.node.description,
    },
    entry.node.description,
  );
  return h(
    variant === "group" ? "fieldset" : "div",
    {
      ...rootProps,
      ...(variant === "group"
        ? {
            "aria-labelledby": `${id}_label`,
            "aria-describedby": described || undefined,
            disabled: state.disabled,
          }
        : {}),
    },
    variant !== "inline" ? labelNode : null,
    description,
    controlWrapper,
    h(
      "small",
      {
        key: "pending",
        id: `${id}_pending`,
        class: cl("help"),
        hidden: !state.pending,
      },
      t("of.validation.pending"),
    ),
    variant === "inline" ? labelNode : null,
    h(
      "small",
      {
        key: "help",
        id: `${id}_help`,
        class: cl("help"),
        hidden: !presentation.help,
      },
      presentation.help,
    ),
    h(
      errors.length === 1 ? "p" : "ul",
      {
        key: "errors",
        id: `${id}_error`,
        class:
          errors.length === 1 ? `${cl("errors")} ${cl("error")}` : cl("errors"),
        hidden: !errors.length,
      },
      errors.length === 1
        ? errors[0]
        : errors.map((error, i) =>
            h("li", { key: i, class: cl("error") }, error),
          ),
    ),
  );
}
