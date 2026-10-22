import {
  createBuilder,
  AddComponent,
  DuplicateComponent,
  RemoveComponent,
  ReplaceDefinition,
  WrapInLayout,
  Unwrap,
} from "@ourform/builder-core";
import type { JsonPatchOp } from "@ourform/builder-core";
import {
  createFormHost,
  createFormController,
  mount,
  defaultThemes,
} from "@ourform/renderer-dom";
import type { FormController, FormView } from "@ourform/renderer-dom";
import type { Diagnostic, FormDefinition } from "@ourform/schema";
import { createMessages } from "./messages";
import { Settings } from "./settings";
import { settingsStyle } from "./settings-style";
import { pointerStyle } from "./pointer-style";
import type { Theme, ThemeMode } from "@ourform/sdk";
import { Canvas } from "./canvas";
import { icon } from "./icons";
import { sidebar } from "./sidebar";
import { workbench } from "./workbench";
import { workbenchStyle } from "./workbench-style";
import { builderStyle } from "./style";
import { primitiveStyle } from "./primitive-style";
import { resolveChrome, chromeStyle } from "./theme";
import type { ChromeOptions } from "./theme";
import { element, button } from "./types";
import type {
  BuilderOptions,
  BuilderController,
  SchemaChange,
  UI,
} from "./types";

