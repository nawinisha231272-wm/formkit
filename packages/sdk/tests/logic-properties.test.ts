import { expect, test } from "vitest";
import { createEngine, type LogicPropertyPath } from "@ourform/core";
import { createLogic } from "@ourform/core/logic";
import {
  defineField,
  defineDisplay,
  defineLayout,
  definePreset,
  stringValue,
  stringProperty,
  h,
} from "../src/index";

test("logic capability metadata is forwarded and isolated by every SDK definer and registry", () => {
  const paths: LogicPropertyPath[] = ["label", "properties.hint"];
  const hint = stringProperty({
    label: "Hint",
    default: "base",
    logicSettable: true,
  });
  const field = defineField({
    type: "marked-field",
    title: "Marked",
    value: stringValue(),
    logicSettable: paths,
    properties: { hint },
    control: () => h("input", {}),
  });
  const display = defineDisplay({
    type: "marked-display",
    title: "Display",
    logicSettable: paths,
    properties: { hint },
    control: () => h("div", {}),
  });
  const layout = defineLayout({
    type: "marked-layout",
    title: "Layout",
    logicSettable: paths,
    properties: { hint },
  });
  const preset = definePreset("marked-preset", {
    base: field,
    title: "Preset",
    defaults: { hint: "preset" },
  });
  paths.push("description");
  hint.logicSettable = false;
  for (const registered of [field, display, layout, preset]) {
    expect(registered.model.logicSettable).toEqual([
      "label",
      "properties.hint",
    ]);
    expect(Object.isFrozen(registered.model.logicSettable)).toBe(true);
    expect(registered.model.properties!.hint!.logicSettable).toBe(true);
  }
  const e = createEngine({ logic: createLogic() });
  const rawPaths: LogicPropertyPath[] = ["label"];
  const raw = { ...field.model, type: "raw", logicSettable: rawPaths };
  e.register(raw);
  rawPaths.push("description");
  expect(e.getField("raw")!.logicSettable).toEqual(["label"]);
  expect(Object.isFrozen(e.getField("raw")!.logicSettable)).toBe(true);
  e.register(field.model)
    .register(display.model)
    .register(layout.model)
    .register(preset.model);
  for (const registered of [field, display, layout, preset]) {
    const compiled = e.compile({
      $formVersion: "1.0",
      id: "metadata",
      display: "form",
      components: [
        { id: "target", key: "target", type: registered.model.type },
      ],
      logic: [
        {
          id: "caption",
          trigger: { on: "load" },
          then: [
            {
              action: "setProperty",
              target: "target",
              property: "hint",
              value: "derived",
            },
          ],
        },
      ],
    });
    if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
    const s = e.createSession(compiled.form);
    expect(s.getFieldState("target").resolvedNode?.properties?.hint).toBe(
      "derived",
    );
    s.dispose();
  }
});
