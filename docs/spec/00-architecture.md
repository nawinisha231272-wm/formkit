# 00 — Architecture

Status: normative. Source: "OurForm Build Specification" doc + Plan v3.

## Product boundary

- Self-hosted SDK. Customers install packages into their own apps and deploy on their own infrastructure.
- No service operated by us is required to render, validate, build or license forms.
- Not in scope before 1.0: hosted storage, submission database, users/roles, workflow, PDF, email,
  analytics, collaborative builder, marketplace, schema-supplied JavaScript, full Form.io compatibility,
  Vue adapter, Material-style renderer packs, Form.io importer.

## Layers (dependencies point down)

```text
apps (playground, examples, docs, benchmarks)
  │
adapters      @ourform/element   @ourform/react   @ourform/angular   (@ourform/vue later)
  │
renderer      @ourform/renderer-dom  (portable renderer, FieldShell, theme runtime)
  │           @ourform/theme-base | theme-bootstrap5 | theme-tailwind
  │           @ourform/builder (UI)  ──uses──▶ @ourform/builder-core (headless)
sdk           @ourform/sdk  (define* APIs, property helpers, contracts, test kit)
  │           @ourform/components (built-ins, written on the public SDK)
core          @ourform/core (compiler, session, store, paths, expressions, graph, processors)
  │           @ourform/validation (rules, validateSubmission; browser + customer Node)
schema        @ourform/schema (definition types, meta-schema, migrations, JSON Schema output)

side packages: @ourform/licensing (offline keys), @ourform/testing (conformance), @ourform/cli
```

## Allowed imports

| Package                 | May import                                                  |
| ----------------------- | ----------------------------------------------------------- |
| schema                  | nothing internal                                            |
| core                    | schema                                                      |
| validation              | schema, core                                                |
| sdk                     | schema, core                                                |
| components              | sdk (and its re-exports)                                    |
| renderer-dom            | schema, core, sdk, theme-\* presets (ADR-0005)              |
| theme-\*                | sdk (types only)                                            |
| builder-core            | schema, core, sdk                                           |
| builder                 | builder-core, renderer-dom, sdk, core, schema               |
| element, react, angular | renderer-dom, sdk, core, schema, components (optional peer) |
| licensing               | nothing internal                                            |
| testing                 | anything (dev only)                                         |
| cli                     | sdk, schema                                                 |

Enforce with ESLint import-boundary rules. A violation fails `pnpm lint`.

## Headless rule

`schema`, `core`, `validation`, `builder-core` compile without the `DOM` lib and run in Node 22
with no browser globals. Tests for these packages run in the Node environment.

## Model / view split

Each component type = one `ComponentModel` (registered in the engine registry, used by core,
validation, builder-core) + one or more views (registered per adapter with the renderer).
`defineField` returns `{ model, views: { portable } }`. Native bridges add `views[adapter]`.

## Data flow

```text
FormDefinition ─compile→ CompiledForm (immutable) ─createSession→ FormSession (state)
   setValue(path) → normalize → dependency graph → calculate → visibility/disabled
   → clear-on-hide → validate (per validateOn) → StatePatch → renderer updates named fields only
```

## Decisions recorded so far

- ADR-0001 Monorepo with pnpm + Turbo (M0)
- ADR-0002 Portable control representation: VNode vs DOM factory (M2, decided by measurement)
- ADR-0003 SDK 0.x API freeze (M8)

## M00 transition

ADR-0001 records the foundation split: schema owns starter form types; core owns the headless
model, property and value contracts; SDK `defineField` returns `{ model, views: { portable } }`.
Register the model with the engine and pass a view map separately to the starter DOM renderer.
The full compile/session API and renderer mount contract arrive in M01–M03.

M05 (ADR-0007) extends the renderer preset dependency exception to theme-bootstrap4; theme packages still import SDK types only.
