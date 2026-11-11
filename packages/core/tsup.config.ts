import { defineConfig } from "tsup";
export default defineConfig({
  entry: { index: "src/index.ts", "logic/index": "src/logic/index.ts" },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
});
