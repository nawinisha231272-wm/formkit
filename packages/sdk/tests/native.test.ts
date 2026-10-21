import { expect, test } from "vitest";
import { registerNativeField, mapNativeProps, stringValue } from "@ourform/sdk";
import type { FieldControlProps } from "@ourform/sdk";
import { registerReactField } from "@ourform/react";
const widget = () => null;
test("native registrations are descriptors with adapter conventions, explicit mappings and no global registry", () => {
  const react = registerNativeField("react", "employee", widget);
  const angular = registerNativeField("angular", "employee", widget);
  const element = registerNativeField("element", "employee", "employee-lookup");
  expect(react.views.native?.react?.mapping).toMatchObject({
    valueProp: "value",
    changeProp: "onValueChange",
    blurProp: "onBlur",
    disabledProp: "disabled",
  });
  expect(angular.views.native?.angular?.mapping.changeProp).toBe("valueChange");
  expect(element.views.native?.element?.mapping.changeProp).toBe(
    "value-change",
  );
  expect(react.views.native?.angular).toBeUndefined();
  expect(() => registerNativeField("", "bad", widget)).toThrow("needs adapter");
  expect(Object.isFrozen(react)).toBe(true);
});
test("primitive models normalize values and enforce the complex-value adapter boundary", () => {
  expect(
    registerNativeField("react", "s", widget).model.value?.normalize(7),
  ).toBe("7");
  expect(
    registerNativeField("react", "n", widget, {
      valueType: "number",
    }).model.value?.normalize("0"),
  ).toBe(0);
  expect(
    registerNativeField("react", "b", widget, {
      valueType: "boolean",
    }).model.value?.normalize(true),
  ).toBe(true);
  const array = registerNativeField("react", "a", widget, {
    valueType: "array",
  }).model.value!;
  expect(array.normalize([1, "x", false])).toEqual([1, "x", false]);
  expect(array.isEmpty(array.empty())).toBe(true);
  expect(() => array.normalize([{}])).toThrow("value adapter");
  expect(() =>
    registerNativeField("react", "bad", widget).model.value?.normalize({
      id: "e1",
    }),
  ).toThrow("Object-valued native controls require a value adapter");
  const object = registerNativeField("react", "object", widget, {
    value: {
      empty: () => null,
      normalize: (v) => v,
      isEmpty: (v) => v === null,
    },
  });
  expect(object.model.value?.normalize({ id: "e1" })).toEqual({ id: "e1" });
  // This statement is checked by tsc; erased prop types cannot be inspected at runtime.
  // @ts-expect-error object-valued React controls require a value adapter
  registerReactField("bad-object", (_p: { value: { id: string } }) => null);
  registerReactField(
    "good-object",
    (_p: { value: { id: string } | null }) => null,
    {
      value: {
        empty: () => null,
        normalize: () => null,
        isEmpty: (v) => v === null,
      },
    },
  );
});
test("native mapping passes all control state and supports unusual change signatures", () => {
  const field = registerNativeField("react", "unusual", widget, {
    valueProp: "selected",
    changeProp: "changed",
    blurProp: "left",
    disabledProp: "locked",
    readOnlyProp: "frozen",
    mapChange: (...args) => String(args[1]),
  });
  let value: unknown;
  let touched = false;
  const props: FieldControlProps<unknown, Record<string, unknown>> = {
    value: "before",
    setValue: (next) => (value = next),
    onBlur: () => (touched = true),
    config: {},
    state: {
      disabled: false,
      readOnly: false,
      invalid: true,
      pending: false,
      required: true,
    },
    a11y: {
      id: "id",
      name: "employee",
      labelledBy: "label",
      describedBy: "help",
    },
    focusRef: () => {},
    theme: { classFor: () => "control" },
    t: (key) => key,
  };
  const mapped = mapNativeProps(field.views.native!.react!, props);
  expect(mapped).toMatchObject({
    selected: "before",
    locked: false,
    frozen: false,
    required: true,
    id: "id",
    "aria-labelledby": "label",
    "aria-describedby": "help",
    "aria-invalid": "true",
    "aria-required": "true",
  });
  (mapped.changed as (...values: unknown[]) => void)("event", "next");
  (mapped.left as () => void)();
  expect(value).toBe("next");
  expect(touched).toBe(true);
  (
    mapNativeProps(field.views.native!.react!, {
      ...props,
      state: { ...props.state, readOnly: true },
    }).changed as (value: string) => void
  )("ignored");
  expect(value).toBe("next");
  expect(() =>
    registerNativeField("react", "mismatch", widget, {
      model: { type: "other", title: "other", value: stringValue() },
    }),
  ).toThrow("must match");
});

test("native registration rejects prototype and HTML-writing properties", () => {
  for (const valueProp of [
    "__proto__",
    "constructor",
    "prototype",
    "innerHTML",
    "outerHTML",
    "srcdoc",
    "dangerouslySetInnerHTML",
  ])
    expect(() =>
      registerNativeField("react", "unsafe", widget, { valueProp }),
    ).toThrow("Unsafe native property");
});

test("typed non-string registrations require an explicit inference choice", () => {
  // @ts-expect-error runtime number inference requires valueType or a value adapter
  registerReactField("number-missing", (_p: { value: number | null }) => null);
  registerReactField("number", (_p: { value: number | null }) => null, {
    valueType: "number",
  });
  registerReactField("boolean", (_p: { value: boolean }) => null, {
    valueType: "boolean",
  });
  registerReactField("array", (_p: { value: string[] }) => null, {
    valueType: "array",
  });
});
