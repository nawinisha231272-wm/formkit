import type { UI } from "./types";
/** Host filtering never fabricates a component that is absent from the engine registry. */
export function paletteGroups(ui: UI) {
  const groups = new Map<
    string,
    {
      name: string;
      label: string;
      components: ReturnType<UI["builder"]["palette"]>[number]["components"];
    }
  >();
  for (const source of ui.builder.palette())
    for (const component of source.components) {
      if (ui.palette?.hidden?.includes(component.type)) continue;
      const model = ui.engine.getField(component.type)!;
      const name =
        model.dataScope === "object" && source.name === "Layouts"
          ? "data"
          : source.name === "Fields"
            ? "basic"
            : source.name === "Layouts"
              ? "layout"
              : source.name.toLowerCase();
      if (
        ui.palette?.groups &&
        !ui.palette.groups.some((group) =>
          [name, source.name.toLowerCase()].includes(group.toLowerCase()),
        )
      )
        continue;
      let group = groups.get(name);
      if (!group) {
        const key = `ofb.${name}`,
          translated = ui.t(key);
        group = {
          name,
          label: translated === key ? ui.t(source.name) : translated,
          components: [],
        };
        groups.set(name, group);
      }
      group.components.push(component);
    }
  const frequency = [
    "text",
    "email",
    "number",
    "select",
    "checkbox",
    "radio",
    "date",
    "textarea",
  ];
  for (const group of groups.values())
    if (group.name === "basic")
      group.components.sort(
        (a, b) =>
          (frequency.includes(a.type)
            ? frequency.indexOf(a.type)
            : frequency.length) -
          (frequency.includes(b.type)
            ? frequency.indexOf(b.type)
            : frequency.length),
      );
  const defaults: Record<string, number> = {
    basic: 0,
    layout: 1,
    data: 2,
    advanced: 3,
  };
  return [...groups.values()].sort(
    (a, b) =>
      (ui.palette?.order?.[a.name] ?? defaults[a.name] ?? 4) -
      (ui.palette?.order?.[b.name] ?? defaults[b.name] ?? 4),
  );
}
