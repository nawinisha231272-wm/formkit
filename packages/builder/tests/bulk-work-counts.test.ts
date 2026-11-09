import { expect, test } from "vitest";
import { createEngine } from "@ourform/core";
import {
  createBuilder,
  AtomicCommand,
  RemoveComponent,
  UpdateProperty,
} from "@ourform/builder-core";
import { textField, panelLayout } from "@ourform/components";
import type { Command } from "@ourform/builder-core";
import type { FormDefinition } from "@ourform/schema";
import { selectionCommand } from "../src/bulk-commands";
import { createCommandIndex } from "../src/features/commands";
import expected from "../../../docs/performance/builder-authoring-counts.json";

test("500-field indexing and bulk Delete/Move/Required perform exactly the stored work counts", async () => {
  const engine = createEngine()
    .register(textField.model)
    .register(panelLayout.model);
  const nodes = Array.from({ length: 500 }, (_, index) => ({
    id: `field_${index}`,
    type: "text",
    key: `field${index}`,
    label: `Field ${index + 1}`,
  }));
  const definition: FormDefinition = {
    $formVersion: "1.0",
    id: "authoring-counts",
    display: "form",
    components: nodes,
  };
  const index = createCommandIndex();
  const start = performance.now();
  expect(await index.load(definition)).toHaveLength(500);
  const indexMs = performance.now() - start;
  expect(index.visits).toBe(expected.indexNodeVisits);
  const cached = index.load(definition);
  expect(await cached).toHaveLength(500);
  expect(index.visits).toBe(expected.indexNodeVisits);
  const results: Record<
    string,
    {
      childCommands: number;
      publications: number;
      historyEntries: number;
      milliseconds: number;
    }
  > = {};
  for (const action of ["delete", "move", "required"] as const) {
    const current =
      action === "move"
        ? {
            ...definition,
            components: [
              ...nodes,
              { id: "target", type: "panel", components: [] },
            ],
          }
        : definition;
    const builder = createBuilder(engine, current);
    let runs = 0,
      publications = 0;
    builder.subscribe(() => publications++);
    const operation =
      action === "move"
        ? selectionCommand(
            "move",
            nodes.map((node) => node.id),
            { parentId: "target" },
            { scope: "scope", wrap: "wrap", missing: "missing" },
          )
        : undefined;
    const commands: Command[] = operation
      ? [operation.command]
      : nodes.map((node) => {
          const command =
            action === "delete"
              ? new RemoveComponent(node.id)
              : new UpdateProperty(node.id, "validation.required", true);
          return {
            ...command,
            apply(state, context) {
              runs++;
              return command.apply(state, context);
            },
            invert: command.invert.bind(command),
          };
        });
    const started = performance.now();
    expect(builder.dispatch(new AtomicCommand(action, commands))).toEqual([]);
    const milliseconds = performance.now() - started;
    runs = operation?.runs() ?? runs;
    results[action] = {
      childCommands: runs,
      publications,
      historyEntries: builder.getState().history.past.length,
      milliseconds,
    };
    expect({
      childCommands: runs,
      publications,
      historyEntries: builder.getState().history.past.length,
    }).toEqual(expected.bulk[action]);
    const after = JSON.stringify(builder.getState().definition);
    builder.undo();
    expect(builder.getState().definition).toEqual(current);
    builder.redo();
    expect(JSON.stringify(builder.getState().definition)).toBe(after);
  }
  console.log(
    JSON.stringify({
      platform: `${process.platform}-${process.arch}`,
      fields: 500,
      indexMs,
      indexNodeVisits: index.visits,
      bulk: results,
    }),
  );
}, 60000);
