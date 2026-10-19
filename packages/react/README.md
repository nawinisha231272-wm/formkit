# @ourform/react

React 19 is supported. React and react-dom are peers, never bundled.

```tsx
const fields = [registerReactField("employee", EmployeeLookup)];
<OurFormProvider engine={engine} fields={fields}>
  <Form
    ref={ref}
    schema={schema}
    defaultData={initial}
    theme="tailwind"
    onChange={({ data, changedPaths }) => onChange(data, changedPaths)}
    onSubmit={save}
    onReady={(form) => console.log(form.session)}
  >
    <Inspector />
  </Form>
</OurFormProvider>;
```

Keep schema/fields/engine identities stable. Context from the host app passes through native portals.
Conventions: value/onValueChange/onBlur/disabled/readOnly/id/name/aria-\*, plus className and focusRef.
The control spreads ARIA onto its input, calls blur, and may forward focusRef to its input.
Object-valued props require an explicit ValueAdapter, checked by TypeScript and runtime value guards.
Type inference defaults to string at runtime; non-string primitives/arrays need valueType. Mapping overrides
and mapChange support existing unusual widgets. Use the same model when augmenting a portable type.

`data` + onChange is controlled; defaultData is initial uncontrolled data. Controlled echoes are no-ops,
and only changed leaves are written. Ref/onReady expose FormController (session, submit, validate, reset,
focusField, setData, destroy, view). Form itself performs cleanup; do not destroy its controller while mounted.
`useForm()` inside Form children/native portals returns the controller or null before ready. `useForm(ref)`
reads an imperative ref's current handle; it does not subscribe to changes of the ref object. Prefer onReady
or the context form for readiness. `useField(path)` subscribes to immutable FieldState and returns null
before readiness/for an unknown field. Schema/engine/fields/readOnly changes rebuild with data retained.
Theme/mode/data updates preserve DOM identity, focus and caret. StrictMode cleanup is exercised by the example.
Native fields are client-rendered; SSR hydration and React 18 support are not claimed by M04.

M06 registers builtinFields (including all Tier 1 controls) automatically. FormProps.onAction receives
portable custom button actions and uses the latest callback after a parent rerender. Validation and
localization providers are configured on the supplied engine.

M07 runnable onboarding example: `pnpm --filter @ourform/react-example dev`, then open
`http://127.0.0.1:4182/?onboarding` (controlled) or append `&uncontrolled` / `&readonly`.
All 40 values, nested scopes and Panel/Columns/Fieldset/Container are shared with the other hosts.

```tsx
const [data, setData] = useState({});
<Form schema={definition} data={data} onChange={p => setData(p.data)} />
<Form schema={definition} defaultData={initialData} />
```

Keep schema/fields/engine identities stable. Controlled full snapshots are diffed per leaf, preserving
controls/caret on echoes; rapid typing is tested. defaultData initializes an uncontrolled mount;
subsequent edits belong to its session. ref.current.reset() also clears the error summary.
