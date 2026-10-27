import { AddComponent, createBuilder } from "@ourform/builder-core";
import type { DropTarget } from "@ourform/builder-core";
import type { Diagnostic, FormDefinition } from "@ourform/schema";
import type { FeatureLoader } from "./feature-loader";
import {
  actionButton,
  dialog,
  drawer,
  labelledInput,
  tabs,
} from "./primitives";
import { featureOutlet } from "./feature-outlet";
import { componentIcon, icon } from "./icons";
import { button, componentLocation, componentTitle, element } from "./types";
import type { BuilderOptions } from "./types";
import type { Settings, SettingsContext, SettingsFrame } from "./settings";

interface PendingAddition {
  type: string;
  target: DropTarget;
  definition: FormDefinition;
  origin?: HTMLElement;
}

export interface SettingsLoaderContext
  extends Omit<SettingsContext, "features"> {
  features: FeatureLoader;
  options: BuilderOptions;
}

/** The dialog lifecycle and private Add draft exist before the generated editor arrives. */
export class SettingsLoader {
  #view: Settings | undefined;
  #loading:
    | {
        id: string;
        local: AbortController;
        close(committed?: boolean): void;
      }
    | undefined;
  #style: HTMLStyleElement | undefined;
  constructor(readonly _ofbContext: SettingsLoaderContext) {}
  get _ofbComponentId() {
    return this.#view?.componentId ?? this.#loading?.id;
  }
  get _ofbIsOpen() {
    return this._ofbComponentId !== undefined;
  }
  _ofbClose(): void {
    if (this.#view?.isOpen) this.#view.close();
    else this.#loading?.close();
  }
  _ofbRestyle(): void {
    this.#view?.restyle();
  }
  _ofbAdd(
    type: string,
    target: DropTarget,
    origin?: HTMLElement,
  ): Diagnostic[] {
    const { ui } = this._ofbContext;
    const draft = createBuilder(ui.engine, ui.builder.getState().definition);
    const diagnostics = draft.dispatch(
      new AddComponent(type, { ...target, naming: "camel" }),
    );
    const id = draft.getState().selection;
    if (
      id &&
      !diagnostics.some((diagnostic) => diagnostic.severity === "error")
    ) {
      const focused =
        origin ?? (ui.document.activeElement as HTMLElement | null);
      this._ofbOpen(id, false, {
        type,
        target,
        definition: draft.getState().definition,
        ...(focused ? { origin: focused } : {}),
      });
    }
    return diagnostics;
  }
  _ofbOpen(id: string, json = false, addition?: PendingAddition): void {
    this._ofbClose();
    const { host, ui, options } = this._ofbContext;
    const level = ui.builder.lockLevel(id);
    if (level === "all" && !json) {
      ui.announce(ui.t("ofb.lock.edit"));
      return;
    }
    const local = new AbortController();
    const primitive = {
      document: ui.document,
      signal: local.signal,
      _ofbStyle: ui._ofbStyle,
      ...(options.icons ? { icons: options.icons } : {}),
    };
    let overlay: ReturnType<typeof dialog> | undefined;
    const close = (committed = false) => {
      if (local.signal.aborted) return;
      local.abort();
      overlay?.close();
      container.remove();
      this.#loading = undefined;
      this._ofbContext.closed(
        !committed && addition ? addition.origin : undefined,
      );
    };
    const container =
      options.editor?.mode === "drawer" && !json
        ? drawer(primitive, ui.t("ofb.settings"))
        : (overlay = dialog(primitive, ui.t("ofb.settings"), close)).element;
    container.classList.add("ofb-settings");
    const heading = element(ui.document, "header", "", "ofb-settings-header");
    const title = element(ui.document, "h2", ui.t("ofb.settings"));
    const dismiss = actionButton(primitive, ui.t("ofb.close"), close, {
      icon: "close",
      iconOnly: true,
    });
    heading.append(title, dismiss);
    const status = element(
      ui.document,
      "div",
      ui.t("ofb.featureLoading", { feature: ui.t("ofb.settings") }),
      "ofb-feature-status",
    );
    status.setAttribute("role", "status");
    status.tabIndex = -1;
    container.setAttribute("aria-busy", "true");
    container.append(heading, status);
    host.append(container);
    overlay?.show();
    status.focus();
    ui.announce(status.textContent ?? "");
    this.#view = undefined;
    this.#loading = { id, local, close };
    const frame: SettingsFrame = {
      local,
      container,
      ...(overlay ? { overlay } : {}),
      shown: !!overlay,
      tools: {
        actionButton,
        tabs,
        labelledInput,
        featureOutlet,
        icon,
        componentIcon,
        element,
        button,
        componentTitle,
        componentLocation,
      },
    };
    const load = () => {
      container.setAttribute("aria-busy", "true");
      void this._ofbContext.features
        .load("settings")
        .then((module) => {
          if (local.signal.aborted || this.#loading?.local !== local) return;
          if (!this.#style) {
            this.#style = element(ui.document, "style");
            if (options.styleNonce) this.#style.nonce = options.styleNonce;
            this.#style.textContent = module.settingsStyle;
            host.prepend(this.#style);
          }
          container.replaceChildren();
          container.removeAttribute("aria-busy");
          const bridge: SettingsContext = {
            ...this._ofbContext,
            closed: (origin) => {
              this.#loading = undefined;
              this.#view = undefined;
              this._ofbContext.closed(origin);
            },
          };
          this.#view = new module.Settings(bridge);
          this.#view.open(id, json, addition, frame);
        })
        .catch((cause: unknown) => {
          if (local.signal.aborted || this.#loading?.local !== local) return;
          container.removeAttribute("aria-busy");
          status.replaceChildren(
            ui.t("ofb.featureFailed", { feature: ui.t("ofb.settings") }),
            element(
              ui.document,
              "small",
              cause instanceof Error ? cause.message : String(cause),
            ),
          );
          const actions = element(
            ui.document,
            "div",
            "",
            "ofb-feature-actions",
          );
          actions.append(actionButton(primitive, ui.t("ofb.retry"), load));
          if (addition)
            actions.append(
              actionButton(primitive, ui.t("ofb.addWithDefaults"), () => {
                const diagnostics = ui.dispatch(
                  new AddComponent(addition.type, {
                    ...addition.target,
                    naming: "camel",
                  }),
                );
                if (
                  !diagnostics.some(
                    (diagnostic) => diagnostic.severity === "error",
                  )
                )
                  close(true);
              }),
            );
          status.append(actions);
          status.focus();
          ui.announce(status.firstChild?.textContent ?? "");
        });
    };
    load();
  }
}
