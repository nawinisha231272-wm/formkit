import type { ValueAdapter } from "@ourform/sdk";
export const employees = [
  { id: "e1", name: "Ana Rivera" },
  { id: "e2", name: "Sam Chen" },
  { id: "e3", name: "Maya Patel" },
];
export type Employee = (typeof employees)[number];
export const employeeValue: ValueAdapter<Employee | null> = {
  empty: () => null,
  normalize: (input) =>
    input && typeof input === "object" && "id" in input
      ? (employees.find((employee) => employee.id === input.id) ?? null)
      : null,
  isEmpty: (value) => value === null,
  equals: (left, right) => left?.id === right?.id,
  serialize: (value) => value,
};

import type { FormController } from "@ourform/renderer-dom";
declare global {
  interface Window {
    hostDemo: {
      form: FormController;
      frameworkVersion?: string;
      unmount(): void;
    };
    defineExampleTag(tag?: string): CustomElementConstructor;
  }
}
