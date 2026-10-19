import { h } from "@ourform/sdk";
import type {
  ComponentViews,
  FieldControlProps,
  NativeView,
  PortableControl,
} from "@ourform/sdk";
export interface NativeUnit {
  update(props: FieldControlProps<unknown, Record<string, unknown>>): void;
  destroy(): void;
}
export interface NativeHost {
  mount(
    slot: HTMLElement,
    view: NativeView,
    props: FieldControlProps<unknown, Record<string, unknown>>,
  ): NativeUnit;
}
export function resolveView(
  type: string,
  views: ComponentViews | undefined,
  adapter: string,
): NativeView | PortableControl {
  const resolved =
    views?.native?.[adapter] ?? views?.packs?.[adapter] ?? views?.portable;
  if (!resolved)
    throw new Error(
      `no-view: No portable view or native view for ${type} in adapter ${adapter}`,
    );
  return resolved;
}
export function nativeSlot(
  view: NativeView,
  host: NativeHost,
): { portable: PortableControl; update(): void; destroy(): void } {
  let current: Parameters<PortableControl>[0];
  let unit: NativeUnit | undefined;
  const ref = (slot: HTMLElement | null): void => {
    if (slot && !unit) unit = host.mount(slot, view, current);
  };
  return {
    portable(props) {
      current = props;
      return h("div", { ref, "data-of-native": "" });
    },
    update() {
      unit?.update(current);
    },
    destroy() {
      unit?.destroy();
      unit = undefined;
    },
  };
}
