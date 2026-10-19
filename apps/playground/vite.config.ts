import { defineConfig } from "vite";
export default defineConfig({
  build: {
    rollupOptions: {
      input: [
        "index.html",
        "builder.html",
        "sdk-probe.html",
        "theme-probe.html",
      ],
    },
  },
});
