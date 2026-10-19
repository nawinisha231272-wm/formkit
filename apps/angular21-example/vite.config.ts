import { defineConfig } from "vite";
export default defineConfig({
  build: { target: "es2022" },
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
