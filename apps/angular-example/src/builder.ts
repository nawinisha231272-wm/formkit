import "@angular/compiler";
import {
  Component,
  ApplicationRef,
  EventEmitter,
  InjectionToken,
  inject,
  signal,
  provideZonelessChangeDetection,
} from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import {
  OurFormBuilderComponent,
  provideFormField,
  provideOurForm,
} from "@ourform/angular";
import type { BuilderController, SchemaChange } from "@ourform/angular";
import { stringProperty } from "@ourform/sdk";
import { recordBuilderEvents } from "../../shared/builder-types";
import schema from "../../../fixtures/forms/nested-tabs/customer.json";
import data from "../../../fixtures/forms/nested-tabs/customer.data.json";
const Context = new InjectionToken<string>("builder-local-context");
class NativeText {
  value = "";
  hint = "Native answer";
  id = "";
  className = "";
  disabled = false;
  readOnly = false;
  labelledBy = "";
  describedBy: string | undefined;
  invalid = "false";
  required = "false";
  busy = "false";
  valueChange = new EventEmitter<string>();
  blur = new EventEmitter<void>();
  readonly context = inject(Context);
  update(event: Event) {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }
}
Component({
  selector: "native-builder-text",
  standalone: true,
  template: `<span hidden data-builder-context>{{ context }}</span
    ><input
      type="text"
      data-builder-native
      [id]="id"
      [class]="className"
      [value]="value"
      [placeholder]="hint"
      [disabled]="disabled"
      [readOnly]="readOnly"
      [attr.aria-labelledby]="labelledBy"
      [attr.aria-describedby]="describedBy"
      [attr.aria-invalid]="invalid"
      [attr.aria-required]="required"
      [attr.aria-busy]="busy"
      (input)="update($event)"
      (blur)="blur.emit()"
    />`,
  inputs: [
    "value",
    "hint",
    "id",
    "className",
    "disabled",
    "readOnly",
    "labelledBy: aria-labelledby",
    "describedBy: aria-describedby",
    "invalid: aria-invalid",
    "required: aria-required",
    "busy: aria-busy",
  ],
  outputs: ["valueChange", "blur"],
})(NativeText);
recordBuilderEvents();
class App {
  readonly schema = signal<unknown>(schema);
  readonly theme = signal("base");
  readonly mounted = signal(true);
  readonly application = inject(ApplicationRef);
  constructor() {
    window.builderAttach = () => this.mounted.set(true);
    window.builderDetach = () => this.mounted.set(false);
    window.builderTheme = async (theme) => {
      // A visible child may precede completion of the initial Angular render.
      await this.application.whenStable();
      this.theme.set(theme);
      await this.application.whenStable();
    };
  }
  changed(change: SchemaChange) {
    window.builderChanges.push(change);
  }
  ready(controller: BuilderController) {
    window.builderHost = controller;
  }
}
Component({
  selector: "app-root",
  standalone: true,
  imports: [OurFormBuilderComponent],
  providers: [
    { provide: Context, useValue: "angular-builder-context" },
    provideFormField("acme.native", NativeText, {
      title: "Native text",
      properties: {
        hint: stringProperty({ label: "Hint", default: "Native answer" }),
      },
    }),
  ],
  template: `<main>
    <h1>Angular form builder</h1>
    @if (mounted()) {
      <our-form-builder
        [schema]="schema()"
        [theme]="theme()"
        (schemaChange)="schema.set($event)"
        (changed)="changed($event)"
        (ready)="ready($event)"
      />
    }
  </main>`,
})(App);
void bootstrapApplication(App, {
  providers: [provideZonelessChangeDetection(), provideOurForm({ data })],
});
