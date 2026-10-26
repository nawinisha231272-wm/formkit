import { componentChildren } from "@ourform/schema";
import { UpdateProperty, ChangeKey } from "@ourform/builder-core";
import type { PanelProperty } from "@ourform/builder-core";
import { picker } from "./picker";
import type { Expr, ExprOp, ComponentNode } from "@ourform/schema";
import type { UI } from "./types";
interface EditorTools {
  actionButton: typeof import("./primitives").actionButton;
  element: typeof import("./types").element;
  button: typeof import("./types").button;
}
function all(nodes: ComponentNode[]): ComponentNode[] {
  return nodes.flatMap((node) => [node, ...all(componentChildren(node))]);
}
const comparisons = ["eq", "neq", "gt", "gte", "lt", "lte", "empty"] as const;
const calculations = ["add", "sub", "mul", "div", "concat"] as const;
type Row = {
  field: string;
  op: string;
  value: string;
  literal: Expr | undefined;
};
function expression(
  ui: UI,
  property: PanelProperty,
  componentId: string,
  tools: EditorTools,
): HTMLElement {
  const { actionButton, element, button } = tools;
  const host = element(ui.document, "section", "", "of-builder-expression");
  host.dataset.expression = property.key;
  host.setAttribute("aria-label", ui.t(property.label));
  const heading = element(ui.document, "h3", ui.t(property.label));
  const list = element(ui.document, "div");
  const rawView = element(ui.document, "details");
  rawView.append(element(ui.document, "summary", ui.t("ofb.writeExpression")));
  const label = element(
    ui.document,
    "label",
    ui.t(property.label),
    "of-builder-property",
  );
  const raw = element(ui.document, "textarea");
  raw.className = "ofb-primitive";
  raw.dataset.ofbPrimitive = "Input";
  raw.dataset.property = property.key;
  raw.value =
    property.value === undefined ? "" : JSON.stringify(property.value);
  label.append(raw);
  rawView.append(label);
  const calculate = property.key === "calculate.expr";
  const operators: readonly string[] = calculate
    ? [...calculations, ...comparisons]
    : comparisons;
  let data: Row[] = [],
    join = "and",
    representable = true;
  const parse = (value: unknown): Row[] | undefined => {
    if (value === undefined) return [];
    if (!Array.isArray(value)) return;
    if (!calculate && ["and", "or"].includes(value[0]) && value.length > 1) {
      const children = value.slice(1).map(parse);
      if (children.every((r) => r?.length === 1))
        return children.flatMap((r) => r!);
      return;
    }
    if (
      !operators.includes(value[0]) ||
      !value[1] ||
      typeof value[1] !== "object" ||
      typeof value[1].ref !== "string" ||
      value.length !== (value[0] === "empty" ? 2 : 3)
    )
      return;
    return [
      {
        literal: value[2] as Expr | undefined,
        field: value[1].ref,
        op: value[0],
        value:
          value[2] === undefined
            ? ""
            : typeof value[2] === "string"
              ? value[2]
              : JSON.stringify(value[2]),
      },
    ];
  };
  const fields = all(ui.builder.getState().definition.components).filter(
    (node) => node.id !== componentId && ui.engine.getField(node.type)?.value,
  );
  const publish = (value: unknown) => {
    ui.propertyIssue?.(property.key, undefined);
    return ui.dispatch(new UpdateProperty(componentId, property.key, value));
  };
  const publishRows = () => {
    const clauses = data.map((row): Expr => {
      const value = row.literal === undefined ? "" : row.literal;
      return row.op === "empty"
        ? ["empty", { ref: row.field }]
        : ([row.op as ExprOp, { ref: row.field }, value] as Expr);
    });
    const value =
      clauses.length > 1 || (join === "or" && clauses.length === 1)
        ? [join, ...clauses]
        : clauses[0];
    raw.value = value === undefined ? "" : JSON.stringify(value);
    publish(value);
  };
  const draw = () => {
    list.replaceChildren();
    add.hidden = !representable;
    add.disabled = !fields.length || (calculate && data.length > 0);
    if (!representable) {
      list.append(element(ui.document, "p", ui.t("ofb.complexExpression")));
      return;
    }
    if (!calculate)
      list.append(
        picker(
          ui,
          ui.t("of.builder.join"),
          [
            { value: "and", label: ui.t("of.builder.all") },
            { value: "or", label: ui.t("of.builder.any") },
          ],
          join,
          (value) => {
            join = value;
            publishRows();
          },
          element,
        ).element,
      );
    data.forEach((row, index) => {
      const sentence = element(ui.document, "fieldset", "", "ofb-rule-row");
      sentence.append(
        element(
          ui.document,
          "legend",
          ui.t("of.builder.condition", { index: index + 1 }),
        ),
      );
      const field = picker(
        ui,
        ui.t("of.builder.conditionField"),
        fields.map((node) => ({
          value: node.id,
          label: node.label || ui.engine.getField(node.type)!.title,
        })),
        row.field,
        (value) => {
          row.field = value;
          publishRows();
        },
        element,
      );
      const op = picker(
        ui,
        ui.t("of.builder.operator"),
        operators.map((value) => ({
          value,
          label: ui.t(`of.builder.op.${value}`),
        })),
        row.op,
        (value) => {
          row.op = value;
          comparison.disabled = value === "empty";
          publishRows();
        },
        element,
      );
      const valueLabel = element(
        ui.document,
        "label",
        ui.t("of.builder.comparisonValue"),
      );
      const comparison = element(ui.document, "input");
      comparison.className = "ofb-primitive";
      comparison.dataset.ofbPrimitive = "Input";
      comparison.value = row.value;
      comparison.disabled = row.op === "empty";
      comparison.oninput = () => {
        row.value = comparison.value;
        const source = fields.find((node) => node.id === row.field);
        const text =
          !calculate &&
          typeof ui.engine.getField(source?.type ?? "")?.value?.empty() ===
            "string";
        try {
          row.literal =
            text && !row.value.startsWith('"')
              ? row.value
              : (JSON.parse(row.value) as Expr);
        } catch {
          row.literal = row.value;
        }
        publishRows();
      };
      valueLabel.append(comparison);
      sentence.append(
        field.element,
        op.element,
        valueLabel,
        actionButton(
          ui,
          ui.t("of.builder.removeCondition", { index: index + 1 }),
          () => {
            data.splice(index, 1);
            draw();
            publishRows();
            (
              list.querySelector<HTMLInputElement>('[role="combobox"]') ?? add
            ).focus();
          },
          { icon: "close", iconOnly: true },
        ),
      );
      list.append(sentence);
    });
  };
  const add = button(ui, ui.t("of.builder.addCondition"), () => {
    if (fields[0]) {
      data.push({
        field: fields[0].id,
        op: calculate ? "add" : "eq",
        value: calculate ? "0" : "",
        literal: calculate ? 0 : "",
      });
      draw();
      publishRows();
    }
  });
  const sync = (value: unknown) => {
    const parsed = parse(value);
    representable = parsed !== undefined;
    data = parsed ?? [];
    join = Array.isArray(value) && value[0] === "or" ? "or" : "and";
    if (!representable) rawView.open = true;
    draw();
  };
  raw.addEventListener(
    "input",
    () => {
      try {
        const value: unknown =
          raw.value === "" ? undefined : JSON.parse(raw.value);
        const diagnostics = publish(value);
        if (!diagnostics.some((d) => d.severity === "error")) sync(value);
      } catch (cause) {
        ui.propertyIssue?.(
          property.key,
          cause instanceof Error ? cause.message : String(cause),
        );
      }
    },
    { signal: ui.signal },
  );
  host.append(heading, list, add, rawView);
  sync(property.value);
  return host;
}
export function renderProperties(
  host: HTMLElement,
  ui: UI,
  tools: EditorTools,
): void {
  const { element } = tools;
  const selected = ui.builder.getState().selection;
  host.replaceChildren();
  if (!selected) return;
  for (const group of ui.builder.propertyPanel(selected).groups) {
    const fieldset = element(ui.document, "fieldset");
    fieldset.dataset.propertyGroup = group.name;
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
      if (property.kind === "expr") {
        const editor = expression(ui, property, selected, tools);
        editor.hidden = !property.visible;
        fieldset.append(editor);
        continue;
      }
      const label = element(
        ui.document,
        "label",
        ui.t(property.label),
        "of-builder-property",
      );
      label.hidden = !property.visible;
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
      input.dataset.ofbPrimitive =
        property.kind === "select"
          ? "Select"
          : property.kind === "boolean"
            ? "Checkbox"
            : "Input";
      input.classList.add("ofb-primitive");
      if (ui.liveProperties && property.kind === "boolean") {
        input.dataset.ofbPrimitive = "Switch";
        input.setAttribute("role", "switch");
      }
      if (property.editor) input.dataset.editor = property.editor;
      input.addEventListener(
        ui.liveProperties ? "input" : "change",
        () => {
          ui.propertyIssue?.(property.key, undefined);
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
            ui.propertyIssue?.(
              property.key,
              cause instanceof Error ? cause.message : String(cause),
            );
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
    }
    host.append(fieldset);
  }
}
