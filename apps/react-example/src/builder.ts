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
  return h(
    "div",
    { style: { flex: 1, minWidth: 0 } },
    h("span", { hidden: true, "data-builder-context": "" }, context),
    h(
      "span",
      { hidden: true, "data-builder-session": "" },
      form?.session.form.definition.id ?? "missing",
    ),
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
            schema: definition,
            data,
            fields,
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
