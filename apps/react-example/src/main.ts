import protectedSchema from "../../../fixtures/forms/native/protected-writes.json";
import {
  StrictMode,
  createContext,
  createElement as el,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import {
  Form,
  OurFormProvider,
  registerReactField,
  useField,
  useForm,
} from "@ourform/react";
import type { FormController } from "@ourform/renderer-dom";
import nativeSchema from "../../../fixtures/forms/native/host-feedback.json";
import onboardingSchema from "../../../fixtures/forms/onboarding/customer.json";
import onboardingData from "../../../fixtures/forms/onboarding/customer.data.json";
import { baseTheme } from "@ourform/themes/base";
const query = new URLSearchParams(location.search);
const schema = query.has("protected")
  ? protectedSchema
  : query.has("onboarding")
    ? onboardingSchema
    : nativeSchema;
const initialData = query.has("protected")
  ? {
      name: "stored",
      locked: false,
      staticReadOnly: "stored",
      staticDisabled: "stored",
    }
  : query.has("readonly") && query.has("onboarding")
    ? onboardingData
    : query.has("onboarding")
      ? { preferences: { reference: "web-onboarding" } }
      : {};
import { employees, employeeValue } from "../../vanilla-example/src/data";
import type { Employee } from "../../vanilla-example/src/data";
const HostContext = createContext("missing-context");
interface LookupProps<V> {
  value: V;
  onValueChange(value: V): void;
  onBlur(): void;
  disabled: boolean;
  readOnly: boolean;
  id: string;
  "aria-labelledby": string;
  "aria-describedby"?: string;
  "aria-invalid": string;
  "aria-required": string;
  className: string;
  focusRef(target: HTMLInputElement | null): void;
}
function Lookup<V extends string | Employee | null>(
  p: LookupProps<V> & { object?: boolean },
) {
  const context = useContext(HostContext);
  const selected = typeof p.value === "string" ? p.value : p.value?.id;
  const [query, setQuery] = useState(
    employees.find((employee) => employee.id === selected)?.name ?? "",
  );
  useEffect(
    () =>
      setQuery(
        employees.find((employee) => employee.id === selected)?.name ?? "",
      ),
    [selected],
  );
  return el(
    "div",
    null,
    el("span", { "data-host-context": "" }, context),
    el("input", {
      type: "search",
      id: p.id,
      value: query,
      disabled: p.disabled,
      readOnly: p.readOnly,
      className: p.className,
      "aria-labelledby": p["aria-labelledby"],
      "aria-describedby": p["aria-describedby"],
      "aria-invalid": p["aria-invalid"],
      "aria-required": p["aria-required"],
      ref: p.focusRef,
      onBlur: p.onBlur,
      onChange: (event) => setQuery(event.currentTarget.value),
    }),
    employees
      .filter((employee) =>
        employee.name.toLowerCase().includes(query.toLowerCase()),
      )
      .map((employee) =>
        el(
          "button",
          {
            type: "button",
            key: employee.id,
            disabled: p.disabled || p.readOnly,
            onClick: () => {
              if (!p.disabled && !p.readOnly)
                p.onValueChange((p.object ? employee : employee.id) as V);
            },
          },
          `Choose ${employee.name}`,
        ),
      ),
  );
}
function EmployeeLookup(props: LookupProps<string>) {
  return el(Lookup<string>, props);
}
function EmployeeObject(props: LookupProps<Employee | null>) {
  return el(Lookup<Employee | null>, { ...props, object: true });
}
const fields = [
  registerReactField("employee", EmployeeLookup),
  registerReactField("employeeObject", EmployeeObject, {
    value: employeeValue,
  }),
];
function Inspector() {
  const field = useField("employee");
  const form = useForm();
  return el(
    "output",
    { id: "inspection" },
    JSON.stringify({ value: field?.value, ready: !!form }),
  );
}
function App() {
  const ref = useRef<FormController>(null);
  const [data, setData] = useState<unknown>(initialData);
  const [result, setResult] = useState<unknown>();
  return el(
    HostContext.Provider,
    { value: "React host context" },
    el(
      OurFormProvider,
      { fields },
      el(
        Form,
        {
          ref,
          schema,
          themes: [baseTheme],
          theme: baseTheme,
          data: query.has("uncontrolled") ? undefined : data,
          defaultData: initialData,
          readOnly: new URLSearchParams(location.search).has("readonly"),
          onChange: (patch) => setData(patch.data),
          onSubmit: setResult,
          onReady: (form) => {
            window.hostDemo = { form, unmount: () => root.unmount() };
          },
        },
        el(Inspector),
      ),
    ),
    el(
      "button",
      {
        id: "submit",
        onClick: () => {
          void ref.current?.submit();
        },
      },
      "Submit",
    ),
    el("pre", { id: "result" }, JSON.stringify(result)),
  );
}
const root = createRoot(document.querySelector("#app")!);
root.render(el(StrictMode, null, el(App)));
