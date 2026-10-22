import type { UI } from "./types";
import { element } from "./types";
import { actionButton, tabs } from "./primitives";
import { describeExpression, controlledFields } from "./signals";

interface Context {
  host: HTMLElement;
  outline: HTMLElement;
  legacy: HTMLElement;
  ui: UI;
}
/** Outline, diagnostics and history are views of the same headless builder state. */
export function sidebar({ host, outline, legacy, ui }: Context) {
  const context = {
    document: ui.document,
    signal: ui.signal,
    ...(ui.icons ? { icons: ui.icons } : {}),
  };
  const issues = element(ui.document, "div", "", "ofb-sidebar-issues");
  const history = element(ui.document, "ol", "", "ofb-sidebar-history");
  const panel = element(ui.document, "div", "", "ofb-sidebar-panel");
  const info = element(ui.document, "section", "", "ofb-component-info");
  const title = element(ui.document, "h3");
  const caption = element(ui.document, "small");
  const summary = element(ui.document, "dl");
  const edit = actionButton(
    context,
    ui.t("ofb.editSettings"),
    () => {
      const id = ui.builder.getState().selection;
      if (id) ui.edit?.(id);
    },
    { variant: "primary" },
  );
  const json = actionButton(
    context,
    ui.t("ofb.editJson"),
    () => {
      const id = ui.builder.getState().selection;
      if (id) ui.edit?.(id, true);
    },
    { icon: "json" },
  );
  const controls = element(ui.document, "div", "", "ofb-info-actions");
  controls.append(edit, json);
  const hint = element(ui.document, "small", ui.t("ofb.selectedHelp"));
  info.append(title, caption, summary, controls, hint);
  const advanced = element(ui.document, "details", "", "ofb-advanced-actions");
  advanced.append(
    element(ui.document, "summary", ui.t("ofb.moreActions")),
    legacy,
  );
  const id = `ofb-sidebar-${globalThis.crypto.randomUUID()}`;
  const bar = tabs(
    context,
    ui.t("ofb.inspector"),
    [
      { value: "outline", label: ui.t("ofb.outline") },
      { value: "issues", label: ui.t("ofb.issues", { count: 0 }) },
      { value: "history", label: ui.t("ofb.history") },
    ],
    "outline",
    show,
  );
  for (const button of bar.buttons) {
    button.id = `${id}-${button.dataset.tab}`;
    button.setAttribute("aria-controls", id);
  }
  panel.id = id;
  panel.setAttribute("role", "tabpanel");
  panel.append(outline, issues, history);
  host.replaceChildren(bar.element, panel, info, advanced);
  function show(value: string) {
    bar.set(value);
    outline.hidden = value !== "outline";
    issues.hidden = value !== "issues";
    history.hidden = value !== "history";
    panel.setAttribute("aria-labelledby", `${id}-${value}`);
  }
  let definition:
    | ReturnType<UI["builder"]["getState"]>["definition"]
    | undefined;
  let diagnostics: ReturnType<UI["engine"]["compile"]>["diagnostics"] = [];
  function update() {
    const state = ui.builder.getState();
    if (definition !== state.definition) {
      definition = state.definition;
      diagnostics = ui.engine.compile(definition).diagnostics;
      issues.replaceChildren();
      for (const diagnostic of diagnostics) {
        const button = actionButton(context, diagnostic.message, () => {
          if (diagnostic.componentId) {
            ui.builder.select(diagnostic.componentId);
            ui.reveal?.(diagnostic.componentId);
            show("outline");
          }
        });
        issues.append(button);
      }
      if (!diagnostics.length)
        issues.append(element(ui.document, "p", ui.t("ofb.noIssues")));
      const issueButton = bar.buttons.find((b) => b.dataset.tab === "issues")!;
      issueButton.textContent = ui.t("ofb.issues", {
        count: diagnostics.length,
      });
      issueButton.setAttribute("aria-label", issueButton.textContent);
      history.replaceChildren();
      for (const command of state.history.past)
        history.append(
          element(ui.document, "li", ui.t(`ofb.command.${command.type}`)),
        );
      if (!state.history.past.length)
        history.append(element(ui.document, "li", ui.t("ofb.noHistory")));
    }
    const form = ui.form?.(),
      entry = state.selection ? form?.byId[state.selection] : undefined;
    info.hidden = !entry;
    if (!entry) return;
    title.textContent = entry.node.label ?? entry.model.title;
    caption.textContent = ui.t("ofb.componentCaption", {
      type: ui.t(entry.model.builder?.title ?? entry.model.title),
      key: entry.node.key ?? "—",
    });
    summary.replaceChildren();
    const line = (label: string, value: string) =>
      summary.append(
        element(ui.document, "dt", ui.t(label)),
        element(ui.document, "dd", value),
      );
    line(
      "ofb.required",
      ui.t(entry.node.validation?.required ? "ofb.yes" : "ofb.no"),
    );
    line(
      "ofb.visible",
      entry.node.visibleWhen === undefined
        ? ui.t("ofb.always")
        : describeExpression(entry.node.visibleWhen, form!, ui.t),
    );
    line(
      "ofb.logic",
      ui.t("ofb.controls", {
        count: entry.model.value ? controlledFields(form!, entry.node.id) : 0,
      }),
    );
    line(
      "ofb.path",
      entry.path.map((p) => (typeof p === "string" ? p : p.row)).join("."),
    );
    const all = ui.builder.lockLevel(entry.node.id) === "all";
    edit.disabled = all;
    edit.title = all ? ui.t("ofb.lock.edit") : "";
  }
  show("outline");
  update();
  return { show, update };
}
