import type {
  Builder,
  Command,
  DropTarget,
  JsonPatchOp,
} from "@ourform/builder-core";
import type { Engine } from "@ourform/core";
import type { Diagnostic, FormDefinition } from "@ourform/schema";
import type { FormController, HostOptions } from "@ourform/renderer-dom";
import type { Theme, ThemeMode } from "@ourform/sdk";
export interface SchemaChange {
  readonly definition: FormDefinition;
  readonly patch: readonly JsonPatchOp[];
}
export interface BuilderOptions
  extends Omit<HostOptions, "onChange" | "readOnly" | "mode"> {
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
  destroy(): void;
}
export interface UI {
  document: Document;
  signal: AbortSignal;
  engine: Engine;
  builder: Builder;
  t(key: string, params?: Record<string, unknown>): string;
  dispatch(command: Command): Diagnostic[];
  announce(message: string): void;
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
  const el = element(ui.document, "button", text);
  el.type = "button";
  el.addEventListener("click", action, { signal: ui.signal });
  return el;
}
