import {
  renderForm,
  registerElementField,
  defineOurFormElement,
} from "@ourform/element";
import schema from "../../../fixtures/forms/native/host-feedback.json";
import { employees, employeeValue } from "./data";
import type { Employee } from "./data";
class EmployeeLookup extends HTMLElement {
  #value: string | Employee | null = "";
  #disabled = false;
  #readOnly = false;
  #labelledBy = "";
  #describedBy = "";
  #invalid = false;
  #required = false;
  #className = "";
  #input: HTMLInputElement | undefined;
  #buttons: { employee: Employee; button: HTMLButtonElement }[] = [];
  get value() {
    return this.#value;
  }
  set value(next: string | Employee | null) {
    this.#value = next;
    this.syncValue();
    this.refresh();
  }
  get disabled() {
    return this.#disabled;
  }
  set disabled(next: boolean) {
    this.#disabled = next;
    this.refresh();
  }
  get readOnly() {
    return this.#readOnly;
  }
  set readOnly(next: boolean) {
    this.#readOnly = next;
    this.refresh();
  }
  set labelledBy(value: string) {
    this.#labelledBy = value;
    this.refresh();
  }
  set describedBy(value: string) {
    this.#describedBy = value ?? "";
    this.refresh();
  }
  set invalid(value: boolean) {
    this.#invalid = value;
    this.refresh();
  }
  set required(value: boolean) {
    this.#required = value;
    this.refresh();
  }
  override set className(value: string) {
    this.#className = value;
    this.refresh();
  }
  override get className() {
    return this.#className;
  }
  connectedCallback() {
    if (this.#input) return;
    this.setAttribute("role", "group");
    const input = this.ownerDocument.createElement("input");
    input.type = "search";
    this.#input = input;
    input.addEventListener("input", () => {
      for (const { employee, button } of this.#buttons)
        button.hidden = !employee.name
          .toLowerCase()
          .includes(input.value.toLowerCase());
    });
    this.append(input);
    for (const employee of employees) {
      const button = this.ownerDocument.createElement("button");
      button.type = "button";
      button.textContent = `Choose ${employee.name}`;
      button.addEventListener("click", () => {
        if (this.#disabled || this.#readOnly) return;
        this.dispatchEvent(
          new CustomEvent("value-change", {
            detail:
              this.localName === "employee-object" ? employee : employee.id,
            bubbles: true,
          }),
        );
      });
      this.#buttons.push({ employee, button });
      this.append(button);
    }
    this.syncValue();
    this.refresh();
  }
  syncValue() {
    const id = typeof this.#value === "string" ? this.#value : this.#value?.id;
    const text = employees.find((employee) => employee.id === id)?.name ?? "";
    if (this.#input && this.#input.value !== text) this.#input.value = text;
  }
  refresh() {
    const input = this.#input;
    if (!input) return;
    input.disabled = this.#disabled;
    input.readOnly = this.#readOnly;
    input.className = this.#className;
    input.setAttribute("aria-labelledby", this.#labelledBy);
    input.setAttribute("aria-describedby", this.#describedBy);
    input.setAttribute("aria-invalid", String(this.#invalid));
    input.setAttribute("aria-required", String(this.#required));
    for (const { button } of this.#buttons)
      button.disabled = this.#disabled || this.#readOnly;
  }
  override focus(options?: FocusOptions) {
    this.#input?.focus(options);
  }
}
customElements.define("employee-lookup", EmployeeLookup);
customElements.define("employee-object", class extends EmployeeLookup {});
const fields = [
  registerElementField("employee", "employee-lookup"),
  registerElementField("employeeObject", "employee-object", {
    value: employeeValue,
  }),
];
const output = document.querySelector("#result")!;
const form = renderForm("#form", {
  schema,
  fields,
  readOnly: new URLSearchParams(location.search).has("readonly"),
  onSubmit: (result) => (output.textContent = JSON.stringify(result)),
});
document.querySelector("#submit")!.addEventListener("click", () => {
  void form.submit();
});
defineOurFormElement();
window.hostDemo = { form, unmount: () => form.destroy() };

window.defineExampleTag = defineOurFormElement;
