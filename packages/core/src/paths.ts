import { isRecord, isSafeKey, inspectJson } from "@ourform/schema";
import type { Path, PathInput } from "./types";
export function parsePath(input: PathInput): Path {
  const parts = typeof input === "string" ? input.split(".") : [...input];
  if (
    !parts.length ||
    parts.some((k) => typeof k !== "string" || !isSafeKey(k))
  )
    throw new Error(
      "Invalid or unsafe object path; array rows are unavailable in M01.",
    );
  return Object.freeze(parts);
}
export function formatPath(path: Path): string {
  return parsePath(path).join(".");
}
export function pathKey(path: Path): string {
  return JSON.stringify(path);
}
export function readPath(data: unknown, path: Path): unknown {
  let value = data;
  for (const key of path) {
    if (
      typeof key !== "string" ||
      !isSafeKey(key) ||
      !isRecord(value) ||
      !Object.hasOwn(value, key)
    )
      return undefined;
    value = value[key];
  }
  return value;
}
export function freeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
export function snapshot<T>(value: T): T {
  const diagnostics = inspectJson(value);
  if (diagnostics.length) throw new Error(diagnostics[0]!.message);
  return freeze(JSON.parse(JSON.stringify(value)) as T);
}
export function writePath(
  data: Record<string, unknown>,
  path: Path,
  value: unknown,
): Record<string, unknown> {
  const [key, ...rest] = path;
  if (typeof key !== "string" || !isSafeKey(key))
    throw new Error("Unsafe store path.");
  const child = isRecord(data[key]) ? data[key] : {};
  return Object.freeze({
    ...data,
    [key]: rest.length ? writePath(child, rest, value) : value,
  });
}
