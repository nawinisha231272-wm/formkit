# @ourform/angular

Standalone Angular 22/21 adapter, built with ng-packagr in partial compilation mode. The host application's
Angular linker handles production AOT. Angular, RxJS and forms are peers; tslib is the compiler helper runtime.
The examples deliberately load Angular's JIT compiler for their plain Vite bootstrap; the library does not.

```ts
bootstrapApplication(App, {
  providers: [
    provideZonelessChangeDetection(),
    provideOurForm({ engine }),
    provideFormField("employee", EmployeeLookupComponent),
  ],
});
```

```html
<our-form
  [schema]="schema"
  [data]="data"
  [theme]="'bootstrap5'"
  (dataChange)="data = $event"
  (changed)="onChange($event)"
  (submitted)="save($event)"
/>
```

Import OurFormComponent into the host standalone component. Inputs include schema/data/defaultData/theme/
themeMode/readOnly/engine/fields. Outputs: ready (FormController), dataChange (data), changed (StatePatch),
submitted (SubmitResult). submit/validate/reset/focusField delegate to the controller. Its readiness is backed
by a signal; the wrapper uses OnPush and works without zone.js.

Conventional native inputs: value, disabled, readOnly, id, name, labelledBy, describedBy, invalid, required,
className; output valueChange and optional blur. Input aliases/signal inputs are handled by setInput and
outputs by metadata. Map custom names through provideFormField options. TypeScript rejects object-valued
components without an adapter; erased runtime shapes are guarded when values cross the bridge.
CVA controls receive writeValue only when the value changes, registerOnChange/registerOnTouched and
setDisabledState. Declare a readOnly input to keep read-only controls focusable; otherwise a CVA uses its
disabled API for read-only mode. Controls remain responsible for implementing their disabled/ARIA behavior.

createComponent receives both the host EnvironmentInjector and element injector, so component-local DI
works. Outputs, CVA callbacks and attached views are released on teardown. Controlled data is diffed by
compiled leaf paths; echoed values do not reset validation/touched state. Theme/data retain controls.
Use fields/provider registrations owned by this application; there is no mutable global registry.
