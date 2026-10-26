import { Component, signal } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import {
  OurFormBuilderComponent,
  provideOurForm,
} from "@ourform/angular";
import type { BuilderController } from "@ourform/builder";
import { bootstrap5Theme } from "@ourform/themes/bootstrap5";
import { bootstrap5BuilderTheme } from "@ourform/builder/themes/bootstrap5";

const query = new URLSearchParams(location.search);
const schema = {
  $formVersion: "1.0",
  id: "angular-cli-builder",
  display: "form",
  components: [
    { id: "name", type: "text", key: "name", label: "Full name" },
  ],
};

@Component({
  selector: "app-root",
  standalone: true,
  imports: [OurFormBuilderComponent],
  template: `<main>
    <h1>Angular CLI builder</h1>
    <our-form-builder
      [schema]="schema()"
      [preload]="preload"
      [settingsPreload]="settingsPreload"
      styleNonce="ourform-angular-cli"
      (schemaChange)="schema.set($event)"
      (ready)="ready($event)"
    />
  </main>`,
})
class App {
  readonly schema = signal<unknown>(schema);
  readonly preload = query.get("preload") === "idle" ? "idle" : "none";
  readonly settingsPreload =
    query.get("settingsPreload") === "none" ? "none" : "idle";
  ready(controller: BuilderController) {
    Object.assign(window, { angularCliBuilder: controller });
  }
}

void bootstrapApplication(App, {
  providers: [
    provideOurForm({
      theme: "bootstrap5",
      themes: [bootstrap5Theme],
      builderThemes: [bootstrap5BuilderTheme],
    }),
  ],
});
