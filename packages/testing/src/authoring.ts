import { createEngine } from "@ourform/core";
import type { Engine, ValueAdapter } from "@ourform/core";
import type { ComponentNode, FormDefinition } from "@ourform/schema";
import { inspectJson, isRecord } from "@ourform/schema";
import type { RegisteredField, Theme } from "@ourform/sdk";
import { createFormController } from "@ourform/renderer-dom";
import type { HostOptions } from "@ourform/renderer-dom";
import {
  createBuilder,
  AddComponent,
  UpdateProperty,
} from "@ourform/builder-core";
import { validateSubmission } from "@ourform/validation";

export interface RenderComponentOptions
  extends Pick<HostOptions, "adapter" | "nativeHost" | "readOnly" | "engine"> {
  /** An empty DOM container owned by the caller; destroy() releases all library resources. */
  host: Element;
  theme?: string | Theme;
  themes?: readonly Theme[];
  fields?: readonly RegisteredField[];
  node?: Partial<Omit<ComponentNode, "type">>;
  data?: unknown;
}
export function renderComponent(
  definition: RegisteredField,
  options: RenderComponentOptions,
) {
  if (options.host.childNodes.length)
    throw new Error("renderComponent host must be empty.");
  const node: ComponentNode = {
    id: "subject",
    type: definition.model.type,
    label: definition.model.title,
    ...(definition.model.value || definition.model.dataScope === "object"
      ? { key: "value" }
      : {}),
    ...options.node,
  };
  return createFormController(options.host, {
    ...(options.engine ? { engine: options.engine } : {}),
    schema: {
      $formVersion: "1.0",
      id: "component-test",
      display: "form",
      components: [node],
    },
    fields: [definition, ...(options.fields ?? [])],
    ...(options.theme === undefined ? {} : { theme: options.theme }),
    ...(options.themes ? { themes: [...options.themes] } : {}),
    ...(options.data === undefined ? {} : { data: options.data }),
    ...(options.adapter ? { adapter: options.adapter } : {}),
    ...(options.nativeHost ? { nativeHost: options.nativeHost } : {}),
    ...(options.readOnly === undefined ? {} : { readOnly: options.readOnly }),
  });
}
function ordered(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(ordered);
  if (isRecord(value))
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, ordered(value[key])]),
    );
  return value;
}
const same = (a: unknown, b: unknown) =>
  JSON.stringify(ordered(a)) === JSON.stringify(ordered(b));
/** Empty recognition and canonical normalize/serialize round trips for customer-selected samples. */
export function checkValueAdapter<V>(
  adapter: ValueAdapter<V>,
  inputs: readonly unknown[],
): void {
  const serialize = (value: V) =>
    adapter.serialize ? adapter.serialize(value) : value;
  const empty = adapter.empty();
  if (!adapter.isEmpty(empty))
    throw new Error("ValueAdapter.empty must be empty.");
  const emptyJSON = serialize(empty);
  if (inspectJson(emptyJSON).length)
    throw new Error("ValueAdapter must serialize safe JSON.");
  for (const input of [emptyJSON, ...inputs]) {
    const first = adapter.normalize(input);
    const canonical = serialize(first);
    if (inspectJson(canonical).length)
      throw new Error("ValueAdapter must serialize safe JSON.");
    const second = adapter.normalize(canonical);
    const again = serialize(second);
    if (inspectJson(again).length)
      throw new Error("ValueAdapter must serialize safe JSON.");
    if (
      !(adapter.equals ? adapter.equals(first, second) : same(canonical, again))
    )
      throw new Error("ValueAdapter canonical round trip failed.");
  }
}
export async function checkValidation(
  engine: Engine,
  definition: FormDefinition,
  cases: readonly {
    data: unknown;
    valid: boolean;
    codes?: readonly string[];
  }[],
): Promise<void> {
  const result = engine.compile(definition);
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  for (const sample of cases) {
    const validated = await validateSubmission(result.form, sample.data, {
      providers: engine.providers,
    });
    if (
      validated.valid !== sample.valid ||
      (sample.codes &&
        !same(
          validated.errors.map((e) => e.error.code).sort(),
          [...sample.codes].sort(),
        ))
    )
      throw new Error(`Validation mismatch: ${JSON.stringify(validated)}`);
  }
}
/** Prove palette discovery, generated editing and byte-identical undo/redo without builder extensions. */
export function checkBuilderRoundTrip(
  engine: Engine,
  componentType: string,
): void {
  const builder = createBuilder(engine, {
    $formVersion: "1.0",
    id: "builder-test",
    display: "form",
    components: [],
  });
  if (
    !builder
      .palette()
      .some((group) =>
        group.components.some((component) => component.type === componentType),
      )
  )
    throw new Error(`Component missing from palette: ${componentType}`);
  const check = (diagnostics: ReturnType<typeof builder.dispatch>) => {
    if (diagnostics.some((diagnostic) => diagnostic.severity === "error"))
      throw new Error(JSON.stringify(diagnostics));
  };
  check(builder.dispatch(new AddComponent(componentType)));
  const node = builder.getState().definition.components[0]!;
  const before = JSON.stringify(builder.getState().definition);
  const panel = builder.propertyPanel(node.id);
  if (
    !panel.groups.some((group) =>
      group.properties.some((property) => property.key === "label"),
    )
  )
    throw new Error("Generated label editor missing.");
  check(
    builder.dispatch(new UpdateProperty(node.id, "label", "Edited component")),
  );
  const after = JSON.stringify(builder.getState().definition);
  builder.undo();
  if (JSON.stringify(builder.getState().definition) !== before)
    throw new Error("Builder undo changed JSON.");
  builder.redo();
  if (JSON.stringify(builder.getState().definition) !== after)
    throw new Error("Builder redo changed JSON.");
}

export function componentTestEngine(
  fields: readonly RegisteredField[],
): Engine {
  const engine = createEngine();
  for (const field of fields) engine.register(field.model);
  return engine;
}
