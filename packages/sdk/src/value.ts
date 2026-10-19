import type { ValueAdapter } from "@ourform/core";
export function stringValue(empty = ""): ValueAdapter<string> {
  if (empty.trim()) throw new Error("String empty value must be blank.");
  return {
    empty: () => empty,
    normalize: (v) => (v == null ? empty : String(v)),
    isEmpty: (v) => !v.trim(),
    jsonSchema: () => ({ type: "string" }),
  };
}
export function numberValue(
  options: { empty: null } = { empty: null },
): ValueAdapter<number | null> {
  if (options.empty !== null)
    throw new Error("Number empty value must be null.");
  return {
    empty: () => null,
    normalize: (v) => {
      if (v === null || v === undefined || (typeof v === "string" && !v.trim()))
        return null;
      if (typeof v !== "number" && typeof v !== "string") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    },
    isEmpty: (v) => v === null,
    jsonSchema: () => ({ type: ["number", "null"] }),
  };
}
export function booleanValue(): ValueAdapter<boolean> {
  return {
    empty: () => false,
    normalize: (v) => v === true || v === "true",
    isEmpty: (v) => !v,
    jsonSchema: () => ({ type: "boolean" }),
  };
}