/** Reusable nested builder. The caller owns the empty mount and all native/provider integrations. */
export function createBuilderController(
  root: Element,
  options: BuilderOptions,
): BuilderController {
  if (root.childNodes.length)
    throw new Error("Builder mount must be empty and caller-owned.");
  const document = root.ownerDocument;
  const phone = document.defaultView!.matchMedia("(max-width: 767px)");
  const events = new AbortController();
  const host = createFormHost(options.fields ?? [], options.engine);
  const core = createBuilder(host.engine, options.schema as FormDefinition, {
    ...(options.historyLimit === undefined
      ? {}
      : { historyLimit: options.historyLimit }),
    ...(options.locked ? { locked: options.locked } : {}),
    ...(options.readOnlyKeys ? { readOnlyKeys: options.readOnlyKeys } : {}),
  });
  const prefix =
    options.idPrefix ?? `of-builder-${globalThis.crypto.randomUUID()}-`;
  const shell = element(document, "div", "", "of-builder");
  const instance = `ofb-${globalThis.crypto.randomUUID()}`;
  shell.dataset.ofbInstance = instance;
  const style = element(document, "style");
  style.textContent =
    primitiveStyle +
    builderStyle +
    settingsStyle +
    pointerStyle +
    workbenchStyle;
  const appearanceStyle = element(document, "style");
  const status = element(document, "div", "", "of-builder-status");
  status.id = `${prefix}diagnostics`;
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  let theme: Theme | string = options.theme ?? "base",
    mode: ThemeMode = options.themeMode ?? "light";
  let chrome = { ...options.chrome };
  const applyChrome = () => {
    const resolved = resolveChrome(
      chrome,
      typeof theme === "string" ? theme : theme.name,
      mode,
      options.builderThemes,
    );
    appearanceStyle.textContent = chromeStyle(resolved, instance);
    shell.dataset.ofbTheme = resolved.name;
    shell.dataset.ofbMode = resolved.mode;
    shell.dataset.ofbDensity = resolved.density;
  };
  applyChrome();
  let preview: FormController | undefined;
  let design: FormView | undefined;
  let destroyed = false,
    jsonDirty = false;
  const values = new Map<string, unknown>();
  const t = createMessages(options.messages, options.t);
  const announce = (message: string) => {
    status.textContent = message;
  };
  const report = (diagnostics: readonly Diagnostic[]) =>
    announce(diagnostics.map((d) => `${d.code}: ${d.message}`).join(" · "));
  const dispatch: UI["dispatch"] = (command, dispatchOptions) => {
    if (destroyed) return [];
    if (
      command instanceof RemoveComponent &&
      !root.dispatchEvent(
        new CustomEvent("of-before-delete", {
          detail: { componentId: command.componentId },
          cancelable: true,
          bubbles: true,
          composed: true,
        }),
      )
    )
      return [
        {
          severity: "error",
          code: "delete-cancelled",
          message: t("ofb.deleteCancelled"),
        },
      ];
    const diagnostics = core.dispatch(command, dispatchOptions);
    report(diagnostics);
    return diagnostics;
  };
  const ui: UI = {
    document,
    signal: events.signal,
    engine: host.engine,
    builder: core,
    form: () => preview?.session.form,
    t,
    announce,
    dispatch,
    ...(options.icons ? { icons: options.icons } : {}),
    ...(options.palette ? { palette: options.palette } : {}),
    ...(options.toolbar?.actions ? { actions: options.toolbar.actions } : {}),
  };
  const part = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    name: string,
    className = "",
  ) => {
    const el = element(document, tag, "", className);
    el.dataset.builderPart = name;
    return el;
  };
  const panel = (name: string, heading: string, chrome = false) => {
    const el = part(
      "section",
      name,
      `of-builder-panel${chrome ? " of-builder-chrome" : ""}`,
    );
    const title = element(document, "h2", t(heading));
    title.id = `${prefix}${name}-heading`;
    el.setAttribute("aria-labelledby", title.id);
    el.append(title);
    return el;
  };
  const toolbar = part(
    "div",
    "toolbar",
    "of-builder-toolbar of-builder-chrome",
  );
  toolbar.setAttribute("role", "group");
  toolbar.setAttribute("aria-label", t("of.builder.actions"));
  const undo = button(ui, t("of.builder.undo"), () => core.undo());
  undo.id = `${prefix}undo`;
  const redo = button(ui, t("of.builder.redo"), () => core.redo());
  redo.id = `${prefix}redo`;
  for (const [button, name] of [
    [undo, "undo"],
    [redo, "redo"],
  ] as const) {
    button.replaceChildren(icon(document, name, options.icons));
    button.dataset.ofbPrimitive = "IconButton";
  }
  const remove = button(ui, t("of.builder.removeSelected"), () => {
    const id = core.getState().selection;
    if (id) dispatch(new RemoveComponent(id));
  });
  remove.id = `${prefix}remove`;
  const duplicate = button(ui, t("of.builder.duplicate"), () => {
    const id = core.getState().selection;
    if (id) dispatch(new DuplicateComponent(id));
  });
  const cut = button(ui, t("of.builder.cut"), () => canvas.cut());
  const paste = button(ui, t("of.builder.paste"), () => canvas.paste());
  const unwrap = button(ui, t("of.builder.unwrap"), () => {
    const id = core.getState().selection;
    if (id) dispatch(new Unwrap(id));
  });
  const wrapper = element(document, "select");
  wrapper.setAttribute("aria-label", t("of.builder.wrapType"));
  for (const model of host.engine
    .listFields()
    .filter((m) => m.kind === "layout")) {
    const option = element(
      document,
      "option",
      t(model.builder?.title ?? model.title),
    );
    option.value = model.type;
    wrapper.append(option);
  }
  const wrap = button(ui, t("of.builder.wrap"), () => {
    const id = core.getState().selection;
    if (id) dispatch(new WrapInLayout(id, wrapper.value));
  });
  const destinationLabel = element(
    document,
    "label",
    t("of.builder.insertInto"),
  );
  const picker = element(document, "select");
  destinationLabel.append(picker);
  const appearanceLabel = element(
    document,
    "label",
    t("of.builder.previewTheme"),
  );
  const appearance = element(document, "select");
  appearance.id = `${prefix}builder-theme`;
  for (const name of [
    "base",
    "bootstrap4",
    "bootstrap5",
    "tailwind",
    "material",
    ...(options.themes ?? []).map((theme) => theme.name),
  ])
    if (!Array.from(appearance.options).some((o) => o.value === name)) {
      const option = element(
        document,
        "option",
        t(`ofb.theme.${name}`) === `ofb.theme.${name}`
          ? name
          : t(`ofb.theme.${name}`),
      );
      option.value = name;
      appearance.append(option);
    }
  appearance.value = typeof theme === "string" ? theme : theme.name;
  appearanceLabel.append(appearance);
  const modeLabel = element(document, "label", t("of.builder.appearance"));
  const modes = element(document, "select");
  modes.id = `${prefix}builder-mode`;
  for (const value of ["light", "dark", "high-contrast"] as const) {
    const option = element(document, "option", t(`of.builder.mode.${value}`));
    option.value = value;
    modes.append(option);
  }
  modes.value = mode;
  modeLabel.append(modes);
  toolbar.append(
    undo,
    redo,
    cut,
    paste,
    duplicate,
    remove,
    wrapper,
    wrap,
    unwrap,
    destinationLabel,
    appearanceLabel,
    modeLabel,
  );
  const grid = part("div", "grid", "of-builder-grid");
  const library = panel("library", "of.builder.palette", true);
  const searchLabel = element(document, "label", t("of.builder.search"));
  const search = element(document, "input");
  search.type = "search";
  searchLabel.append(search);
  const palette = part("div", "palette", "of-builder-palette");
  palette.id = `${prefix}palette`;
  const outlineHeading = element(document, "h3", t("of.builder.outline"));
  const outline = part("div", "outline", "of-builder-outline");
  library.append(searchLabel, palette);
  const canvasPanel = panel("canvas-panel", "of.builder.canvas");
  const instructions = element(document, "p", t("of.builder.instructions"));
  const canvasHost = part("div", "canvas", "of-builder-canvas");
  canvasHost.id = `${prefix}canvas`;
  canvasPanel.append(instructions, canvasHost);
  const inspector = panel("inspector", "of.builder.properties", true);
  inspector.classList.add("of-builder-inspector");
  inspector.append(outlineHeading, outline);
  grid.append(library, canvasPanel, inspector);
  const bottom = part("div", "bottom", "of-builder-bottom");
  const previewPanel = panel("preview-panel", "of.builder.preview");
  const previewHost = part("div", "preview");
  previewHost.id = `${prefix}preview`;
  const previewControls = element(document, "div", "", "of-builder-chrome");
  const result = part("pre", "result", "of-builder-result");
  result.id = `${prefix}builder-result`;
  result.tabIndex = 0;
  result.setAttribute("role", "region");
  result.setAttribute("aria-label", t("of.builder.previewResult"));
  const submit = button(ui, t("of.builder.submitPreview"), () => {
    if (preview)
      void preview.submit().then((value) => {
        if (!destroyed) result.textContent = JSON.stringify(value, null, 2);
      });
  });
  submit.id = `${prefix}builder-submit`;
  previewControls.append(submit);
  previewPanel.append(previewHost, previewControls, result);
  const jsonPanel = panel("json-panel", "of.builder.json", true);
  const json = part("textarea", "json", "of-builder-json");
  json.id = `${prefix}builder-json`;
  json.setAttribute("aria-label", t("of.builder.json"));
  json.spellcheck = false;
  const apply = button(ui, t("of.builder.applyJson"), () => {
    try {
      const diagnostics = load(JSON.parse(json.value));
      if (!diagnostics.some((d) => d.severity === "error")) {
        jsonDirty = false;
        json.value = JSON.stringify(core.getState().definition, null, 2);
      }
    } catch (cause) {
      announce(
        t("of.builder.invalidJson", {
          message: cause instanceof Error ? cause.message : "",
        }),
      );
    }
  });
  const reload = button(ui, t("of.builder.reloadJson"), () => {
    jsonDirty = false;
    json.value = JSON.stringify(core.getState().definition, null, 2);
  });
  const patch = part("pre", "patch", "of-builder-patch");
  patch.id = `${prefix}builder-patch`;
  patch.tabIndex = 0;
  patch.setAttribute("role", "region");
  patch.setAttribute("aria-label", t("of.builder.patch"));
  jsonPanel.append(
    json,
    apply,
    reload,
    element(document, "h3", t("of.builder.patch")),
    patch,
  );
  bottom.append(previewPanel, jsonPanel);
  shell.append(style, appearanceStyle, toolbar, status, grid, bottom);
  root.append(shell);
  const updateButtons = () => {
    const state = core.getState();
    undo.disabled = !state.history.past.length;
    const last = state.history.past.at(-1);
    undo.title =
      last instanceof AddComponent
        ? t("ofb.undoAdd", {
            title: t(
              host.engine.getField(last.componentType)!.builder?.title ??
                host.engine.getField(last.componentType)!.title,
            ),
          })
        : t("ofb.undo");
    redo.disabled = !state.history.future.length;
    remove.disabled =
      duplicate.disabled =
      cut.disabled =
      wrap.disabled =
        !state.selection;
    paste.disabled = !canvas.cutId && !canvas.clipboard;
    const selected = canvas
      .entries()
      .find((e) => e.node.id === state.selection)?.node;
    unwrap.disabled =
      !selected || host.engine.getField(selected.type)?.kind !== "layout";
    const lock = state.selection ? core.lockLevel(state.selection) : undefined;
    if (lock === "all" || lock === "structure") {
      remove.disabled = cut.disabled = unwrap.disabled = true;
      remove.title = cut.title = unwrap.title = t("ofb.lock.delete");
    } else {
      remove.title = cut.title = unwrap.title = "";
    }
    if (lock === "all") {
      duplicate.disabled = wrap.disabled = true;
    }
  };
  const canvas = new Canvas(
    shell,
    canvasHost,
    palette,
    outline,
    picker,
    ui,
    updateButtons,
  );
  const settings = new Settings({
    host: shell,
    ui,
    options,
    appearance: () => ({ theme, mode }),
    data: () => preview?.session.getData() ?? {},
    remove: (id) => dispatch(new RemoveComponent(id)),
    closed: (origin) => {
      if (destroyed) return;
      if (origin?.isConnected) origin.focus();
      else canvas.focusSelected();
    },
  });
  ui.reveal = (id) => {
    const origin = document.activeElement as HTMLElement | null;
    design?.focus(id);
    if (origin?.isConnected) origin.focus({ preventScroll: true });
  };
  ui.edit = (id, json = false) => settings.open(id, json);
  ui.add = (type, target, origin) => {
    if (
      options.editor?.openOnAdd !== false &&
      options.editor?.mode !== "drawer"
    ) {
      const diagnostics = settings.add(type, target, origin);
      report(diagnostics);
      return diagnostics;
    }
    const diagnostics = dispatch(
      new AddComponent(type, { ...target, naming: "camel" }),
    );
    const id = core.getState().selection;
    if (
      id &&
      !diagnostics.some((d) => d.severity === "error") &&
      options.editor?.openOnAdd !== false
    )
      settings.open(id);
    return diagnostics;
  };
  const edit = button(ui, t("ofb.edit"), () => {
    const id = core.getState().selection;
    if (id) settings.open(id);
  });
  toolbar.prepend(edit);
  const side = sidebar({ host: inspector, outline, legacy: toolbar, ui });
  const bench = workbench({
    root,
    shell,
    ui,
    grid,
    bottom,
    previewPanel,
    jsonPanel,
    appearance: appearanceLabel,
    modes: modeLabel,
    undo,
    redo,
    preview: () => preview,
  });
  function assertAlive() {
    if (destroyed) throw new Error("Builder is destroyed.");
  }
  function rebuild(): void {
    if (preview)
      for (const entry of preview.session.form.nodes)
        if (entry.model.value)
          values.set(entry.node.id, preview.session.getValue(entry.path));
    design?.destroy();
    preview?.destroy();
    preview = undefined;
    design = undefined;
    options.onPreviewReady?.(undefined);
    result.textContent = "";
    const schema = core.getState().definition;
    const compiled = host.engine.compile(schema);
    if (!compiled.ok) {
      canvasHost.replaceChildren();
      previewHost.replaceChildren();
      report(compiled.diagnostics);
      return;
    }
    for (const id of values.keys())
      if (!compiled.form.byId[id]?.model.value) values.delete(id);
    let data: unknown = options.data ?? options.defaultData ?? {};
    data = JSON.parse(JSON.stringify(data));
    for (const entry of compiled.form.nodes)
      if (entry.model.value && values.has(entry.node.id)) {
        let target = data as Record<string, unknown>;
        for (const key of entry.path.slice(0, -1)) {
          if (
            !target[key as string] ||
            typeof target[key as string] !== "object" ||
            Array.isArray(target[key as string])
          )
            target[key as string] = {};
          target = target[key as string] as Record<string, unknown>;
        }
        target[String(entry.path.at(-1))] = values.get(entry.node.id);
      }
    try {
      preview = createFormController(previewHost, {
        ...options,
        engine: host.engine,
        schema,
        data,
        theme,
        themeMode: mode,
        readOnly: phone.matches,
        idPrefix: `${prefix}preview-`,
      });
      // Two views share one session: preview edits run processors/providers once.
      design = mount(canvasHost, preview.session, {
        ...options,
        engine: host.engine,
        views: host.views,
        themes: options.themes ?? defaultThemes,
        theme,
        themeMode: mode,
        mode: "design",
        designTabs: "active",
        idPrefix: `${prefix}design-`,
        onSubmit: () => {},
      });
      options.onPreviewReady?.(preview);
    } catch (cause) {
      design?.destroy();
      preview?.destroy();
      design = undefined;
      preview = undefined;
      canvasHost.replaceChildren();
      previewHost.replaceChildren();
      announce(
        t("of.builder.previewError", {
          message: cause instanceof Error ? cause.message : "",
        }),
      );
    }
  }
  function render(ops: readonly JsonPatchOp[]): void {
    const focusedPart = document.activeElement?.closest<HTMLElement>(
      "[data-builder-part]",
    )?.dataset.builderPart;
    if (ops.length) {
      rebuild();
      patch.textContent = JSON.stringify(ops, null, 2);
      if (!jsonDirty)
        json.value = JSON.stringify(core.getState().definition, null, 2);
    }
    canvas.refresh(!!ops.length);
    bench.update(!!ops.length);
    side.update();
    const selected = core.getState().selection;
    if (selected && preview) {
      const crumbs: string[] = [];
      let entry = preview.session.form.byId[selected];
      while (entry) {
        crumbs.unshift(entry.node.label ?? t(entry.model.title));
        entry = entry.parentId
          ? preview.session.form.byId[entry.parentId]
          : undefined;
      }
      canvasPanel.querySelector("h2")!.textContent = [
        t("ofb.formRoot"),
        ...crumbs,
      ].join(" › ");
    } else
      canvasPanel.querySelector("h2")!.textContent = t("of.builder.canvas");
    updateButtons();
    if (ops.length && (focusedPart === "canvas" || focusedPart === "outline"))
      canvas.focusSelected(focusedPart === "outline");
  }
  let lastSelection = core.getState().selection;
  const unsubscribe = core.subscribe((state, ops) => {
    if (lastSelection !== state.selection) {
      lastSelection = state.selection;
      root.dispatchEvent(
        new CustomEvent("of-select", {
          detail: { componentId: state.selection },
          bubbles: true,
          composed: true,
        }),
      );
    }
    render(ops);
    if (ops.length) {
      const detail: SchemaChange = Object.freeze({
        definition: state.definition,
        patch: ops,
      });
      options.onSchemaChange?.(detail);
      root.dispatchEvent(
        new CustomEvent<SchemaChange>("of-schema-change", {
          detail,
          bubbles: true,
          composed: true,
        }),
      );
    }
  });
  function load(definition: unknown): Diagnostic[] {
    assertAlive();
    try {
      return dispatch(new ReplaceDefinition(definition));
    } catch (cause) {
      const diagnostics: Diagnostic[] = [
        {
          severity: "error",
          code: "invalid-definition",
          message:
            cause instanceof Error ? cause.message : "Invalid definition",
        },
      ];
      report(diagnostics);
      return diagnostics;
    }
  }
  const activeElement = (): HTMLElement | undefined => {
    let active: Element | null = document.activeElement;
    while (active?.shadowRoot?.activeElement)
      active = active.shadowRoot.activeElement;
    return active instanceof HTMLElement ? active : undefined;
  };
  const refreshAppearance = (action: () => void) => {
    const focused = activeElement();
    action();
    canvas.decorate(true);
    canvas.updateTargets();
    if (focused?.isConnected && activeElement() !== focused)
      focused.focus({ preventScroll: true });
  };
  const setTheme = (next: Theme | string) => {
    assertAlive();
    refreshAppearance(() => {
      preview?.view.setTheme(next);
      design?.setTheme(next);
    });
    theme = next;
    applyChrome();
    settings.restyle();
    appearance.value = typeof next === "string" ? next : next.name;
  };
  const setMode = (next: ThemeMode) => {
    assertAlive();
    refreshAppearance(() => {
      preview?.view.setMode(next);
      design?.setMode(next);
    });
    mode = next;
    applyChrome();
    settings.restyle();
    modes.value = next;
  };
  appearance.addEventListener("change", () => setTheme(appearance.value), {
    signal: events.signal,
  });
  modes.addEventListener("change", () => setMode(modes.value as ThemeMode), {
    signal: events.signal,
  });
  json.addEventListener(
    "input",
    () => {
      jsonDirty = true;
    },
    { signal: events.signal },
  );
  search.addEventListener(
    "input",
    () => {
      const query = search.value.toLowerCase();
      for (const el of palette.querySelectorAll<HTMLButtonElement>(
        "button[data-type]",
      ))
        el.hidden = !`${el.textContent} ${el.dataset.type}`
          .toLowerCase()
          .includes(query);
    },
    { signal: events.signal },
  );
  phone.addEventListener(
    "change",
    () => {
      if (destroyed) return;
      settings.close();
      rebuild();
      canvas.refresh(true);
      bench.update();
      side.update();
      submit.disabled = phone.matches;
    },
    { signal: events.signal },
  );
  rebuild();
  submit.disabled = phone.matches;
  json.value = JSON.stringify(core.getState().definition, null, 2);
  canvas.refresh(true);
  bench.update();
  side.update();
  updateButtons();
  return {
    engine: host.engine,
    builder: core,
    get preview() {
      return preview;
    },
    load,
    selectSlot: (target) => {
      assertAlive();
      return canvas.choose(target);
    },
    setTheme,
    setMode,
    setChrome(next: ChromeOptions) {
      assertAlive();
      resolveChrome(
        next,
        typeof theme === "string" ? theme : theme.name,
        mode,
        options.builderThemes,
      );
      chrome = { ...next };
      applyChrome();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      events.abort();
      settings.close();
      unsubscribe();
      canvas.destroy();
      design?.destroy();
      preview?.destroy();
      design = undefined;
      preview = undefined;
      values.clear();
      options.onPreviewReady?.(undefined);
      shell.remove();
    },
  };
}
