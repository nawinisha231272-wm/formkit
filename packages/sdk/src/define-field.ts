import type {
  ComponentModel,
  ConfigOf,
  PropertyMap,
  ValueAdapter,
} from "@ourform/core";
import type { FieldControlProps, ShellVariant } from "./contracts";
import type { VNode, VNodeProps } from "./vnode";
import { resolveConfig } from "./config";
export type PortableControl<V = unknown, C = Record<string, unknown>> = (
  props: FieldControlProps<V, C>,
) => VNode;
export interface FieldDefinition<
  V = unknown,
  P extends PropertyMap = PropertyMap,
> {
  model: ComponentModel<V> & {
    properties: P;
    kind: "field";
    builder: {
      title: string;
      group: string;
      icon?: string;
      caption?: string | false;
    };
  };
  properties: P;
  shell: ShellVariant;
  views: { portable: PortableControl; shell?: ShellVariant };
}
export function defineField<
  V,
  P extends PropertyMap = Record<never, never>,
>(spec: {
  type: string;
  title: string;
  group?: string;
  icon?: string;
  caption?: string | false;
  value: ValueAdapter<V>;
  validators?: readonly string[];
  properties?: P;
  shell?: ShellVariant;
  control: PortableControl<V, ConfigOf<P>>;
}): FieldDefinition<V, P> {
  const properties = spec.properties ?? ({} as P);
  const defaults = resolveConfig(properties);
  if (!defaults.ok)
    throw new Error(defaults.diagnostics.map((d) => d.message).join("; "));
  const freeze = (v: unknown): void => {
    if (v !== null && typeof v === "object") {
      Object.values(v).forEach(freeze);
      Object.freeze(v);
    }
  };
  const copy: P = JSON.parse(JSON.stringify(properties));
  freeze(copy);
  const builder = Object.freeze({
    title: spec.title,
    group: spec.group ?? "Fields",
    ...(spec.icon ? { icon: spec.icon } : {}),
    ...(spec.caption !== undefined ? { caption: spec.caption } : {}),
  });
  const model = Object.freeze({
    type: spec.type,
    title: spec.title,
    kind: "field" as const,
    value: Object.freeze({ ...spec.value }),
    ...(spec.validators
      ? { validators: Object.freeze([...spec.validators]) }
      : {}),
    properties: copy,
    builder,
  });
  return Object.freeze({
    model,
    properties: copy,
    shell: spec.shell ?? "field",
    views: Object.freeze({
      shell: spec.shell ?? "field",
      portable: (props: FieldControlProps<unknown, Record<string, unknown>>) =>
        spec.control(props as FieldControlProps<V, ConfigOf<P>>),
    }),
  });
}
export function controlAttributes<V, C>(
  p: FieldControlProps<V, C>,
  role?: "group",
): VNodeProps {
  return {
    id: p.a11y.id,
    name: p.a11y.name,
    "aria-labelledby": p.a11y.labelledBy,
    "aria-describedby": p.a11y.describedBy,
    "aria-invalid": String(p.state.invalid),
    "aria-busy": String(p.state.pending),
    "aria-readonly": role === "group" ? undefined : String(p.state.readOnly),
    "aria-required": role === "group" ? undefined : String(p.state.required),
    ...(role ? { role } : {}),
    disabled: p.state.disabled,
    readOnly: p.state.readOnly,
    ...(role || p.placeholder === undefined
      ? {}
      : { placeholder: p.placeholder }),
    ref: (element: HTMLElement | null) => p.focusRef(element),
  };
}
