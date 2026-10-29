import {
  createBuilder,
  AddComponent,
  AtomicCommand,
  RemoveComponent,
  MoveComponent,
  ReplaceDefinition,
} from "@ourform/builder-core";
import type { Command, JsonPatchOp } from "@ourform/builder-core";
import {
  createFormHost,
  createFormController,
  mount,
} from "@ourform/renderer-dom";
import type { FormController, FormView } from "@ourform/renderer-dom";
import type { Diagnostic, FormDefinition } from "@ourform/schema";
import { createMessages } from "./messages";
import { SettingsLoader } from "./settings-loader";
import { createFeatureLoader } from "./feature-loader";
import { featureOutlet } from "./feature-outlet";
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
import { element, button, componentLocation, componentTitle } from "./types";
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
    primitiveStyle + builderStyle + pointerStyle + workbenchStyle;
  const appearanceStyle = element(document, "style");
  if (options.styleNonce)
    style.nonce = appearanceStyle.nonce = options.styleNonce;
  let dynamicStyleId = 0;
  const _ofbStyle: UI["_ofbStyle"] = (target, ...declarations) => {
    const owner = target as HTMLElement & {
      _ofbRule?: { name: string; rule: CSSStyleDeclaration };
    };
    let cached = owner._ofbRule;
    if (!cached) {
      const name = instance + dynamicStyleId++;
      const sheet = style.sheet!;
      // CSP-safe replacements for inline declarations must outrank theme selectors.
      const index = sheet.insertRule(`:is(#${name},.${name}){}`);
      cached = owner._ofbRule = {
        name,
        rule: (sheet.cssRules[index] as CSSStyleRule).style,
      };
    }
    // Renderer/class refreshes may remove the marker without replacing the element.
    target.classList.add(cached.name);
    for (let index = 0; index < declarations.length; )
      cached.rule.setProperty(declarations[index++]!, declarations[index++]!);
  };
  const status = element(document, "div", "", "of-builder-status of-sr-only");
  status.id = `${prefix}diagnostics`;
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const registeredThemes: Theme[] = [...(options.themes ?? [])];
  const configuredTheme = options.theme;
  if (
    typeof configuredTheme === "object" &&
    !registeredThemes.some((item) => item.name === configuredTheme.name)
  )
    registeredThemes.push(configuredTheme);
  const registeredBuilderThemes = [...(options.builderThemes ?? [])];
  const lazyThemes = new Map<
    string,
    NonNullable<BuilderOptions["lazyThemes"]>[number]
  >();
  for (const registration of options.lazyThemes ?? []) {
    if (
      lazyThemes.has(registration.name) ||
      registeredThemes.some((item) => item.name === registration.name)
    )
      throw new Error(`Duplicate theme registration: ${registration.name}`);
    lazyThemes.set(registration.name, registration);
  }
  if (!registeredThemes.length && !lazyThemes.size)
    throw new Error(
      "Builder requires at least one registered form theme. Import one from @ourform/themes/<name>.",
    );
  let theme: Theme | string =
      configuredTheme ??
      registeredThemes[0]?.name ??
      options.lazyThemes?.[0]?.name ??
      "base",
    mode: ThemeMode = options.themeMode ?? "light";
  let chrome = { ...options.chrome };
  const preferenceKey = options.preferenceKey ?? "ourform.builder.look";
  if (!chrome.theme) {
    try {
      const saved = document.defaultView?.localStorage.getItem(preferenceKey);
      if (saved === "match-form" || saved === "neutral") chrome.theme = saved;
    } catch {
      /* Storage may be unavailable in embedded/private browsing. */
    }
  }
  const applyChrome = () => {
    const resolved = resolveChrome(
      chrome,
      typeof theme === "string" ? theme : theme.name,
      mode,
      registeredBuilderThemes,
    );
    appearanceStyle.textContent = chromeStyle(resolved, instance);
    shell.dataset.ofbTheme = resolved.name;
    shell.dataset.ofbMode = resolved.mode;
    shell.dataset.ofbDensity = resolved.density;
  };
  applyChrome();
  let preview: FormController | undefined;
  let design: FormView | undefined;
  let destroyed = false;
  const values = new Map<string, unknown>();
  const t = createMessages(options.messages, options.t);
  const notice = element(document, "div", "", "of-builder-toast");
  notice.dataset.ofbPrimitive = "Toast";
  notice.hidden = true;
  shell.append(notice);
  let announcementTimer: ReturnType<typeof setTimeout> | undefined;
  let remaining = 0,
    started = 0,
    ticking = false;
  const dismiss = () => {
    clearTimeout(announcementTimer);
    ticking = false;
    notice.hidden = true;
  };
  const pause = () => {
    if (!notice.childElementCount) return;
    clearTimeout(announcementTimer);
    if (ticking) remaining = Math.max(0, remaining - (Date.now() - started));
    ticking = false;
  };
  const resume = () => {
    if (
      ticking ||
      notice.hidden ||
      (notice.childElementCount &&
        (notice.matches(":hover") || notice.contains(document.activeElement)))
    )
      return;
    started = Date.now();
    ticking = true;
    announcementTimer = setTimeout(dismiss, remaining);
  };
  notice.addEventListener("mouseenter", pause);
  notice.addEventListener("mouseleave", resume);
  notice.addEventListener("focusin", pause);
  notice.addEventListener("focusout", () => queueMicrotask(resume));
  shell.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "F6") {
        const regions = [
          notice.hidden ? null : notice.querySelector("button"),
          shell.querySelector(".ofb-header button"),
          shell.querySelector(".of-builder-palette button"),
          shell.querySelector(
            '.of-builder-canvas [data-field-id][tabindex="0"]',
          ),
          shell.querySelector(
            '.of-builder-outline [role="treeitem"][tabindex="0"]',
          ),
        ].filter((node): node is HTMLElement => node instanceof HTMLElement);
        const current = regions.findIndex(
          (node) =>
            node === document.activeElement ||
            node.parentElement?.contains(document.activeElement),
        );
        const next =
          regions[
            (current + (event.shiftKey ? regions.length - 1 : 1)) %
              regions.length
          ];
        if (next) {
          event.preventDefault();
          next.focus();
        }
      }
    },
    { signal: events.signal },
  );
  const announce: UI["announce"] = (message, action) => {
    dismiss();
    status.textContent = "";
    if (!message) return;
    // Toast expiry never clears the independent polite live-region message.
    queueMicrotask(() => {
      if (!destroyed) status.textContent = message;
    });
    notice.replaceChildren(document.createTextNode(message));
    if (action) {
      const undoAction = document.createElement("button");
      undoAction.type = "button";
      undoAction.textContent = action.label;
      undoAction.setAttribute("aria-keyshortcuts", "F6");
      undoAction.onclick = () => {
        dismiss();
        action.run();
      };
      notice.append(undoAction);
    }
    notice.hidden = false;
    remaining = action ? 8000 : 5000;
    started = Date.now();
    resume();
  };
  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.target === document.body &&
        document.querySelectorAll(".of-builder").length === 1 &&
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "z"
      ) {
        event.preventDefault();
        core[event.shiftKey ? "redo" : "undo"]();
      }
    },
    { signal: events.signal },
  );
  const diagnosticText = (diagnostics: readonly Diagnostic[]) =>
    diagnostics.map((d) => `${d.code}: ${d.message}`).join(" · ");
  const report = (diagnostics: readonly Diagnostic[]) =>
    announce(diagnosticText(diagnostics));
  const complete = (
    command: Command | undefined,
    diagnostics: Diagnostic[],
    direction?: "undo" | "redo",
  ) => {
    if (diagnostics.some((d) => d.severity === "error")) report(diagnostics);
    else {
      const subject = command && core.commandLabel(command);
      const label = subject?.label || t("ofb.formRoot");
      let message = subject
        ? direction
          ? t(direction === "undo" ? "ofb.undid" : "ofb.redid", {
              command: t(`ofb.history.${subject.action}`, { label }),
            })
          : t(`ofb.did.${subject.action}`, { label })
        : t(direction === "undo" ? "ofb.nothingUndo" : "ofb.nothingRedo");
      if (!direction && command instanceof MoveComponent) {
        const location = canvas._ofbLocation(command.componentId);
        if (location)
          message = t("ofb.moved", {
            label,
            target: location.parent
              ? `${componentTitle(ui, location.parent)} / ${canvas._ofbCaption(canvas._ofbSlots(location.parent).find((slot) => slot.name === location.slot)!)}`
              : t("ofb.formRoot"),
            index: location.index + 1,
            count: location.siblings.length,
          });
      }
      if (diagnostics.length) message += ` · ${diagnosticText(diagnostics)}`;
      announce(
        message,
        !direction &&
          (command instanceof RemoveComponent ||
            (command instanceof AtomicCommand &&
              command.commands.some(
                (child) => child instanceof RemoveComponent,
              )))
          ? { label: t("ofb.undo"), run: () => core.undo() }
          : undefined,
      );
    }
    return diagnostics;
  };
  type SelectionSnapshot = ReturnType<Canvas["_ofbSelectionSet"]["snapshot"]>;
  const selectionHistory = new WeakMap<
    Command,
    { before: SelectionSnapshot; after: SelectionSnapshot }
  >();
  for (const direction of ["undo", "redo"] as const) {
    const execute = core[direction].bind(core);
    core[direction] = () => {
      const command = core
        .getState()
        .history[direction === "undo" ? "past" : "future"].at(-1);
      const result = execute();
      const snapshot =
        command &&
        selectionHistory.get(command)?.[
          direction === "undo" ? "before" : "after"
        ];
      if (
        snapshot &&
        !result.some((diagnostic) => diagnostic.severity === "error")
      ) {
        canvas._ofbSelectionSet.restore(snapshot);
        core.select(snapshot.primary);
        canvas._ofbUpdateTargets();
      }
      return complete(command, result, direction);
    };
  }
  const executeCommand = core.dispatch.bind(core);
  core.dispatch = (command, options) => {
    const before = canvas._ofbSelectionSet.snapshot();
    const result = executeCommand(command, options);
    canvas._ofbAcceptSelection(command, result);
    if (
      !result.some((diagnostic) => diagnostic.severity === "error") &&
      core.getState().history.past.at(-1) === command
    )
      selectionHistory.set(command, {
        before,
        after: canvas._ofbSelectionSet.snapshot(),
      });
    return complete(command, result);
  };
  const dispatch: UI["dispatch"] = (command, dispatchOptions) => {
    if (destroyed) return [];
    const removals =
      command instanceof RemoveComponent
        ? [command]
        : command instanceof AtomicCommand
          ? command.commands.filter(
              (child): child is RemoveComponent =>
                child instanceof RemoveComponent,
            )
          : [];
    for (const removal of removals) {
      if (
        root.dispatchEvent(
          new CustomEvent("of-before-delete", {
            detail: { componentId: removal.componentId },
            cancelable: true,
            bubbles: true,
            composed: true,
          }),
        )
      )
        continue;
      const diagnostics: Diagnostic[] = [
        {
          severity: "error",
          code: "delete-cancelled",
          message: t("ofb.deleteCancelled"),
        },
      ];
      report(diagnostics);
      return diagnostics;
    }
    return core.dispatch(command, dispatchOptions);
  };
  const ui: UI = {
    document,
    signal: events.signal,
    engine: host.engine,
    builder: core,
    form: () => preview?.session.form,
    t,
    announce,
    _ofbStyle,
    dispatch,
    ...(options.icons ? { icons: options.icons } : {}),
    ...(options.editor ? { editor: options.editor } : {}),
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
  const historyButton = (direction: "undo" | "redo") => {
    const control = button(ui, t(`of.builder.${direction}`), () => {
      control.focus();
      if (
        core.getState().history[direction === "undo" ? "past" : "future"].length
      )
        core[direction]();
    });
    control.id = `${prefix}${direction}`;
    control.replaceChildren(icon(document, direction, options.icons));
    control.dataset.ofbPrimitive = "IconButton";
    return control;
  };
  const undo = historyButton("undo"),
    redo = historyButton("redo");
  const appearanceLabel = element(
    document,
    "label",
    t("of.builder.previewTheme"),
  );
  const appearance = element(document, "select");
  appearance.id = `${prefix}builder-theme`;
  for (const name of [
    ...registeredThemes.map((theme) => theme.name),
    ...lazyThemes.keys(),
  ])
    if (!Array.from(appearance.options).some((o) => o.value === name)) {
      const registration = lazyThemes.get(name);
      const option = element(
        document,
        "option",
        registration?.label ??
          (t(`ofb.theme.${name}`) === `ofb.theme.${name}`
            ? name
            : t(`ofb.theme.${name}`)),
      );
      option.value = name;
      appearance.append(option);
    }
  appearance.value = typeof theme === "string" ? theme : theme.name;
  appearanceLabel.append(appearance);
  const appearanceStatus = element(document, "span", "", "ofb-feature-status");
  appearanceStatus.setAttribute("role", "status");
  appearanceStatus.hidden = true;
  appearanceLabel.append(appearanceStatus);
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
  const grid = part("div", "grid", "of-builder-grid");
  const library = panel("library", "of.builder.palette", true);
  const searchLabel = element(document, "label", t("of.builder.search"));
  const search = element(document, "input");
  search.type = "search";
  searchLabel.append(search);
  const palette = part("div", "palette", "of-builder-palette");
  palette.id = `${prefix}palette`;
  const outline = part("div", "outline", "of-builder-outline");
  library.append(searchLabel, palette);
  const canvasPanel = panel("canvas-panel", "of.builder.canvas");
  const instructions = element(document, "p", t("of.builder.instructions"));
  const canvasHost = part("div", "canvas", "of-builder-canvas");
  canvasHost.id = `${prefix}canvas`;
  canvasPanel.append(instructions, canvasHost);
  const inspector = panel("inspector", "of.builder.properties", true);
  inspector.classList.add("of-builder-inspector");
  inspector.append(outline);
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
  let lastPatch: readonly JsonPatchOp[] = [];
  let jsonView: { update(): void; focus(): void } | undefined;
  const window = document.defaultView!;
  const features = createFeatureLoader(
    options,
    document.baseURI,
    events.signal,
    {
      schedule(callback) {
        if (window.requestIdleCallback) {
          const id = window.requestIdleCallback(callback);
          return () => window.cancelIdleCallback(id);
        }
        const id = window.setTimeout(callback, 200);
        return () => window.clearTimeout(id);
      },
    },
  );
  const jsonOutlet = featureOutlet(jsonPanel, ui, features);
  const showJson = () => {
    if (jsonView) return;
    jsonOutlet.open("json", ({ mountJsonPanel }) => {
      jsonView = mountJsonPanel(jsonPanel, ui, prefix, load, () => lastPatch, {
        element,
        button,
      });
    });
  };
  bottom.append(previewPanel, jsonPanel);
  shell.append(style, appearanceStyle, status, grid, bottom);
  root.append(shell);
  const updateButtons = () => {
    const state = core.getState();
    undo.setAttribute("aria-disabled", String(!state.history.past.length));
    const last = state.history.past.at(-1);
    undo.title = last
      ? `${t("ofb.undo")} ${t(`ofb.history.${last.type}`, { label: core.commandLabel(last).label })}`
      : t("ofb.undo");
    redo.setAttribute("aria-disabled", String(!state.history.future.length));
  };
  const canvas = new Canvas(
    shell,
    canvasHost,
    palette,
    outline,
    ui,
    features,
    updateButtons,
  );
  const settings = new SettingsLoader({
    host: shell,
    ui,
    options,
    features,
    appearance: () => ({ theme, mode }),
    data: () => preview?.session.getData() ?? {},
    remove: (id) => dispatch(new RemoveComponent(id)),
    closed: (origin) => {
      if (destroyed) return;
      if (origin?.isConnected) origin.focus();
      else canvas._ofbFocusSelected();
    },
  });
  ui.reveal = (id) => {
    const origin = document.activeElement as HTMLElement | null;
    design?.focus(id);
    if (origin?.isConnected) origin.focus({ preventScroll: true });
  };
  ui.edit = (id, json = false) => {
    if (
      canvas._ofbSelectionSet._ofbMembers.length > 1 &&
      canvas._ofbSelectionSet._ofbMembers.includes(id)
    ) {
      if (json) announce(t("ofb.singleAction"));
      else canvas._ofbBulk("edit");
    } else settings._ofbOpen(id, json);
  };
  ui.add = (type, target, origin) => {
    if (
      options.editor?.openOnAdd !== false &&
      options.editor?.mode !== "drawer"
    ) {
      const diagnostics = settings._ofbAdd(type, target, origin);
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
      settings._ofbOpen(id);
    return diagnostics;
  };
  const side = sidebar({ host: inspector, outline, ui, features });
  const bench = workbench({
    features,
    root,
    shell,
    ui,
    grid,
    bottom,
    previewPanel,
    jsonPanel,
    modeChanged: (value) => {
      if (value === "json") showJson();
      else jsonOutlet.cancel();
    },
    appearance: appearanceLabel,
    modes: modeLabel,
    showIssues: () => side.show("issues"),
    look: () => chrome.theme ?? "match-form",
    setLook: (value) => {
      chrome = { ...chrome, theme: value };
      applyChrome();
      try {
        document.defaultView?.localStorage.setItem(preferenceKey, value);
      } catch {
        /* Keep the active preference for this instance. */
      }
    },
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
        themes: registeredThemes,
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
        themes: registeredThemes,
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
      lastPatch = ops;
      jsonView?.update();
    }
    canvas._ofbRefresh(!!ops.length);
    bench.update(!!ops.length);
    side.update();
    const selected = core.getState().selection;
    if (selected && preview) {
      canvasPanel.querySelector("h2")!.textContent = componentLocation(
        ui,
        preview.session.form,
        selected,
      );
    } else
      canvasPanel.querySelector("h2")!.textContent = t("of.builder.canvas");
    updateButtons();
    if (ops.length && (focusedPart === "canvas" || focusedPart === "outline"))
      canvas._ofbFocusSelected(focusedPart === "outline");
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
    if (ops.length) announce("");
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
    canvas._ofbDecorate(true);
    canvas._ofbUpdateTargets();
    if (focused?.isConnected && activeElement() !== focused)
      focused.focus({ preventScroll: true });
  };
  const applyTheme = (next: Theme | string) => {
    assertAlive();
    if (preview && design)
      refreshAppearance(() => {
        preview!.view.setTheme(next);
        design!.setTheme(next);
      });
    theme = next;
    applyChrome();
    settings._ofbRestyle();
    appearance.value = typeof next === "string" ? next : next.name;
    if (!preview || !design) rebuild();
  };
  let themeRequest = 0;
  const loadTheme = (name: string): void => {
    const registration = lazyThemes.get(name);
    if (!registration) {
      applyTheme(name);
      return;
    }
    const request = ++themeRequest;
    const focused = activeElement();
    appearance.disabled = true;
    appearanceLabel.setAttribute("aria-busy", "true");
    appearanceStatus.hidden = false;
    appearanceStatus.replaceChildren(
      t("ofb.featureLoading", { feature: registration.label ?? name }),
    );
    announce(appearanceStatus.textContent ?? "");
    void registration
      .load()
      .then((loaded) => {
        if (destroyed || request !== themeRequest) return;
        if (loaded.theme.name !== name)
          throw new Error(
            `Lazy theme ${name} loaded theme ${loaded.theme.name}.`,
          );
        if (registeredThemes.some((item) => item.name === name))
          throw new Error(`Duplicate theme registration: ${name}`);
        registeredThemes.push(loaded.theme);
        if (loaded.builderTheme) {
          if (
            registeredBuilderThemes.some(
              (item) => item.name === loaded.builderTheme!.name,
            )
          )
            throw new Error(
              `Duplicate builder theme registration: ${loaded.builderTheme.name}`,
            );
          registeredBuilderThemes.push(loaded.builderTheme);
        }
        lazyThemes.delete(name);
        appearance.disabled = false;
        appearanceLabel.removeAttribute("aria-busy");
        appearanceStatus.hidden = true;
        applyTheme(loaded.theme);
        (focused?.isConnected ? focused : appearance).focus({
          preventScroll: true,
        });
      })
      .catch((cause: unknown) => {
        if (destroyed || request !== themeRequest) return;
        appearance.disabled = false;
        appearanceLabel.removeAttribute("aria-busy");
        appearanceStatus.hidden = false;
        const reason = cause instanceof Error ? cause.message : String(cause);
        appearanceStatus.replaceChildren(
          t("ofb.featureFailed", { feature: registration.label ?? name }),
          element(document, "small", reason),
          button(ui, t("ofb.retry"), () => loadTheme(name)),
        );
        announce(appearanceStatus.firstChild?.textContent ?? "");
        (focused?.isConnected ? focused : appearance).focus({
          preventScroll: true,
        });
      });
  };
  const setTheme = (next: Theme | string) => {
    const name = typeof next === "string" ? next : next.name;
    if (typeof next === "string" && lazyThemes.has(name)) loadTheme(name);
    else applyTheme(next);
  };
  const setMode = (next: ThemeMode) => {
    assertAlive();
    refreshAppearance(() => {
      preview?.view.setMode(next);
      design?.setMode(next);
    });
    mode = next;
    applyChrome();
    settings._ofbRestyle();
    modes.value = next;
  };
  appearance.addEventListener("change", () => setTheme(appearance.value), {
    signal: events.signal,
  });
  modes.addEventListener("change", () => setMode(modes.value as ThemeMode), {
    signal: events.signal,
  });
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
      settings._ofbClose();
      rebuild();
      canvas._ofbRefresh(true);
      bench.update();
      side.update();
      submit.disabled = phone.matches;
    },
    { signal: events.signal },
  );
  rebuild();
  if (typeof theme === "string" && lazyThemes.has(theme))
    queueMicrotask(() => {
      if (!destroyed) loadTheme(theme as string);
    });
  submit.disabled = phone.matches;
  canvas._ofbRefresh(true);
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
      return canvas._ofbChoose(target);
    },
    setTheme,
    setMode,
    markSaved() {
      assertAlive();
      bench.markSaved();
    },
    markSaveFailed(message: string) {
      assertAlive();
      bench.markSaveFailed(message);
    },
    setChrome(next: ChromeOptions) {
      assertAlive();
      resolveChrome(
        next,
        typeof theme === "string" ? theme : theme.name,
        mode,
        registeredBuilderThemes,
      );
      chrome = { ...next };
      applyChrome();
      bench.syncLook();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      clearTimeout(announcementTimer);
      events.abort();
      settings._ofbClose();
      unsubscribe();
      canvas._ofbDestroy();
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
