import {
  createBuilder,
  UpdateComponent,
  AddComponent,
} from "@ourform/builder-core";
import type { DropTarget } from "@ourform/builder-core";
import type { Command } from "@ourform/builder-core";
import { componentChildren } from "@ourform/schema";
import type {
  ComponentNode,
  Diagnostic,
  FormDefinition,
} from "@ourform/schema";
import { createFormController } from "@ourform/renderer-dom";
import type { FormController } from "@ourform/renderer-dom";
import type { Theme, ThemeMode } from "@ourform/sdk";
import {
  actionButton,
  dialog,
  drawer,
  tabs,
  labelledInput,
} from "./primitives";
import { renderProperties } from "./editors";
import { icon, componentIcon } from "./icons";
import { element, componentTitle, componentLocation } from "./types";
import type { BuilderOptions, UI } from "./types";

function find(nodes: ComponentNode[], id: string): ComponentNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = find(componentChildren(node), id);
    if (child) return child;
  }
  return undefined;
}
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const baseTabs = [
  "Display",
  "Data",
  "Validation",
  "Conditional",
  "Logic",
  "Layout",
  "Accessibility",
];
export interface SettingsContext {
  host: HTMLElement;
  ui: UI;
  options: BuilderOptions;
  appearance(): { theme: Theme | string; mode: ThemeMode };
  data(): unknown;
  remove(id: string): void;
  closed(origin?: HTMLElement): void;
}
interface PendingAddition {
  type: string;
  target: DropTarget;
  definition: FormDefinition;
  origin?: HTMLElement;
}
/** A private draft is separate from the customer's schema/history until modal Save. */
export class Settings {
  #close: (() => void) | undefined;
  #appearance: (() => void) | undefined;
  componentId: string | undefined;
  constructor(readonly context: SettingsContext) {}
  get isOpen() {
    return this.componentId !== undefined;
  }
  close(): void {
    this.#close?.();
  }
  restyle(): void {
    this.#appearance?.();
  }
  add(type: string, target: DropTarget, origin?: HTMLElement): Diagnostic[] {
    const { ui } = this.context;
    const draft = createBuilder(ui.engine, ui.builder.getState().definition);
    const diagnostics = draft.dispatch(
      new AddComponent(type, { ...target, naming: "camel" }),
    );
    const id = draft.getState().selection;
    if (id && !diagnostics.some((d) => d.severity === "error")) {
      const focused =
        origin ?? (ui.document.activeElement as HTMLElement | null);
      this.open(id, false, {
        type,
        target,
        definition: draft.getState().definition,
        ...(focused ? { origin: focused } : {}),
      });
    }
    return diagnostics;
  }
  open(id: string, json = false, addition?: PendingAddition): void {
    this.close();
    const { ui, options, host } = this.context;
    const definition = addition?.definition ?? ui.builder.getState().definition;
    const selectedNode = find(definition.components, id);
    if (!selectedNode) return;
    const original: ComponentNode = selectedNode;
    const level = ui.builder.lockLevel(id);
    if (level === "all" && !json) {
      ui.announce(ui.t("ofb.lock.edit"));
      return;
    }
    const local = new AbortController();
    const context = {
      document: ui.document,
      signal: local.signal,
      ...(options.icons ? { icons: options.icons } : {}),
    };
    const draft = createBuilder(ui.engine, definition, {
      historyLimit: 1,
      ...(options.locked ? { locked: options.locked } : {}),
      ...(options.readOnlyKeys ? { readOnlyKeys: options.readOnlyKeys } : {}),
    });
    draft.select(id);
    const node = () => find(draft.getState().definition.components, id)!;
    let baseline = JSON.stringify(original);
    let followKey =
      !!original.key &&
      !level &&
      draft.suggestKey(id, original.label ?? "") === original.key;
    const isDrawer = options.editor?.mode === "drawer" && !json;
    const readonly = level === "all";
    const session = globalThis.crypto.randomUUID();
    const problems = new Map<string, string>();
    let preview: FormController | undefined;
    let activeTab = json ? "JSON" : "Display";
    let state = "default";
    let disposed = false;
    let overlay: ReturnType<typeof dialog> | undefined;
    const container = isDrawer
      ? drawer(context, ui.t("ofb.settings"))
      : (overlay = dialog(context, ui.t("ofb.settings"), () => close()))
          .element;
    container.classList.add("ofb-settings");
    const close = (committed = false) => {
      if (disposed) return;
      disposed = true;
      local.abort();
      preview?.destroy();
      overlay?.close();
      container.remove();
      this.componentId = undefined;
      this.#close = this.#appearance = undefined;
      this.context.closed(!committed && addition ? addition.origin : undefined);
    };
    this.componentId = id;
    this.#close = close;
    const header = element(ui.document, "header", "", "ofb-settings-header");
    const titleBlock = element(ui.document, "div");
    const title = element(
      ui.document,
      "h2",
      ui.t("ofb.editorTitle", {
        type: ui.t(ui.engine.getField(original.type)!.title),
        label: componentTitle(ui, original),
      }),
    );
    title.id = `ofb-settings-${session}`;
    container.setAttribute("aria-labelledby", title.id);
    const key = element(
      ui.document,
      "small",
      `${ui.t("ofb.key")} ${original.key ?? "—"}`,
    );
    const location = element(ui.document, "small", "", "ofb-settings-location");
    const compiled = ui.engine.compile(definition);
    location.textContent = compiled.ok
      ? componentLocation(ui, compiled.form, id)
      : componentTitle(ui, original);
    title.prepend(
      icon(
        ui.document,
        componentIcon(
          original.type,
          ui.engine.getField(original.type)?.builder?.icon,
        ),
        ui.icons,
      ),
    );
    titleBlock.append(title, key, location);
    header.append(
      titleBlock,
      actionButton(context, ui.t("ofb.close"), close, {
        icon: "close",
        iconOnly: true,
      }),
    );
    const body = element(ui.document, "div", "", "ofb-settings-body");
    const editors = element(
      ui.document,
      "div",
      "",
      "ofb-settings-editors of-builder-chrome",
    );
    editors.dataset.builderPart = "properties";
    const previewPane = element(
      ui.document,
      "section",
      "",
      "ofb-settings-preview",
    );
    const previewHeader = element(
      ui.document,
      "div",
      "",
      "ofb-preview-heading",
    );
    previewHeader.append(element(ui.document, "h3", ui.t("ofb.livePreview")));
    const previewRoot = element(ui.document, "div", "", "ofb-live-preview");
    previewRoot.dataset.builderPart = "editor-preview";
    const previewHint = element(
      ui.document,
      "p",
      ui.t(isDrawer ? "ofb.drawerHint" : "ofb.previewHint"),
      "ofb-muted",
    );
    const states = tabs(
      context,
      ui.t("ofb.previewState"),
      ["default", "focus", "error", "disabled"].map((value) => ({
        value,
        label: ui.t(`ofb.${value}`),
      })),
      "default",
      (value) => {
        state = value;
        updatePreview();
        if (value === "focus") preview?.focusField(id);
      },
      true,
    );
    previewHeader.append(states.element);
    previewPane.append(previewHeader, previewRoot, previewHint);
    const error = element(ui.document, "p", "", "ofb-editor-error");
    error.id = `ofb-settings-error-${session}`;
    const footer = element(ui.document, "footer", "", "ofb-settings-footer");
    const remove = actionButton(
      context,
      ui.t("ofb.delete"),
      () => {
        close();
        if (!addition) this.context.remove(id);
      },
      { icon: "delete", variant: "danger" },
    );
    remove.disabled = readonly || level === "structure";
    if (remove.disabled) remove.title = ui.t("ofb.lock.delete");
    const hint = element(
      ui.document,
      "small",
      ui.t(isDrawer ? "ofb.drawerHint" : "ofb.saveHint"),
      "ofb-muted",
    );
    const cancel = actionButton(
      context,
      ui.t(isDrawer || readonly ? "ofb.close" : "ofb.cancel"),
      close,
    );
    const save = actionButton(context, ui.t("ofb.save"), () => commit(), {
      variant: "primary",
    });
    save.hidden = isDrawer || readonly;
    footer.append(remove, hint, cancel, save);
    const groups = [
      ...baseTabs,
      ...draft
        .propertyPanel(id)
        .groups.map((group) => group.name)
        .filter((name) => !baseTabs.includes(name)),
    ].filter(
      (name) =>
        !options.editor?.tabs?.hide?.some(
          (hidden) => hidden.toLowerCase() === name.toLowerCase(),
        ),
    );
    if (!groups.length && !json) groups.push("Display");
    if (!groups.includes(activeTab) && !json) activeTab = groups[0]!;
    const bar = tabs(
      context,
      ui.t("ofb.settings"),
      (json ? ["JSON"] : groups).map((name) => ({
        value: name,
        label:
          ui.t(`ofb.group.${name}`) === `ofb.group.${name}`
            ? name
            : ui.t(`ofb.group.${name}`),
      })),
      activeTab,
      (value) => {
        activeTab = value;
        showTab();
      },
    );
    for (const button of bar.buttons) {
      button.id = `ofb-settings-tab-${session}-${button.dataset.tab}`;
      button.setAttribute("aria-controls", `ofb-settings-panel-${session}`);
    }
    editors.id = `ofb-settings-panel-${session}`;
    editors.setAttribute("role", "tabpanel");
    body.append(editors, previewPane);
    container.append(header, bar.element, body, error, footer);
    host.append(container);
    const problem = (property: string, message: string | undefined) => {
      if (message) problems.set(property, message);
      else problems.delete(property);
      updateProblems();
    };
    const draftUI: UI = {
      ...ui,
      builder: draft,
      signal: local.signal,
      liveProperties: true,
      propertyIssue: problem,
      dispatch: (command: Command) => {
        const property =
          command.type === "ChangeKey"
            ? "key"
            : "key" in command && typeof command.key === "string"
              ? command.key
              : "JSON";
        if (property === "key") followKey = false;
        const result = command.apply(draft.getState(), { engine: ui.engine });
        if (result.diagnostics.some((d) => d.severity === "error")) {
          problem(
            property,
            result.diagnostics.map((d) => d.message).join(" · "),
          );
          return result.diagnostics;
        }
        const candidate = clone(find(result.state.definition.components, id)!);
        if (property === "label" && followKey)
          candidate.key = draft.suggestKey(id, candidate.label ?? "")!;
        return change(candidate, property);
      },
    };
    function updateProblems() {
      save.disabled = !!problems.size;
      error.textContent = [...problems.values()].join(" · ");
      error.hidden = !problems.size;
      for (const input of editors.querySelectorAll<HTMLElement>(
        "[data-property]",
      )) {
        const invalid = problems.has(input.dataset.property!);
        input.setAttribute("aria-invalid", String(invalid));
        if (invalid) input.setAttribute("aria-describedby", error.id);
        else input.removeAttribute("aria-describedby");
      }
      const properties = draft.propertyPanel(id).groups;
      for (const button of bar.buttons) {
        const name = button.dataset.tab!;
        const hasProblem = [...problems.keys()].some(
          (key) =>
            key === "JSON" ||
            properties
              .find((group) => group.name === name)
              ?.properties.some((p) => p.key === key),
        );
        button.dataset.hasProblem = String(hasProblem);
        button.setAttribute(
          "aria-label",
          hasProblem
            ? ui.t("ofb.hasProblem", { tab: name })
            : ui.t(`ofb.group.${name}`) === `ofb.group.${name}`
              ? name
              : ui.t(`ofb.group.${name}`),
        );
      }
    }
    function showTab() {
      editors.setAttribute(
        "aria-labelledby",
        `ofb-settings-tab-${session}-${activeTab}`,
      );
      for (const group of editors.querySelectorAll<HTMLElement>(
        "[data-property-group]",
      ))
        group.hidden = group.dataset.propertyGroup !== activeTab;
    }
    function change(candidate: ComponentNode, property: string): Diagnostic[] {
      if (readonly) return [];
      const diagnostics = draft.dispatch(new UpdateComponent(id, candidate));
      const errors = diagnostics.filter((d) => d.severity === "error");
      problem(
        property,
        errors.length ? errors.map((d) => d.message).join(" · ") : undefined,
      );
      if (errors.length) return diagnostics;
      if (isDrawer) {
        const result = ui.dispatch(new UpdateComponent(id, node()), {
          historyGroup: `${session}:${property}`,
        });
        if (result.some((d) => d.severity === "error")) {
          problem(property, result.map((d) => d.message).join(" · "));
          return result;
        }
        baseline = JSON.stringify(node());
      }
      key.textContent = `${ui.t("ofb.key")} ${node().key ?? "—"}`;
      const keyInput = editors.querySelector<HTMLInputElement>(
        '[data-property="key"]',
      );
      if (keyInput && property !== "key") keyInput.value = node().key ?? "";
      updatePreview();
      const visible = new Map(
        draft
          .propertyPanel(id)
          .groups.flatMap((group) =>
            group.properties.map((property) => [
              property.key,
              property.visible,
            ]),
          ),
      );
      const hidden = options.editor?.properties?.[original.type]?.hide ?? [];
      for (const input of editors.querySelectorAll<HTMLElement>(
        "[data-property]",
      ))
        input.closest<HTMLElement>("label")!.hidden =
          visible.get(input.dataset.property!) === false ||
          hidden.includes(input.dataset.property!) ||
          hidden.includes(input.dataset.property!.replace(/^properties\./, ""));
      for (const editor of editors.querySelectorAll<HTMLElement>(
        "[data-expression]",
      )) {
        const key = editor.dataset.expression!;
        editor.hidden =
          visible.get(key) === false ||
          hidden.includes(key) ||
          hidden.includes(key.replace(/^properties\./, ""));
      }
      return diagnostics;
    }
    const controller = this.context;
    function isolatePreview() {
      if (!preview) return;
      const parents = new Set<string>(),
        selected = new Set<string>();
      const collect = (node: ComponentNode) => {
        selected.add(node.id);
        componentChildren(node).forEach(collect);
      };
      collect(node());
      let entry = preview.session.form.byId[id];
      while (entry?.parentId) {
        parents.add(entry.parentId);
        entry = preview.session.form.byId[entry.parentId];
      }
      for (const root of previewRoot.querySelectorAll<HTMLElement>(
        "[data-field-id]",
      )) {
        const fieldId = root.dataset.fieldId!;
        if (!selected.has(fieldId) && !parents.has(fieldId)) root.hidden = true;
        if (parents.has(fieldId)) {
          root.dataset.ofbPreviewAncestor = "";
          for (const child of root.children)
            if (child.matches(".of-layout-title,.of-description,.of-tablist"))
              (child as HTMLElement).hidden = true;
        }
      }
      const selectedRoot = [
        ...previewRoot.querySelectorAll<HTMLElement>("[data-field-id]"),
      ].find((root) => root.dataset.fieldId === id);
      if (selectedRoot)
        for (const slot of previewRoot.querySelectorAll<HTMLElement>(
          "[data-of-slot-owner]",
        ))
          if (slot.contains(selectedRoot)) slot.hidden = false;
    }
    function updatePreview() {
      if (disposed) return;
      const data =
        state === "error"
          ? {}
          : (preview?.session.getData() ?? controller.data());
      preview?.destroy();
      preview = undefined;
      const definition = clone(draft.getState().definition);
      if (state === "disabled")
        find(definition.components, id)!.disabledWhen = true;
      const appearance = controller.appearance();
      try {
        preview = createFormController(previewRoot, {
          ...options,
          engine: ui.engine,
          schema: definition,
          data,
          theme: appearance.theme,
          themeMode: appearance.mode,
          ...(readonly ? { readOnly: true } : {}),
          idPrefix: `ofb-editor-${session}-`,
          onSubmit: () => {},
          onChange: () =>
            queueMicrotask(() => {
              if (!disposed) isolatePreview();
            }),
        });
        isolatePreview();
        if (state === "error") {
          const selected = new Set<string>();
          const collect = (entry: ComponentNode) => {
            selected.add(entry.id);
            componentChildren(entry).forEach(collect);
          };
          collect(node());
          const paths = preview.session.form.nodes
            .filter((entry) => selected.has(entry.node.id) && entry.model.value)
            .map((entry) => entry.path);
          void preview.session.validate({ paths });
        }
      } catch (cause) {
        previewRoot.textContent =
          cause instanceof Error ? cause.message : String(cause);
      }
    }
    function commit() {
      if (readonly || isDrawer || problems.size) return;
      const current = find(ui.builder.getState().definition.components, id);
      if (!addition && JSON.stringify(current) !== baseline) {
        problem("JSON", ui.t("ofb.editorConflict"));
        return;
      }
      const diagnostics = ui.dispatch(
        addition
          ? new AddComponent(addition.type, {
              ...addition.target,
              node: node(),
            })
          : new UpdateComponent(id, node()),
      );
      if (diagnostics.some((d) => d.severity === "error"))
        problem("JSON", diagnostics.map((d) => d.message).join(" · "));
      else close(true);
    }
    if (json) {
      const field = labelledInput(context, ui.t("ofb.editJson"), "textarea");
      const input = field.input as HTMLTextAreaElement;
      input.value = JSON.stringify(original, null, 2);
      input.readOnly = readonly;
      input.dataset.property = "JSON";
      input.addEventListener(
        "input",
        () => {
          try {
            change(JSON.parse(input.value) as ComponentNode, "JSON");
          } catch (cause) {
            problem(
              "JSON",
              ui.t("ofb.invalidJson", {
                message: cause instanceof Error ? cause.message : String(cause),
              }),
            );
          }
        },
        { signal: local.signal },
      );
      editors.append(field.wrapper);
      if (readonly)
        editors.prepend(element(ui.document, "p", ui.t("ofb.readOnlyJson")));
    } else {
      renderProperties(editors, draftUI);
      const hidden = options.editor?.properties?.[original.type]?.hide ?? [];
      for (const input of editors.querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >("[data-property]")) {
        if (
          hidden.includes(input.dataset.property!) ||
          hidden.includes(input.dataset.property!.replace(/^properties\./, ""))
        )
          input.closest<HTMLElement>("label")!.hidden = true;
        if (
          (level === "key" || level === "structure") &&
          input.dataset.property === "key"
        ) {
          input.disabled = true;
          input.title = ui.t("ofb.lock.key");
        }
      }
      for (const name of groups)
        if (
          ![
            ...editors.querySelectorAll<HTMLElement>("[data-property-group]"),
          ].some((group) => group.dataset.propertyGroup === name)
        ) {
          const empty = element(
            ui.document,
            "section",
            ui.t("ofb.noProperties"),
          );
          empty.dataset.propertyGroup = name;
          editors.append(empty);
        }
    }
    showTab();
    updateProblems();
    updatePreview();
    this.#appearance = () => {
      const appearance = this.context.appearance();
      preview?.view.setTheme(appearance.theme);
      preview?.view.setMode(appearance.mode);
    };
    container.addEventListener(
      "keydown",
      (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          event.preventDefault();
          commit();
        }
        if (isDrawer && event.key === "Escape") {
          event.preventDefault();
          close();
        }
      },
      { signal: local.signal },
    );
    overlay?.show();
    editors
      .querySelector<HTMLElement>("input:not(:disabled),textarea,select")
      ?.focus();
    host.dispatchEvent(
      new CustomEvent("of-editor-open", {
        detail: {
          componentId: id,
          mode: json ? "json" : isDrawer ? "drawer" : "modal",
        },
        bubbles: true,
        composed: true,
      }),
    );
  }
}
