import { defineConfig } from "vite";
import { createEngine } from "@ourform/core";
import { builtinComponents } from "@ourform/components";
import { renderToString } from "@ourform/renderer-dom";
import schema from "../../fixtures/forms/onboarding/customer.json";
export default defineConfig({
  plugins: [
    {
      name: "ourform-static-onboarding",
      transformIndexHtml(html, context) {
        if (!context.path.endsWith("onboarding.html")) return html;
        const engine = createEngine();
        for (const field of builtinComponents) engine.register(field.model);
        const compiled = engine.compile(schema);
        if (!compiled.ok) throw new Error("Invalid onboarding fixture");
        const session = engine.createSession(compiled.form);
        try {
          return html.replace(
            "<!--ourform-ssr-->",
            renderToString(session, {
              views: new Map(
                builtinComponents.map((field) => [
                  field.model.type,
                  field.views,
                ]),
              ),
            }),
          );
        } finally {
          session.dispose();
        }
      },
    },
  ],
  build: {
    target: "es2022",
    rollupOptions: {
      input: [
        "index.html",
        "tier1.html",
        "onboarding.html",
        "builder.html",
        "sdk-probe.html",
        "theme-probe.html",
      ],
    },
  },
});
