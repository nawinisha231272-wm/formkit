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
