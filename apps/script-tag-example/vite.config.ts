import { defineConfig } from "vite";

export default defineConfig({
  preview: {
    headers: {
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; style-src 'self' 'nonce-ourform-script-tag'; img-src 'self' data:; connect-src 'self'; font-src 'self'",
    },
  },
});
