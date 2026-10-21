import { defineConfig } from "vite";
export default defineConfig({
  build: {
    target: "es2022",
    rollupOptions: { input: ["index.html", "builder.html"] },
  },
  resolve: {
    dedupe: [
      "@angular/core",
      "@angular/common",
      "@angular/compiler",
      "@angular/forms",
      "@angular/platform-browser",
      "rxjs",
    ],
  },
});
