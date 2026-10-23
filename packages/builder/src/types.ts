import type {
  Builder,
  Command,
  DropTarget,
  JsonPatchOp,
  LockOptions,
  DispatchOptions,
} from "@ourform/builder-core";
import type { Engine, CompiledForm } from "@ourform/core";
import type { Diagnostic, FormDefinition } from "@ourform/schema";
import type { FormController, HostOptions } from "@ourform/renderer-dom";
import { resolveSlots } from "@ourform/sdk";
import type { Theme, ThemeMode, BuilderTheme } from "@ourform/sdk";
import type { ChromeOptions } from "./theme";
import type { BuilderIcons } from "./icons";
import { actionButton } from "./primitives";
export type ToolbarAction =
  | "edit"
  | "move"
  | "duplicate"
  | "copy"
  | "paste"
  | "json"
  | "more"
  | "delete";
export interface PaletteOptions {
  groups?: readonly string[];
  hidden?: readonly string[];
  order?: Readonly<Record<string, number>>;
}
export interface EditorOptions {
  mode?: "modal" | "drawer";
  openOnAdd?: boolean;
  tabs?: { hide?: readonly string[] };
  properties?: Readonly<Record<string, { hide?: readonly string[] }>>;
}
export interface SchemaChange {
  readonly definition: FormDefinition;
  readonly patch: readonly JsonPatchOp[];
}
export interface BuilderOptions
  extends Omit<HostOptions, "onChange" | "readOnly" | "mode">,
    LockOptions {
  chrome?: ChromeOptions;
  /** Browser-profile preference namespace; hosts may supply an authenticated user-specific key. */
  preferenceKey?: string;
  builderThemes?: readonly BuilderTheme[];
  palette?: PaletteOptions;
  toolbar?: { actions?: readonly ToolbarAction[] };
  editor?: EditorOptions;
  icons?: BuilderIcons;
  messages?: Readonly<Record<string, string>>;
  historyLimit?: number;
  onSchemaChange?: (change: SchemaChange) => void;
  onPreviewReady?: (controller: FormController | undefined) => void;
}
export interface BuilderController {
  readonly engine: Engine;
  readonly builder: Builder;
  readonly preview: FormController | undefined;
  load(definition: unknown): Diagnostic[];
  selectSlot(target: DropTarget): Diagnostic[];
  setTheme(theme: Theme | string): void;
  setMode(mode: ThemeMode): void;
  setChrome(options: ChromeOptions): void;
  markSaved(): void;
  markSaveFailed(message: string): void;
  destroy(): void;
}
export interface UI {
  document: Document;
  signal: AbortSignal;
  engine: Engine;
  builder: Builder;
  t(key: string, params?: Record<string, unknown>): string;
  dispatch(command: Command, options?: DispatchOptions): Diagnostic[];
  announce(message: string, action?: { label: string; run(): void }): void;
  liveProperties?: boolean;
  propertyIssue?: (key: string, message: string | undefined) => void;
  form?: () => CompiledForm | undefined;
  reveal?: (id: string) => void;
  edit?: (id: string, json?: boolean) => void;
  palette?: PaletteOptions;
  actions?: readonly ToolbarAction[];
  icons?: BuilderIcons;
  add?: (
    type: string,
    target: DropTarget,
    origin?: HTMLElement,
  ) => Diagnostic[];
}
export function element<K extends keyof HTMLElementTagNameMap>(
  document: Document,
  tag: K,
  text = "",
  className = "",
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.textContent = text;
  el.className = className;
  return el;
}
export function button(
  ui: Pick<UI, "document" | "signal">,
  text: string,
  action: () => void,
): HTMLButtonElement {
  return actionButton(ui, text, action);
}

export function componentTitle(
  ui: Pick<UI, "engine" | "t">,
  node: import("@ourform/schema").ComponentNode,
): string {
  const model = ui.engine.getField(node.type);
  return (
    node.label?.trim() ||
    ui.t(model?.builder?.title ?? model?.title ?? node.type)
  );
}

export function componentLocation(
  ui: Pick<UI, "engine" | "t">,
  form: CompiledForm,
  id: string,
): string {
  const labels: string[] = [];
  let entry = form.byId[id];
  while (entry) {
    labels.unshift(componentTitle(ui, entry.node));
    const parent: CompiledForm["byId"][string] | undefined = entry.parentId
      ? form.byId[entry.parentId]
      : undefined;
    if (parent) {
      const slots = resolveSlots(parent.model, parent.node);
      const slot =
        slots.length > 1
          ? slots.find((s) => s.name === entry!.parentSlot)
          : undefined;
      if (slot) {
        const translated = slot.labelKey ? ui.t(slot.labelKey) : slot.label;
        labels.unshift(translated === slot.labelKey ? slot.label : translated);
      }
    }
    entry = parent;
  }
  return [ui.t("ofb.formRoot"), ...labels].join(" › ");
}
