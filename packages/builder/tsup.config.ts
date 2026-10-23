import { defineConfig } from "tsup";

export default defineConfig({
  minify: "terser",
  terserOptions: { module: true, compress: { passes: 3 }, mangle: true },
});
