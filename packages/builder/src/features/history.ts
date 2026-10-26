import type { UI } from "../types";
/** Only the command-log view is deferred. The headless undo/redo stack is always available. */
export function mountHistory(host: HTMLElement, ui: UI, element: typeof import("../types").element) {
  ui._ofbStyle(
    host,
    "margin",
    "0",
    "padding-inline-start",
    "20px",
    "color",
    "var(--ofb-text-muted)",
    "line-height",
    "2",
  );
  const update = () => {
    host.replaceChildren();
    const past = ui.builder.getState().history.past;
    for (const command of past)
      host.append(element(ui.document, "li", ui.t(`ofb.history.${command.type}`, {
        label: ui.builder.commandLabel(command).label,
      })));
    if (!past.length) {
      const empty = ui.t("ofb.noHistory");
      host.append(element(ui.document, "li", empty === "ofb.noHistory" ? "Your edits will appear here." : empty));
    }
  };
  update();
  return { update };
}
