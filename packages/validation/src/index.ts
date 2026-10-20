import { FormSession } from "@ourform/core";
import type {
  Engine,
  CompiledForm,
  CompileResult,
  Path,
  Providers,
  ValidationResult,
} from "@ourform/core";
import { inspectJson, isRecord } from "@ourform/schema";
export { toSubmissionSchema } from "@ourform/schema";
export type { JSONSchema } from "@ourform/schema";
export function compileForm(
  engine: Engine,
  definition: unknown,
): CompileResult {
  return engine.compile(definition);
}
function equal(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right))
    return (
      left.length === right.length && left.every((v, i) => equal(v, right[i]))
    );
  if (isRecord(left) && isRecord(right))
    return (
      Object.keys(left).length === Object.keys(right).length &&
      Object.keys(left).every(
        (k) => Object.hasOwn(right, k) && equal(left[k], right[k]),
      )
    );
  return false;
}
function read(data: unknown, path: Path): unknown {
  return path.reduce<unknown>(
    (value, key) =>
      typeof key === "string" && isRecord(value) && Object.hasOwn(value, key)
        ? value[key]
        : undefined,
    data,
  );
}
export interface ValidateSubmissionOptions {
  providers?: Providers;
  /** Ignore unknown scope keys before host validation; never mutates the input. */
  unknownKeys?: "reject" | "strip";
}
/** Validate canonical SDK data, enforcing the selected unknown-key policy before host validators. */
export async function validateSubmission(
  form: CompiledForm,
  submission: unknown,
  options: ValidateSubmissionOptions = {},
): Promise<ValidationResult> {
  if (
    options.unknownKeys !== undefined &&
    options.unknownKeys !== "reject" &&
    options.unknownKeys !== "strip"
  )
    throw new TypeError("unknownKeys must be reject or strip");
  const errors: ValidationResult["errors"] = [];
  const add = (componentId: string, path: Path, code: string) =>
    errors.push({
      componentId,
      path,
      error: { code, messageKey: `of.validation.${code}` },
    });
  if (inspectJson(submission).length || !isRecord(submission)) {
    add(form.definition.id, [], "submission");
    return { valid: false, errors };
  }
  const leaves = form.nodes.filter((entry) => entry.model.value);
  const scopePaths = new Set(
    form.nodes
      .filter((e) => e.model.dataScope === "object")
      .map((e) => JSON.stringify(e.path)),
  );
  const leafPaths = new Set(leaves.map((e) => JSON.stringify(e.path)));
  function inspect(
    value: Record<string, unknown>,
    parent: string[],
  ): Record<string, unknown> {
    const filtered: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      const path = [...parent, key];
      const encoded = JSON.stringify(path);
      if (leafPaths.has(encoded)) filtered[key] = child;
      else if (scopePaths.has(encoded)) {
        if (isRecord(child)) filtered[key] = inspect(child, path);
        else add(form.definition.id, path, "submission");
      } else if (options.unknownKeys !== "strip")
        add(form.definition.id, path, "submission");
    }
    return filtered;
  }
  const data = inspect(submission, []);
  for (const entry of leaves) {
    const raw = read(data, entry.path);
    if (raw === undefined) continue;
    try {
      const value = entry.model.value!.normalize(raw);
      const canonical = entry.model.value!.serialize
        ? entry.model.value!.serialize(value)
        : value;
      if (!equal(raw, canonical)) add(entry.node.id, entry.path, "type");
    } catch {
      add(entry.node.id, entry.path, "type");
    }
  }
  if (errors.length) return { valid: false, errors };
  let session: FormSession;
  try {
    session = new FormSession(form, {
      data,
      ...(options.providers ? { providers: options.providers } : {}),
    });
  } catch {
    add(form.definition.id, [], "submission");
    return { valid: false, errors };
  }
  try {
    for (const entry of leaves) {
      const state = session.getFieldState(entry.node.id);
      if (!state.visible) continue;
      const raw = read(data, entry.path);
      if (raw === undefined && state.required)
        add(entry.node.id, entry.path, "required");
      if (
        entry.node.calculate &&
        !entry.node.calculate.allowOverride &&
        raw !== undefined &&
        !equal(
          raw,
          entry.model.value?.serialize
            ? entry.model.value.serialize(state.value)
            : state.value,
        )
      )
        add(entry.node.id, entry.path, "calculated");
    }
    const result = await session.validate();
    for (const entry of result.errors)
      if (
        !errors.some(
          (e) =>
            e.componentId === entry.componentId &&
            e.error.code === entry.error.code,
        )
      )
        errors.push(entry);
    return { valid: !errors.length, errors };
  } finally {
    session.dispose();
  }
}
