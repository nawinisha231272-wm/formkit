import type { ComponentModel, ConfigOf, PropertyMap } from "@ourform/core";
import type { PortableControl } from "./define-field";
import { defineField } from "./define-field";
import { stringValue } from "./value";
export function defineDisplay<P extends PropertyMap>(spec: {
  type: string;
  title: string;
  properties: P;
  control: PortableControl<unknown, ConfigOf<P>>;
}) {
  const field = defineField({ ...spec, value: stringValue(), shell: "none" });
  const model = { ...field.model } as ComponentModel;
  delete model.value;
  return Object.freeze({ ...field, model: Object.freeze(model) });
}
