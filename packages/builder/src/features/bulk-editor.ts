import { settingsMessages } from "../settings-messages";
import {
  AtomicCommand,
  UpdateProperty,
  ChangeKey,
} from "@ourform/builder-core";
import type { Builder, PanelProperty } from "@ourform/builder-core";
import { renderProperties } from "../editors";
import type { UI, EditorOptions } from "../types";

type Tools = Parameters<typeof renderProperties>[2] & {
  tabs: typeof import("../primitives").tabs;
};
/** Metadata intersection uses the exact property selection, including selected descendants. */
export function sharedPropertyPanel(
  builder: Builder,
  ids: readonly string[],
  hidden: ReadonlySet<string> = new Set(),
) {
  const panels = ids.map((id) => builder.propertyPanel(id));
  const others = panels.slice(1).map(
    (panel) =>
      new Map(
        panel.groups
          .flatMap((group) => group.properties)
          .filter((property) => property.visible)
          .map((property) => [property.key, property]),
      ),
  );
  const mixed = new Set<string>();
  const groups = (panels[0]?.groups ?? [])
    .map((group) => ({
      ...group,
      properties: group.properties
        .filter(
          (property) =>
            property.visible &&
            !hidden.has(property.key) &&
            others.every((panel) => {
              const other = panel.get(property.key);
              return (
                other &&
                other.kind === property.kind &&
                JSON.stringify(other.options) ===
                  JSON.stringify(property.options) &&
                other.editor === property.editor
              );
            }),
        )
        .map((property): PanelProperty => {
          if (
            others.some(
              (panel) =>
                JSON.stringify(panel.get(property.key)!.value) !==
                JSON.stringify(property.value),
            )
          ) {
            mixed.add(property.key);
            return { ...property, value: undefined };
          }
          return property;
        }),
    }))
    .filter((group) => group.properties.length);
  return { panel: { componentId: ids[0] ?? "", groups }, mixed };
}

export function mountBulkEditor(
  host: HTMLElement,
  ui: UI,
  tools: Tools,
  ids: readonly string[],
  editor: EditorOptions | undefined,
  close: () => void,
) {
  ui = { ...ui, t: settingsMessages(ui.t) };
  const baseline = ui.builder.getState().definition;
  const hidden = new Set<string>();
  for (const id of ids) {
    const type = ui.form?.()?.byId[id]?.node.type;
    for (const key of [
      ...(editor?.properties?.["*"]?.hide ?? []),
      ...(type ? (editor?.properties?.[type]?.hide ?? []) : []),
    ])
      hidden.add(key);
  }
  const { panel, mixed } = sharedPropertyPanel(ui.builder, ids, hidden);
  panel.groups = panel.groups.filter(
    (group) => !editor?.tabs?.hide?.includes(group.name),
  );
  const changes = new Map<string, unknown>();
  const problems = new Map<string, string>();
  const feedback = tools.element(ui.document, "p");
  feedback.setAttribute("role", "status");
  feedback.hidden = true;
  const body = tools.element(ui.document, "div", "", "ofb-bulk-properties");
  const updateProblem = (key: string, problem: string | undefined) => {
    if (problem) problems.set(key, problem);
    else problems.delete(key);
    feedback.textContent = [...problems.values()].join(" · ");
    feedback.hidden = !problems.size;
  };
  const draftUI: UI = {
    ...ui,
    liveProperties: false,
    builder: {
      ...ui.builder,
      getState: () => ({ ...ui.builder.getState(), selection: ids[0] ?? null }),
      propertyPanel: () => panel,
    },
    dispatch(command) {
      if (command instanceof UpdateProperty)
        changes.set(command.key, command.value);
      else if (command instanceof ChangeKey) changes.set("key", command.key);
      return [];
    },
    propertyIssue: updateProblem,
  };
  renderProperties(body, draftUI, tools);
  ui._ofbStyle(host, "display", "grid", "gap", "16px");
  ui._ofbStyle(body, "max-block-size", "55vh", "overflow", "auto");
  body.id = `ofb-bulk-${globalThis.crypto.randomUUID()}`;
  body.setAttribute("role", "tabpanel");
  const groups = [...body.children] as HTMLElement[];
  const show = (name: string) => {
    groups.forEach((group, index) => {
      group.hidden = panel.groups[index]!.name !== name;
    });
    if (groups.length)
      body.setAttribute(
        "aria-labelledby",
        `${body.id}-${panel.groups.findIndex((group) => group.name === name)}`,
      );
  };
  const first = panel.groups[0]?.name ?? "";
  const bar = groups.length
    ? tools.tabs(
        ui,
        ui.t("ofb.settings"),
        panel.groups.map((group) => ({
          value: group.name,
          label: ui.t(`ofb.group.${group.name}`),
        })),
        first,
        show,
      )
    : undefined;
  bar?.buttons.forEach((button, index) => {
    button.id = `${body.id}-${index}`;
    button.setAttribute("aria-controls", body.id);
  });
  for (const group of groups)
    ui._ofbStyle(group, "border", "0", "padding", "0", "margin", "0");
  for (const field of body.querySelectorAll<HTMLElement>(
    ".of-builder-property",
  )) {
    const checkbox = field.querySelector('input[type="checkbox"]');
    ui._ofbStyle(
      field,
      "display",
      checkbox ? "flex" : "grid",
      "gap",
      "6px",
      "margin-block-end",
      "12px",
    );
  }
  show(first);
  for (const control of body.querySelectorAll<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >("[data-property]")) {
    if (
      control.dataset.property === "key" &&
      ids.some((id) => ui.builder.lockLevel(id))
    ) {
      control.disabled = true;
      control.title = ui.t("ofb.lock.key");
    }
    if (!mixed.has(control.dataset.property!)) continue;
    if (control instanceof HTMLInputElement && control.type === "checkbox")
      control.indeterminate = true;
    else if (
      control instanceof HTMLInputElement ||
      control instanceof HTMLTextAreaElement
    )
      control.placeholder = ui.t("ofb.mixedValues");
  }
  const save = tools.button(ui, ui.t("ofb.save"), () => {
    if (problems.size) return ui.announce(feedback.textContent ?? "");
    if (baseline !== ui.builder.getState().definition) {
      feedback.hidden = false;
      feedback.textContent = ui.t("ofb.editorConflict");
      return ui.announce(feedback.textContent);
    }
    const result = ui.dispatch(
      new AtomicCommand(
        ui.t("ofb.bulkAction", { action: ui.t("ofb.edit"), count: ids.length }),
        ids.flatMap((id) =>
          [...changes].map(([key, value]) =>
            key === "key" && typeof value === "string"
              ? new ChangeKey(id, value)
              : new UpdateProperty(id, key, value),
          ),
        ),
      ),
    );
    if (!result.some((diagnostic) => diagnostic.severity === "error")) close();
    else {
      feedback.hidden = false;
      feedback.textContent = result
        .map((diagnostic) => diagnostic.message)
        .join(" · ");
    }
  });
  save.dataset.variant = "primary";
  const footer = tools.element(ui.document, "footer");
  ui._ofbStyle(
    footer,
    "display",
    "flex",
    "justify-content",
    "end",
    "gap",
    "8px",
  );
  footer.append(tools.button(ui, ui.t("ofb.cancel"), close), save);
  host.replaceChildren(body, feedback, footer);
  if (bar) host.prepend(bar.element);
  if (!panel.groups.length) {
    feedback.hidden = false;
    feedback.textContent = ui.t("ofb.noSharedProperties");
  }
  host.querySelector<HTMLElement>("input,select,textarea,button")?.focus();
}
