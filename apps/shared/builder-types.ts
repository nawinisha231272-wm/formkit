import type { BuilderController, SchemaChange } from "@ourform/builder";
declare global {
  interface Window {
    builderHost: BuilderController;
    builderChanges: SchemaChange[];
    builderDomEvents: SchemaChange[];
    builderDetach(): void;
    builderAttach(): void;
    builderTheme(theme: string): void;
  }
}
export function recordBuilderEvents(): void {
  window.builderChanges = [];
  window.builderDomEvents = [];
  document.addEventListener("of-schema-change", (event) =>
    window.builderDomEvents.push((event as CustomEvent<SchemaChange>).detail),
  );
}
