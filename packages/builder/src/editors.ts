import { UpdateProperty, ChangeKey } from "@ourform/builder-core";
import type { PanelProperty } from "@ourform/builder-core";
import type { Expr, ComponentNode } from "@ourform/schema";
import { element, button } from "./types";
import type { UI } from "./types";
function all(nodes: ComponentNode[]): ComponentNode[] {
  return nodes.flatMap((node) => [node, ...all(node.components ?? [])]);
}
const operators = ["eq", "neq", "gt", "gte", "lt", "lte", "empty"] as const;
type Row = { field: string; op: (typeof operators)[number]; value: string };
function rows(value: unknown): Row[] {
  if (!Array.isArray(value)) return [];
  if (value[0] === "and") return value.slice(1).flatMap(rows);
  if (
    !operators.includes(value[0]) ||
    !value[1] ||
    typeof value[1] !== "object" ||
    typeof value[1].ref !== "string"
  )
    return [];
  return [
    {
      field: value[1].ref,
      op: value[0],
      value: value[2] === undefined ? "" : JSON.stringify(value[2]),
    },
  ];
}
function expression(
  ui: UI,
  property: PanelProperty,
  componentId: string,
): HTMLElement {
  const host = element(ui.document, "details", "", "of-builder-expression");
  host.dataset.expression = property.key;
  host.append(
    element(
      ui.document,
      "summary",
      ui.t("of.builder.conditions", { label: ui.t(property.label) }),
    ),
  );
  const list = element(ui.document, "div");
  const data = rows(property.value);
  const fields = all(ui.builder.getState().definition.components).filter(
    (node) => ui.engine.getField(node.type)?.value,
  );
  const draw = () => {
    list.replaceChildren();
    data.forEach((row, index) => {
      const fieldset = element(ui.document, "fieldset");
      fieldset.append(
        element(
          ui.document,
          "legend",
          ui.t("of.builder.condition", { index: index + 1 }),
        ),
      );
      const fieldLabel = element(
        ui.document,
        "label",
        ui.t("of.builder.conditionField"),
      );
      const field = element(ui.document, "select");
      for (const node of fields) {
        const option = element(
          ui.document,
          "option",
          node.label ?? node.key ?? node.id,
        );
        option.value = node.id;
        field.append(option);
      }
      field.value = row.field;
      field.onchange = () => {
        row.field = field.value;
      };
      fieldLabel.append(field);
      const opLabel = element(
        ui.document,
        "label",
        ui.t("of.builder.operator"),
      );
      const op = element(ui.document, "select");
      for (const kind of operators) {
        const option = element(
          ui.document,
          "option",
          ui.t(`of.builder.op.${kind}`),
        );
        option.value = kind;
        op.append(option);
      }
      op.value = row.op;
      op.onchange = () => {
        row.op = op.value as Row["op"];
      };
      opLabel.append(op);
      const valueLabel = element(
        ui.document,
        "label",
        ui.t("of.builder.comparisonValue"),
      );
      const value = element(ui.document, "input");
      value.type = "text";
      value.value = row.value;
      value.oninput = () => {
        row.value = value.value;
      };
      valueLabel.append(value);
      const remove = button(
        ui,
        ui.t("of.builder.removeCondition", { index: index + 1 }),
        () => {
          data.splice(index, 1);
          draw();
        },
      );
      fieldset.append(fieldLabel, opLabel, valueLabel, remove);
      list.append(fieldset);
    });
  };
  const add = button(ui, ui.t("of.builder.addCondition"), () => {
    if (fields[0]) {
      data.push({ field: fields[0].id, op: "eq", value: "" });
      draw();
    }
  });
  add.disabled = !fields.length;
  const apply = button(ui, ui.t("of.builder.applyConditions"), () => {
    const clauses: Expr[] = data.map((row) => {
      let value: Expr;
      try {
        value = JSON.parse(row.value) as Expr;
      } catch {
        value = row.value;
      }
      return row.op === "empty"
        ? ["empty", { ref: row.field }]
        : [row.op, { ref: row.field }, value];
    });
    ui.dispatch(
      new UpdateProperty(
        componentId,
        property.key,
        clauses.length > 1 ? ["and", ...clauses] : clauses[0],
      ),
    );
  });
  draw();
  host.append(list, add, apply);
  return host;
}
export function renderProperties(host: HTMLElement, ui: UI): void {
  const selected = ui.builder.getState().selection;
  host.replaceChildren();
  if (!selected) return;
  for (const group of ui.builder.propertyPanel(selected).groups) {
    const fieldset = element(ui.document, "fieldset");
    const groupKey = `of.builder.group.${group.name}`;
    const translated = ui.t(groupKey);
    fieldset.append(
      element(
        ui.document,
        "legend",
        translated === groupKey ? group.name : translated,
      ),
    );
    for (const property of group.properties) {
      if (!property.visible) continue;
      const label = element(
        ui.document,
        "label",
        ui.t(property.label),
        "of-builder-property",
      );
      const complex = ["expr", "json", "options"].includes(property.kind);
      const input =
        property.kind === "select"
          ? element(ui.document, "select")
          : complex
            ? element(ui.document, "textarea")
            : element(ui.document, "input");
      if (input instanceof HTMLSelectElement)
        for (const option of property.options ?? []) {
          const el = element(ui.document, "option", ui.t(option.label));
          el.value = option.value;
          input.append(el);
        }
      if (input instanceof HTMLInputElement) {
        input.type =
          property.kind === "boolean"
            ? "checkbox"
            : property.kind === "number"
              ? "number"
              : "text";
        input.checked = Boolean(property.value);
        if (property.min !== undefined) input.min = String(property.min);
        if (property.max !== undefined) input.max = String(property.max);
      }
      if (input instanceof HTMLTextAreaElement) input.rows = 3;
      input.value =
        property.value === undefined
          ? ""
          : complex
            ? JSON.stringify(property.value)
            : String(property.value);
      input.dataset.property = property.key;
      if (property.editor) input.dataset.editor = property.editor;
      input.addEventListener(
        "change",
        () => {
          try {
            const value: unknown =
              input instanceof HTMLInputElement && input.type === "checkbox"
                ? input.checked
                : input.value === "" && property.kind !== "string"
                  ? undefined
                  : complex
                    ? JSON.parse(input.value)
                    : property.kind === "number"
                      ? Number(input.value)
                      : input.value;
            ui.dispatch(
              property.key === "key" && typeof value === "string"
                ? new ChangeKey(selected, value)
                : new UpdateProperty(selected, property.key, value),
            );
          } catch (cause) {
            ui.announce(
              ui.t("of.builder.invalidProperty", {
                message: cause instanceof Error ? cause.message : "",
              }),
            );
          }
        },
        { signal: ui.signal },
      );
      label.append(input);
      fieldset.append(label);
      if (property.kind === "expr")
        fieldset.append(expression(ui, property, selected));
    }
    host.append(fieldset);
  }
}
