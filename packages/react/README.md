# @ourform/react

React 19 is supported. React and react-dom are peers, never bundled.

```tsx
import { tailwindTheme } from "@ourform/themes/tailwind";
const themes = [tailwindTheme];
const fields = [registerReactField("employee", EmployeeLookup)];
<OurFormProvider engine={engine} fields={fields}>
  <Form
    ref={ref}
    schema={schema}
    defaultData={initial}
    theme="tailwind"
    themes={themes}
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

## Visual builder (M09)

`FormBuilder` (forwardRef<BuilderController>) and `FormBuilderProps` add the reusable authoring UI.
Use `<FormBuilder schema={definition} fields={stableFields} onSchemaChange={c=>setDefinition(c.definition)} />`.
`onReady` exposes the controller and `onPreviewReady` tracks session replacements. `of-schema-change`
also bubbles with the same `{definition,patch}` detail. Controlled echoes load as no-ops; external schema
changes are atomic undoable imports. Keep engine/fields identities stable; changing either recreates the
controller/history. Theme/mode updates preserve session/control identity. StrictMode/unmount cleans
controllers/portals. Native fields render through owner React portals and retain context plus useForm()
for the current preview session. Demo `/builder.html`; tests/e2e/builder-hosts.spec.ts.

M09b: `FormBuilder` accepts the builder's chrome, palette, toolbar, editor and lock options.
Controlled `chrome` changes call `setChrome` in place, preserving controller, draft and native portals.
Native `useForm`/`useField` inside settings refer to that preview's isolated controller, with the owner's
React context retained. Cancel never writes preview answers into the main form.

Form hosts accept an optional `themes` registry (`HostOptions["themes"]`) and a `theme` name.
Import descriptors explicitly from `@ourform/themes/<name>`; registry changes update the mounted
view in place, preserving the session, values, touched/errors, focused control and caret. A simultaneous
registry and selected-theme change is resolved atomically. Unknown names throw with
`code: "unknown-theme"`, without selecting another theme. Registries are per form instance.

### Per-feature builder preload

The builder host exposes independent `settingsPreload`, `planningPreload` and `dataPreload`
options (`'idle'` by default, `'none'` to load only on activation). `preload` controls only
Logic/JSON and defaults to `'none'`. Set all four to `'none'` for a no-background-import host.
Angular uses inputs, React uses props, and the builder custom element uses properties.
