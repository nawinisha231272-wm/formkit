import {
  StrictMode,
  createContext,
  createElement as h,
  useContext,
  useState,
} from "react";
import type { ChangeEvent } from "react";
import { createRoot } from "react-dom/client";
import { FormBuilder, registerReactField, useForm } from "@ourform/react";
import { stringProperty } from "@ourform/sdk";
import { baseTheme } from "@ourform/themes/base";
import { bootstrap4Theme } from "@ourform/themes/bootstrap4";
import { bootstrap5Theme } from "@ourform/themes/bootstrap5";
import { tailwindTheme } from "@ourform/themes/tailwind";
import { materialTheme } from "@ourform/themes/material";
import { bootstrap4BuilderTheme } from "@ourform/builder/themes/bootstrap4";
import { bootstrap5BuilderTheme } from "@ourform/builder/themes/bootstrap5";
import { tailwindBuilderTheme } from "@ourform/builder/themes/tailwind";
import { materialBuilderTheme } from "@ourform/builder/themes/material";
import type { FocusTarget } from "@ourform/sdk";
import { recordBuilderEvents } from "../../shared/builder-types";
import schema from "../../../fixtures/forms/nested-tabs/customer.json";
import data from "../../../fixtures/forms/nested-tabs/customer.data.json";
const Context = createContext("missing-context");
interface Props {
  value: string;
  hint: string;
  id: string;
  className: string;
  disabled: boolean;
  readOnly: boolean;
  "aria-labelledby": string;
  "aria-describedby"?: string;
  "aria-invalid": string;
  "aria-required": string;
  "aria-busy": string;
  focusRef(target: FocusTarget | null): void;
  onValueChange(value: string): void;
  onBlur(): void;
}
function NativeText(p: Props) {
  const context = useContext(Context),
    form = useForm();
  const nativeEntry = form?.session.form.nodes.find(
    (entry) => entry.node.type === "acme.native",
  );
  return h(
    "div",
    { style: { flex: 1, minWidth: 0 } },
    h("span", { hidden: true, "data-builder-context": "" }, context),
    h(
      "span",
      { hidden: true, "data-builder-session": "" },
      form?.session.form.definition.id ?? "missing",
    ),
    h(
      "span",
      { hidden: true, "data-builder-session-native": "" },
      nativeEntry?.node.id ?? "missing",
    ),
    new URLSearchParams(location.search).has("context-trial")
      ? h(
          "button",
          {
            type: "button",
            "data-write-via-hook": "",
            onClick: () => {
              if (nativeEntry)
                form!.session.setValue(
                  nativeEntry.path,
                  "Written through draft hook",
                  { source: "api" },
                );
            },
          },
          "Write through form hook",
        )
      : null,
    h("input", {
      type: "text",
      "data-builder-native": "",
      id: p.id,
      className: p.className,
      value: p.value,
      placeholder: p.hint,
      disabled: p.disabled,
      readOnly: p.readOnly,
      "aria-labelledby": p["aria-labelledby"],
      "aria-describedby": p["aria-describedby"],
      "aria-invalid": p["aria-invalid"],
      "aria-required": p["aria-required"],
      "aria-busy": p["aria-busy"],
      ref: p.focusRef,
      onBlur: p.onBlur,
      onChange: (event: ChangeEvent<HTMLInputElement>) =>
        p.onValueChange(event.currentTarget.value),
    }),
  );
}
const field = registerReactField("acme.native", NativeText, {
  title: "Native text",
  properties: {
    hint: stringProperty({ label: "Hint", default: "Native answer" }),
  },
});
const fields = [field];
recordBuilderEvents();
const query = new URLSearchParams(location.search);
const loading = {
  preload: query.get("preload") === "idle" ? "idle" as const : "none" as const,
  settingsPreload: query.get("settingsPreload") === "none" ? "none" as const : "idle" as const,
  ...(query.has("assetBase") ? { assetBase: query.get("assetBase")! } : {}),
  ...(query.has("styleNonce") ? { styleNonce: query.get("styleNonce")! } : {}),
};
function App() {
  const [definition, setDefinition] = useState<unknown>(schema),
    [mounted, setMounted] = useState(true),
    [theme, setTheme] = useState("base");
  window.builderAttach = () => setMounted(true);
  window.builderDetach = () => setMounted(false);
  window.builderTheme = setTheme;
  return h(
    "main",
    null,
    h("h1", null, "React form builder"),
    h(
      Context.Provider,
      { value: "react-builder-context" },
      mounted
        ? h(FormBuilder, {
            ...loading,
            schema: definition,
            data,
            fields,
            themes: [baseTheme, bootstrap4Theme, bootstrap5Theme, tailwindTheme, materialTheme],
            builderThemes: [bootstrap4BuilderTheme, bootstrap5BuilderTheme, tailwindBuilderTheme, materialBuilderTheme],
            theme,
            onReady: (controller) => {
              window.builderHost = controller;
            },
            onSchemaChange: (change) => {
              window.builderChanges.push(change);
              setDefinition(change.definition);
            },
          })
        : null,
    ),
  );
}
createRoot(document.getElementById("app")!).render(h(StrictMode, null, h(App)));
