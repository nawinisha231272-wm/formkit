import { builderIssues } from "./issues";
import { icon } from "./icons";
import { actionButton, chip, tabs } from "./primitives";
import { element } from "./types";
import type { UI } from "./types";
import type { FormController } from "@ourform/renderer-dom";
import type { FeatureLoader } from "./feature-loader";
import { featureOutlet } from "./feature-outlet";

type Mode = "build" | "data" | "preview" | "json";
interface WorkbenchContext {
  root: Element;
  shell: HTMLElement;
  ui: UI;
  grid: HTMLElement;
  bottom: HTMLElement;
  previewPanel: HTMLElement;
  jsonPanel: HTMLElement;
  modeChanged(mode: Mode): void;
  appearance: HTMLElement;
  modes: HTMLElement;
  look(): string;
  setLook(value: string): void;
  showIssues(): void;
  undo: HTMLButtonElement;
  redo: HTMLButtonElement;
  preview(): FormController | undefined;
  features: FeatureLoader;
}
/** Header and mode panels share the existing controller; switching never remounts a form. */
export function workbench(context: WorkbenchContext) {
  const { ui, shell, grid, bottom, previewPanel, jsonPanel } = context;
  const primitiveContext = ui;
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
      context.showIssues();
      const diagnostics = builderIssues(ui, ui.builder.getState().definition);
      ui.announce(
        !diagnostics.length
          ? ui.t("ofb.noIssues")
          : diagnostics.map((d) => d.message).join(" · "),
      );
    },
    { icon: "issues" },
  );
  const save = actionButton(
    primitiveContext,
    ui.t("ofb.save"),
    () => {
      saving = ui.builder.getState().definition;
      save.disabled = true;
      status.textContent = ui.t("ofb.saving");
      ui.announce(ui.t("ofb.saving"));
      context.root.dispatchEvent(
        new CustomEvent("of-save", {
          detail: { definition: saving },
          bubbles: true,
          composed: true,
        }),
      );
    },
    { variant: "primary", icon: "save" },
  );
  let saving: ReturnType<UI["builder"]["getState"]>["definition"] | undefined;
  const markSaved = () => {
    if (!saving) return;
    const current =
      JSON.stringify(saving) ===
      JSON.stringify(ui.builder.getState().definition);
    saving = undefined;
    save.disabled = false;
    status.textContent = current
      ? ui.t("ofb.savedTime", { time: new Date().toLocaleTimeString() })
      : ui.t("ofb.unsaved");
    ui.announce(current ? status.textContent : ui.t("ofb.savedEarlier"));
  };
  const markSaveFailed = (message: string) => {
    if (!saving) return;
    saving = undefined;
    save.disabled = false;
    status.textContent = ui.t("ofb.saveFailed", { message });
    ui.announce(status.textContent);
  };
  const more = element(ui.document, "details", "", "ofb-header-menu");
  const menuToggle = element(ui.document, "summary");
  menuToggle.setAttribute("aria-label", ui.t("ofb.more"));
  menuToggle.title = ui.t("ofb.settingsMenu");
  menuToggle.append(icon(ui.document, "more", ui.icons));
  const preferences = element(ui.document, "div", "", "ofb-header-preferences");
  const lookLabel = element(ui.document, "label", ui.t("ofb.builderLook"));
  const look = element(ui.document, "select");
  for (const value of ["match-form", "neutral"]) {
    const option = element(
      ui.document,
      "option",
      ui.t(value === "match-form" ? "ofb.matchForm" : `ofb.theme.${value}`),
    );
    option.value = value;
    look.append(option);
  }
  look.onchange = () => context.setLook(look.value);
  lookLabel.append(look);
  preferences.append(lookLabel, context.appearance, context.modes);
  more.append(menuToggle, preferences);
  more.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        more.open = false;
        menuToggle.focus();
      }
    },
    { signal: ui.signal },
  );
  context.root.addEventListener(
    "pointerdown",
    (event) => {
      if (!more.contains(event.target as Node)) more.open = false;
    },
    { signal: ui.signal },
  );
  let active: Mode = "build";
  const dataPanel = element(
    ui.document,
    "section",
    "",
    "ofb-data-panel of-builder-chrome",
  );
  dataPanel.tabIndex = -1;
  const dataOutlet = featureOutlet(dataPanel, ui, context.features);
  let dataView: { update(): void } | undefined;
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
    if (value === "data") {
      if (dataView) dataView.update();
      else
        dataOutlet.open("data", ({ mountData }) => {
          dataView = mountData(dataPanel, ui, context.preview);
        });
    } else dataOutlet.cancel();
    context.modeChanged(value);
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
  actions.append(context.undo, context.redo, issues, save);
  header.append(
    brand,
    breadcrumb,
    status,
    modeTabs.element,
    context.appearance,
    more,
    actions,
  );
  const pane = element(ui.document, "div", "", "ofb-mode-content");
  pane.append(grid, bottom);
  bottom.append(dataPanel);
  content.append(pane);
  shell.prepend(header);
  shell.append(content);
  let checkedDefinition:
    | ReturnType<UI["builder"]["getState"]>["definition"]
    | undefined;
  let issueCount = 0;
  function syncLook() {
    const value = context.look();
    if (![...look.options].some((option) => option.value === value)) {
      const option = element(ui.document, "option", value);
      option.value = value;
      look.append(option);
    }
    look.value = value;
  }
  function update(changed = false) {
    syncLook();
    const definition = ui.builder.getState().definition;
    title.textContent =
      definition.title ?? definition.id ?? ui.t("ofb.untitled");
    title.title = title.textContent;
    if (changed) status.textContent = ui.t("ofb.unsaved");
    if (checkedDefinition !== definition) {
      checkedDefinition = definition;
      issueCount = builderIssues(ui, definition).length;
    }
    const count = issueCount;
    issues.setAttribute("aria-label", ui.t("ofb.issues", { count }));
    issues.replaceChildren(ui.t("ofb.issues", { count }));
    content.setAttribute("aria-labelledby", `${contentId}-${active}`);
    if (active === "data") dataView?.update();
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
    shell.toggleAttribute("data-ofb-readonly", media.matches);
  };
  media.addEventListener("change", mobile, { signal: ui.signal });
  mobile();
  return { update, switchMode, markSaved, markSaveFailed, syncLook };
}
