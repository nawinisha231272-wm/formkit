import { test, expect } from "vitest";
import { defineBuilderTheme } from "@ourform/sdk";
import type { BuilderTheme } from "@ourform/sdk";

test("builder themes snapshot tokens, dark mode and primitive recipes without DOM dependencies", () => {
  const input: BuilderTheme = {
    name: "acme",
    extends: "neutral",
    tokens: { "--ofb-accent": "#0f766e" },
    modes: { dark: { "--ofb-accent": "#99f6e4" } },
    recipes: { Button: { "--ofb-radius": "20px" } },
  };
  const theme = defineBuilderTheme(input);
  expect(theme).toEqual(input);
  expect(theme.tokens).not.toBe(input.tokens);
  expect(Object.isFrozen(theme)).toBe(true);
  expect(Object.isFrozen(theme.modes?.dark)).toBe(true);
  expect(Object.isFrozen(theme.recipes?.Button)).toBe(true);
  expect(defineBuilderTheme({ name: "empty", tokens: {} }).recipes).toEqual({});
});
test("builder theme descriptors reject CSS escapes, network values, unsafe names and unknown recipes", () => {
  for (const spec of [
    { name: 'bad"', tokens: {} },
    { name: "a", extends: "<bad>", tokens: {} },
    { name: "a", tokens: { color: "red" } },
    { name: "a", tokens: { "--ofb-accent": "red;}body{" } },
    { name: "a", tokens: { "--ofb-background": "url(https://example.test)" } },
    { name: "a", tokens: { "--ofb-accent": 1 } },
    { name: "a", tokens: [], recipes: {} },
    { name: "a", tokens: {}, recipes: { Script: {} } },
    { name: "a", tokens: {}, modes: { unknown: {} } },
    JSON.parse('{"name":"a","tokens":{},"recipes":{"__proto__":{}}}'),
  ])
    expect(() => defineBuilderTheme(spec as BuilderTheme)).toThrow();
});
