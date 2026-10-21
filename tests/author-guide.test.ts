import { test, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { field } from "../apps/docs/examples/quantity";
import {
  resolveConfig,
  renderVNodeToString,
  defaultMessage,
} from "@ourform/sdk";
import type { FieldControlProps } from "@ourform/sdk";
test("guide numeric example is complete, typed and resolves English or supplied translations", async () => {
  const source = await readFile("apps/docs/examples/quantity.ts", "utf8");
  const inline = await readFile("apps/docs/examples/yes-no.ts", "utf8");
  const guide = await readFile("apps/docs/component-author-guide.md", "utf8");
  expect(guide).toContain(source.trim());
  expect(guide).toContain(inline.trim());
  const config = resolveConfig(field.properties);
  expect(config.ok).toBe(true);
  if (!config.ok) return;
  const props: FieldControlProps<number | null, typeof config.config> = {
    value: null,
    config: config.config,
    setValue: () => {},
    onBlur: () => {},
    focusRef: () => {},
    state: {
      disabled: false,
      readOnly: false,
      invalid: false,
      pending: false,
      required: false,
    },
    a11y: { id: "subject", name: "value", labelledBy: "label" },
    theme: { classFor: () => "" },
    t: defaultMessage,
  };
  expect(renderVNodeToString(field.views.portable(props))).toContain("Not set");
  expect(
    renderVNodeToString(
      field.views.portable({
        ...props,
        t: (key) =>
          key === "acme.quantity.unset"
            ? "Unset translation"
            : defaultMessage(key),
      }),
    ),
  ).toContain("Unset translation");
});
