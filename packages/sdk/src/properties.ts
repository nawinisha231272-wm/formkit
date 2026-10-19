import type { PropertyDefinition } from "@ourform/core";
import type { Expr } from "@ourform/schema";
type Input<T> = Omit<PropertyDefinition<T>, "kind" | "group"> & {
  group?: PropertyDefinition["group"];
};
const property = <T>(
  kind: PropertyDefinition["kind"],
  p: Input<T>,
): PropertyDefinition<T> => ({ group: "Display", ...p, kind });
export const stringProperty = (p: Input<string>) => property("string", p);
export const numberProperty = (p: Input<number>) => property("number", p);
export const booleanProperty = (p: Input<boolean>) => property("boolean", p);
export const selectProperty = (
  p: Input<string> & { options: { value: string; label: string }[] },
) => property("select", p);
export const exprProperty = (p: Input<Expr>) => property("expr", p);
export const optionsProperty = (p: Input<{ value: string; label: string }[]>) =>
  property("options", p);
export const jsonProperty = <T>(p: Input<T>) => property("json", p);
