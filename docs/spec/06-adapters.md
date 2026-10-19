# 06 — Framework adapters

Status: normative. Packages: `@ourform/element`, `@ourform/react`, `@ourform/angular`.
Adapters contain no form logic. They create/receive an engine and session, call `mount`, and bridge native components.

## Vanilla

```ts
import { renderForm } from '@ourform/element';   // convenience over createEngine + compile + mount
const form = renderForm('#container', { schema, data, theme: 'bootstrap5', plugins: [...] });
form.session.subscribe(p => console.log(p.data));
```

## Web Component — `<our-form>`

- Properties: `schema`, `data`, `theme`, `engine` (optional), `readOnly`.
- Events: `of-change` (`detail: { data, changedPaths }`), `of-submit` (`detail: SubmitResult`), `of-ready`.
- Methods: `submit()`, `validate()`, `reset()`, `focusField(id)`.
- Light DOM by default; `shadow` attribute opts into Shadow DOM.
- Registered under a configurable tag (`defineOurFormElement('acme-form')`) to avoid conflicts.

## React — `@ourform/react`

```tsx
<Form schema={schema} defaultData={d} theme="tailwind" onChange={e => ...} onSubmit={r => ...} />
<Form schema={schema} data={data} onChange={e => setData(e.data)} />     // controlled
const { session, submit } = useForm(ref); const field = useField('customer.name');
registerReactField('acme.employeeLookup', EmployeeLookup, opts?);
```

- Mounts renderer-dom into a ref'd element. Native React fields render into the field's control
  slot through portals so the host app's React context (theme providers, i18n, query clients) works.
- Engine can be supplied by `<OurFormProvider engine={...}>`.
- React 19 is the primary target; React 18 supported if cost is low (decide in M4).

## Angular — `@ourform/angular`

```html
<our-form
  [schema]="schema"
  [data]="data"
  [theme]="'bootstrap5'"
  (dataChange)="data = $event"
  (submitted)="save($event)"
></our-form>
```

```ts
bootstrapApplication(App, { providers: [provideOurForm({ plugins: [...] }),
  provideFormField('acme.employeeLookup', EmployeeLookupComponent)] });
```

- Standalone component; works without zone.js (signals + `ChangeDetectionStrategy.OnPush`).
- Native Angular fields are created with `createComponent` into the control slot, using the host
  `EnvironmentInjector` so DI works. Inputs: `value`, `disabled`, `readOnly`, `id`; output `valueChange`.
  Components implementing ControlValueAccessor are also accepted.
- Built with ng-packagr; support the current Angular major and the previous one.

## Modes

- Uncontrolled: session owns data (`defaultData`). Recommended for large forms.
- Controlled: host passes `data` and handles change events; the adapter diffs incoming data and
  calls `session.reset`/`setValue` only for changed paths.
- Change events always carry `{ data, changedPaths }`.

## Cross-host conformance

`@ourform/testing` runs the same fixtures in vanilla, React and Angular example apps and asserts
identical submitted data, identical error sets and equivalent accessibility trees.

## M04 implementation contracts (ADR-0006)

Registration calls return descriptors installed in a host-owned `fields` array or Angular multi-provider;
there is no default global registry. Each adapter supplies the four portable built-ins. Use an existing
model when adding a native view to a portable type; duplicates for the same type/adapter and incompatible
models throw. Explicit registration metadata is not a plugin system; `plugins` is deferred to its milestone.

`@ourform/element` renderForm returns FormController with engine/session/view, submit/validate/reset/
focusField/setData/destroy. Custom elements additionally accept fields; ready includes the session.
The `shadow` attribute is read at connection. Disconnect disposes; reconnect preserves data. New custom
roots must forward required/ARIA to their internal supported control; required is a property rather than
an unsupported aria-required attribute on an unknown custom-root role.

React Form adds fields/themeMode/onReady, a FormController ref and optional children inside its form
context. useForm()/useField() are nullable before readiness; useForm(ref) reads the imperative current
handle and does not subscribe to ref-object mutations. Native portals retain the host React context.
React 19 is tested; React 18 is not a supported claim in M04. Fields/schema/engine should have stable identities.

Angular OurFormComponent adds defaultData/themeMode/engine/fields and ready/changed outputs. `dataChange`
retains the template-friendly data-only contract; `changed` carries `{data,changedPaths}` as StatePatch.
Its controller readiness is backed by a signal, with OnPush and zoneless bootstrap. Native setInput supports
input aliases and signal metadata; the examples exercise conventional inputs and an object CVA. CVA writes
are limited to changed values, preserving editing during blur/state/theme updates. A CVA with no readOnly
input uses its disabled API for read-only mode. The host's element injector is passed alongside its
EnvironmentInjector, preserving component-local services. All attached views/output subscriptions/CVA
callbacks are released on teardown. ng-packagr builds Angular 22 partial compilation; Angular 21 has a
separate runtime example and TypeScript 5.9 compatibility check.

Controlled inputs are full data snapshots; only changed compiled leaves are written, with echo no-ops.
Schema/engine/fields/readOnly changes deliberately rebuild with current data retained. Theme/data changes
retain controls. Native fields are client-rendered in M04; no native SSR/hydration support is promised.
The same fixture lives in fixtures/forms/native/host-feedback.json (native registrations are required),
and checkHostConformance compares full submitted results/error sets plus normalized accessible leaf controls.

## M06 Tier 1 host behavior

All three adapters use the same builtinFields list. Value, readOnly/disabled, async pending/errors,
localization and portable submit/reset/custom actions are checked by a shared Tier 1 conformance suite.
Providers/validators/functions live on the engine. Custom actions use HostOptions.onAction and composed
bubbling of-action events; React forwards the latest callback, Angular can configure it through
provideOurForm, and events cross the element wrapper's Shadow DOM boundary.
