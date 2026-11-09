import type { FeatureLoader } from "./feature-loader";
import { featureOutlet } from "./feature-outlet";
import type { UI } from "./types";
import type { Diagnostic } from "@ourform/schema";
import { builderIssues } from "./issues";
import { element, componentTitle } from "./types";
import { actionButton, tabs } from "./primitives";
import { describeExpression, controlledFields } from "./signals";
import { mountIssues } from "./features/secondary-tools";

interface Context {
  host: HTMLElement;
  outline: HTMLElement;
  ui: UI;
  features: FeatureLoader;
}
/** Outline, diagnostics and history are views of the same headless builder state. */
export function sidebar({ host, outline, ui, features }: Context) {
  const context = ui;
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
  host.replaceChildren(bar.element, panel, info);
  let historyView: { update(): void } | undefined;
  let issuesView:
    | { update(diagnostics: readonly Diagnostic[]): void }
    | undefined;
  const outlet = featureOutlet(history, ui, features);
  function show(value: string) {
    bar.set(value);
    outline.hidden = value !== "outline";
    issues.hidden = value !== "issues";
    history.hidden = value !== "history";
    if (value === "issues" && !issuesView)
      issuesView = mountIssues(issues, ui, diagnostics, () => show("outline"), {
        actionButton,
        element,
      });
    if (value === "history" && !historyView)
      outlet.open("history", ({ mountHistory }) => {
        historyView = mountHistory(history, ui, element);
      });
    else if (value !== "history") outlet.cancel();
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
      diagnostics = builderIssues(ui, definition);
      issuesView?.update(diagnostics);
      const issueButton = bar.buttons.find((b) => b.dataset.tab === "issues")!;
      issueButton.textContent = ui.t("ofb.issues", {
        count: diagnostics.length,
      });
      issueButton.setAttribute("aria-label", issueButton.textContent);
      historyView?.update();
    }
    const form = ui.form?.(),
      entry = state.selection ? form?.byId[state.selection] : undefined;
    info.hidden = !entry;
    if (!entry) return;
    title.textContent = componentTitle(ui, entry.node);
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
    const controlled = entry.model.value
      ? controlledFields(form!, entry.node.id)
      : 0;
    if (controlled)
      line("ofb.logic", ui.t("ofb.controls", { count: controlled }));
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
