import type {
  ComponentNode,
  ComponentColumn,
  ColumnWidth,
  FormDefinition,
} from "./types";
import { componentChildren } from "./children";

/** Convert legacy width spans to explicit rows/columns without editing caller-owned JSON. */
export function migrateColumns(input: FormDefinition): {
  definition: FormDefinition;
  applied: string[];
} {
  const definition = JSON.parse(JSON.stringify(input)) as FormDefinition;
  const reserved = new Set<string>();
  function collect(nodes: ComponentNode[]): void {
    for (const node of nodes) {
      reserved.add(node.id);
      collect(componentChildren(node));
    }
  }
  collect(definition.components);
  let changed = false;
  function rowId(parent: string, index: number): string {
    const stem = `${parent}_row_${index + 1}`;
    let id = stem;
    for (let suffix = 2; reserved.has(id); suffix++) id = `${stem}_${suffix}`;
    reserved.add(id);
    return id;
  }
  function visit(nodes: ComponentNode[]): void {
    for (const node of nodes) {
      if (node.type === "columns" && node.columns === undefined) {
        changed = true;
        const children = node.components ?? [];
        const rows: ComponentColumn[][] = [];
        let row: ComponentColumn[] = [],
          used = 0;
        function finish(): void {
          if (!row.length) return;
          if (used < 12)
            row.push({ width: (12 - used) as ColumnWidth, components: [] });
          rows.push(row);
          row = [];
          used = 0;
        }
        for (const child of children) {
          const width = child.layout?.width ?? 12;
          if (child.slot !== undefined && child.slot !== "children")
            throw new Error("Legacy Columns has an unknown slot.");
          if (used + width > 12) finish();
          if (child.layout?.width !== undefined) {
            delete child.layout.width;
            if (!Object.keys(child.layout).length) delete child.layout;
          }
          delete child.slot;
          row.push({ width, components: [child] });
          used += width;
          if (used === 12) finish();
        }
        finish();
        delete node.components;
        if (!rows.length)
          node.columns = [
            { width: 6, components: [] },
            { width: 6, components: [] },
          ];
        else if (rows.length === 1) node.columns = rows[0]!;
        else if (
          rows.every(
            (columns) => columns.length === 1 && columns[0]!.width === 12,
          )
        )
          node.columns = [{ width: 12, components: children }];
        else
          node.columns = [
            {
              width: 12,
              components: rows.map((columns, index) => ({
                id: rowId(node.id, index),
                type: "columns",
                columns,
              })),
            },
          ];
      }
      visit(componentChildren(node));
    }
  }
  visit(definition.components);
  return {
    definition: changed ? definition : input,
    applied: changed ? ["columns-per-column-v1"] : [],
  };
}
