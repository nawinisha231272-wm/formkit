import "@angular/compiler";
import {
  Component,
  EventEmitter,
  InjectionToken,
  inject,
  provideZonelessChangeDetection,
  VERSION,
} from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import type { ControlValueAccessor } from "@angular/forms";
import {
  OurFormComponent,
  provideOurForm,
  provideFormField,
} from "@ourform/angular";
import type { FormController } from "@ourform/renderer-dom";
import schema from "../../../fixtures/forms/native/host-feedback.json";
import { employees, employeeValue } from "../../vanilla-example/src/data";
import type { Employee } from "../../vanilla-example/src/data";
const HOST_CONTEXT = new InjectionToken<string>("Example host context");
const inputs = [
  "value",
  "disabled",
  "readOnly",
  "id",
  "labelledBy",
  "describedBy",
  "invalid",
  "required",
  "className",
];
const template = `<span data-host-context>{{context}}</span><input type="search" [id]="id" [class]="className" [value]="query" [disabled]="disabled" [readOnly]="readOnly" [attr.aria-labelledby]="labelledBy" [attr.aria-describedby]="describedBy" [attr.aria-invalid]="invalid" [attr.aria-required]="required" (input)="search($any($event.target).value)" (blur)="touch()" />@for(employee of matches(); track employee.id) {<button type="button" [disabled]="disabled || readOnly" (click)="choose(employee)">Choose {{employee.name}}</button>}`;
class EmployeeLookup {
  readonly context = inject(HOST_CONTEXT);
  #value = "";
  query = "";
  disabled = false;
  readOnly = false;
  id = "";
  labelledBy = "";
  describedBy = "";
  invalid = false;
  required = false;
  className = "";
  readonly valueChange = new EventEmitter<string>();
  readonly blur = new EventEmitter<void>();
  get value() {
    return this.#value;
  }
  set value(next: string) {
    this.#value = next;
    this.query = employees.find((employee) => employee.id === next)?.name ?? "";
  }
  search(query: string) {
    if (!this.disabled && !this.readOnly) this.query = query;
  }
  matches() {
    return employees.filter((employee) =>
      employee.name.toLowerCase().includes(this.query.toLowerCase()),
    );
  }
  choose(employee: Employee) {
    if (!this.disabled && !this.readOnly) this.valueChange.emit(employee.id);
  }
  touch() {
    this.blur.emit();
  }
}
Component({
  selector: "employee-lookup",
  standalone: true,
  inputs,
  outputs: ["valueChange", "blur"],
  template,
})(EmployeeLookup);
class EmployeeObject implements ControlValueAccessor {
  readonly context = inject(HOST_CONTEXT);
  value: Employee | null = null;
  query = "";
  disabled = false;
  readOnly = false;
  id = "";
  labelledBy = "";
  describedBy = "";
  invalid = false;
  required = false;
  className = "";
  #change: (value: Employee | null) => void = () => {};
  #touch = () => {};
  writeValue(value: Employee | null) {
    this.value = value;
    this.query = value?.name ?? "";
  }
  registerOnChange(change: (value: Employee | null) => void) {
    this.#change = change;
  }
  registerOnTouched(touch: () => void) {
    this.#touch = touch;
  }
  setDisabledState(disabled: boolean) {
    this.disabled = disabled;
  }
  search(query: string) {
    if (!this.disabled && !this.readOnly) this.query = query;
  }
  matches() {
    return employees.filter((employee) =>
      employee.name.toLowerCase().includes(this.query.toLowerCase()),
    );
  }
  choose(employee: Employee) {
    if (!this.disabled && !this.readOnly) this.#change(employee);
  }
  touch() {
    this.#touch();
  }
}
Component({ selector: "employee-object", standalone: true, inputs, template })(
  EmployeeObject,
);
class App {
  schema = schema;
  data: unknown = {};
  result = "";
  readOnly = new URLSearchParams(location.search).has("readonly");
  form: FormController | undefined;
  ready(form: FormController) {
    this.form = form;
    window.hostDemo = {
      form,
      frameworkVersion: VERSION.full,
      unmount: () => application.destroy(),
    };
  }
  submit() {
    void this.form?.submit();
  }
  submitted(result: unknown) {
    this.result = JSON.stringify(result);
  }
}
Component({
  selector: "host-app",
  standalone: true,
  imports: [OurFormComponent],
  providers: [{ provide: HOST_CONTEXT, useValue: "Angular host context" }],
  template:
    '<our-form [schema]="schema" [data]="data" [readOnly]="readOnly" (dataChange)="data=$event" (ready)="ready($event)" (submitted)="submitted($event)" /><button id="submit" (click)="submit()">Submit</button><pre id="result">{{result}}</pre>',
})(App);
const host = document.createElement("host-app");
document.querySelector("#app")!.replaceChildren(host);
const application = await bootstrapApplication(App, {
  providers: [
    provideZonelessChangeDetection(),
    provideOurForm(),
    provideFormField("employee", EmployeeLookup),
    provideFormField("employeeObject", EmployeeObject, {
      value: employeeValue,
    }),
  ],
});
