import { defineConfig } from "vite";
export default defineConfig({
  build: {
    target: "es2022",
    rollupOptions: {
      input: [
        "index.html",
        "tier1.html",
        "builder.html",
        "sdk-probe.html",
        "theme-probe.html",
      ],
    },
  },
});
