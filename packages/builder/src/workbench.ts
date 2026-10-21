import { toSubmissionSchema } from "@ourform/schema";
import { actionButton, chip, tabs } from "./primitives";
import { element } from "./types";
import type { UI } from "./types";
import type { FormController } from "@ourform/renderer-dom";

type Mode = "build" | "data" | "preview" | "json";
interface WorkbenchContext {
  root: Element;
  shell: HTMLElement;
  ui: UI;
  grid: HTMLElement;
  bottom: HTMLElement;
  previewPanel: HTMLElement;
  jsonPanel: HTMLElement;
  appearance: HTMLElement;
  modes: HTMLElement;
  undo: HTMLButtonElement;
  redo: HTMLButtonElement;
  preview(): FormController | undefined;
}
/** Header and mode panels share the existing controller; switching never remounts a form. */
export function workbench(context: WorkbenchContext) {
  const { ui, shell, grid, bottom, previewPanel, jsonPanel } = context;
  const primitiveContext = { document: ui.document, signal: ui.signal };
  const header = element(ui.document, "header", "", "ofb-header");
  const brand = element(ui.document, "div", "", "ofb-brand");
  const mark = element(ui.document, "span", "O", "ofb-brand-mark");
  mark.setAttribute("aria-hidden", "true");
  brand.append(mark, element(ui.document, "strong", ui.t("ofb.brand")));
  const breadcrumb = element(ui.document, "nav", "", "ofb-breadcrumb");
  breadcrumb.setAttribute("aria-label", ui.t("ofb.breadcrumb"));
  const title = element(ui.document, "strong");
  breadcrumb.append(
    element(ui.document, "span", ui.t("ofb.forms")),
    element(ui.document, "span", "/"),
    title,
  );
  const status = chip(primitiveContext, ui.t("ofb.draft"));
  const actions = element(ui.document, "div", "", "ofb-header-actions");
  const issues = actionButton(
    primitiveContext,
    ui.t("ofb.noIssues"),
    () => {
      const compiled = ui.engine.compile(ui.builder.getState().definition);
      ui.announce(
        compiled.ok
          ? ui.t("ofb.noIssues")
          : compiled.diagnostics.map((d) => d.message).join(" · "),
      );
    },
    { icon: "issues" },
  );
  const save = actionButton(
    primitiveContext,
    ui.t("ofb.save"),
    () => {
      context.root.dispatchEvent(
        new CustomEvent("of-save", {
          detail: { definition: ui.builder.getState().definition },
          bubbles: true,
          composed: true,
        }),
      );
      // Persistence belongs to the host. Never claim a network/storage operation happened.
      ui.announce(ui.t("ofb.saveReady"));
    },
    { variant: "primary", icon: "save" },
  );
  let active: Mode = "build";
  const dataPanel = element(
    ui.document,
    "section",
    "",
    "ofb-data-panel of-builder-chrome",
  );
  const dataHeading = element(ui.document, "h2", ui.t("ofb.submissionSchema"));
  const schema = element(ui.document, "pre", "", "of-builder-json");
  schema.tabIndex = 0;
  const sampleHeading = element(ui.document, "h2", ui.t("ofb.sampleData"));
  const sample = element(ui.document, "pre", "", "of-builder-json");
  sample.tabIndex = 0;
  dataPanel.append(dataHeading, schema, sampleHeading, sample);
  const switchMode = (value: Mode) => {
    active = value;
    shell.dataset.ofbView = value;
    grid.hidden = value !== "build";
    bottom.hidden = value === "build";
    previewPanel.hidden = value !== "preview";
    jsonPanel.hidden = value !== "json";
    dataPanel.hidden = value !== "data";
    modeTabs.set(value);
    content.setAttribute("aria-labelledby", `${contentId}-${value}`);
    if (value === "data") refreshData();
  };
  const modeTabs = tabs(
    primitiveContext,
    ui.t("ofb.modes"),
    [
      { value: "build", label: ui.t("ofb.build") },
      { value: "logic", label: ui.t("ofb.logic"), disabled: true },
      { value: "data", label: ui.t("ofb.data") },
      { value: "preview", label: ui.t("ofb.preview") },
      { value: "json", label: ui.t("ofb.json") },
    ],
    "build",
    (value) => switchMode(value as Mode),
  );
  modeTabs.element.classList.add("ofb-mode-tabs");
  modeTabs.buttons.find((b) => b.dataset.tab === "logic")!.title = ui.t(
    "ofb.logicUnavailable",
  );
  const contentId = `ofb-mode-${globalThis.crypto.randomUUID()}`;
  for (const b of modeTabs.buttons) {
    b.id = `${contentId}-${b.dataset.tab}`;
    b.setAttribute("aria-controls", contentId);
  }
  const content = element(ui.document, "div", "", "ofb-workspace");
  content.id = contentId;
  content.setAttribute("role", "tabpanel");
  const preview = actionButton(
    primitiveContext,
    ui.t("ofb.preview"),
    () => switchMode("preview"),
    { icon: "preview" },
  );
  actions.append(context.undo, context.redo, issues, preview, save);
  header.append(
    brand,
    breadcrumb,
    status,
    modeTabs.element,
    context.appearance,
    context.modes,
    actions,
  );
  const pane = element(ui.document, "div", "", "ofb-mode-content");
  pane.append(grid, bottom);
  bottom.append(dataPanel);
  content.append(pane);
  shell.prepend(header);
  shell.append(content);
  function refreshData() {
    const controller = context.preview();
    schema.textContent = controller
      ? JSON.stringify(toSubmissionSchema(controller.session.form), null, 2)
      : "";
    sample.textContent = controller
      ? JSON.stringify(controller.session.getData(), null, 2)
      : "";
  }
  let checkedDefinition:
    | ReturnType<UI["builder"]["getState"]>["definition"]
    | undefined;
  let issueCount = 0;
  function update(changed = false) {
    const definition = ui.builder.getState().definition;
    title.textContent =
      definition.title ?? definition.id ?? ui.t("ofb.untitled");
    if (changed) status.textContent = ui.t("ofb.unsaved");
    if (checkedDefinition !== definition) {
      checkedDefinition = definition;
      issueCount = ui.engine.compile(definition).diagnostics.length;
    }
    const count = issueCount;
    issues.setAttribute("aria-label", ui.t("ofb.issues", { count }));
    issues.replaceChildren(ui.t("ofb.issues", { count }));
    content.setAttribute("aria-labelledby", `${contentId}-${active}`);
    if (active === "data") refreshData();
  }
  switchMode("build");
  update();
  // Viewport restrictions apply to editing only; the form remains a live read-only preview.
  const media = ui.document.defaultView!.matchMedia("(max-width: 767px)");
  const mobile = () => {
    if (media.matches) switchMode("preview");
    for (const b of modeTabs.buttons)
      b.disabled =
        b.dataset.tab === "logic" ||
        (media.matches && b.dataset.tab !== "preview");
    actions.hidden = media.matches;
    previewPanel.inert = media.matches;
  };
  media.addEventListener("change", mobile, { signal: ui.signal });
  mobile();
  return { update, switchMode };
}
