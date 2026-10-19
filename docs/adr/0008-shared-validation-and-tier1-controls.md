# ADR-0008 — Shared validation and Tier 1 controls

Status: accepted. Date: 2026-10-19. Milestone: M06.

## Context and decisions

The user authorized Phase 1 after the M05 gate report. Keep the package dependency graph and the
existing session pipeline. M06 adds no external runtime dependency.

### Validation and providers

EngineOptions adds validators and providers alongside the existing per-engine host function map.
ValidatorMap entries expose validate(value, context), returning null, FieldError, FieldError[] or a
Promise of those results. Context contains componentId, path, frozen invocation data/config/args, an
actual AbortSignal and host-supplied providers. Core compiles model.validators and node.validation.custom
against that registry. Unknown rules retain the existing unsupported-validator diagnostic code.
The built-in email/options rule names are reserved. Function maps remain frozen, per engine, with the
existing pure/availableInNode enforcement. Expressions in custom arguments participate in dependency
recording; self references do not create an edge. Cross-rule dependency cycles are diagnosed.

Sessions retain synchronous validation/notification ordering for synchronous rules. Async runs expose
pending and race an AbortSignal, even when a host ignores cancellation. Value/dependency changes, newer
validation, reset, hiding and disposal abort old runs. Late results cannot commit to live state. A waiter
whose run was superseded receives an aborted validation error, so a superseded async submit fails closed.
Successful submit still serializes its invocation snapshot. Host exceptions/rejections/malformed errors
become unavailable errors; safe JSON error snapshots prevent host mutation from changing stored errors.
Optional empty values skip custom validators; required handles emptiness first. Providers own I/O/timeouts.
No SDK package invokes a network API. AbortController/AbortSignal are Node 22 and browser globals; core
uses development Node types to compile with ES2022 and no DOM lib, and imports no Node runtime module.

Localization is a host callback (key, params, locale) returning text or undefined. The frozen English
catalog supplies shell/control/builder/validation defaults; unknown keys fall back to the key safely.
FieldError remains a message key plus parameters. The existing renderer t callback and of.required alias
remain compatible. The demo provides Spanish overrides with English fallback.

### Customer Node validation and JSON Schema

@ourform/validation exports compileForm(engine, unknown), validateSubmission(compiled, data, {providers?})
and re-exports toSubmissionSchema. It imports only schema/core. The same FormSession and validators run
in Node/browser. Submission preflight rejects non-JSON/non-object data, extra keys, malformed scopes and
values that change on normalize/serialize round-trip. Serialized custom values are supported. Missing
visible required fields and forged non-overridable calculations fail. It never coerces untrusted values
or sends data. Unknown fields are rejected before host validators are called.

The generator lives in schema using a structural SubmissionSchemaSource satisfied by CompiledForm;
this avoids a schema → core dependency. It emits Draft 2020-12 objects per scope, adapter submission type
hints, unconditional required/empty constraints, scalar bounds, patterns, Unicode code-point lengths and
static option enums/email patterns. Optional empty values bypass ordinary rules, matching the session.
Conditional visibility/validation, calculations, disabled expressions and host validators remain explicit
x-ourform-\* annotations. Bare Ajv validates static constraints; the SDK is still needed for runtime-only
annotations. Arbitrary custom isEmpty/validator functions cannot be encoded as JSON Schema. Adapters must
supply appropriate submission schema hints and model validators for their own domain. Ajv is development
only, as required by the acceptance suite, not a runtime code generator inside the SDK.

References: [JSON Schema validation vocabulary](https://json-schema.org/draft/2020-12/json-schema-validation)
and [Ajv format support](https://ajv.js.org/guide/formats.html). Email uses one explicit pattern in runtime
and output rather than implying support for every mailbox syntax or adding a format plugin dependency.

### Controls, actions and Content

New controls use defineField; defineDisplay composes metadata/views for non-value Content/Button without
dummy submitted keys. Hidden is a value-producing hidden input, distinct from conditional invisibility.
Textarea/Email/Password use text values; Radio/Select static options use string values and model validators.
Select values are applied after options are installed, including on updates. Radio/Select/actions disable
interaction in readOnly mode. All adapters register the same builtinFields list by default.

Portable props gain optional actions (submit/reset/emit). The renderer supplies callbacks, forwards custom
of-action events and HostOptions.onAction, and retains shared validation/focus behavior for submit buttons.
Controls do not own or duplicate the session. The builder automatically discovers new metadata.

Content renders a documented supported markup subset to safe VNodes, never an HTML-writing sink. Allowed
markup: p/strong/em/b/i/ul/ol/li/br/a/code/pre/span. Active subtrees (script/style/iframe/object/embed/svg/math/
template) are dropped; other unsupported tags are unwrapped. Anchor href/title are the only source
attributes retained. URLs require explicit http/https/mailto/tel protocols; events/styles/embedded media
are discarded. Entity decoding cannot create active nodes because strings remain escaped text. Source is
bounded at 100,000 characters and nesting at 64. This is a small supported-markup renderer, not an HTML5
browser parser or a general HTML sanitizer for external HTML sinks.

### Pointer/blur ordering and themes

The conformance flow exposed blur validation removing error rows above a radio between pointer down
and activation. The renderer defers those touches until that pointer sequence ends, and flushes keyboard
blur immediately. It owns and cleans up the pointer listeners/timer/queue. Tests retain real radio clicks;
no forced input action or relaxed assertion is used. Reset actions clear deferred touches so a blur
queued before reset cannot mark the freshly reset form touched.

Compiled theme CSS now excludes radio/hidden inputs from text sizing and supports textarea/select/radio
layout. Bootstrap 4/5 remain separate presets. Existing visual baselines and thresholds are retained.
No layouts, array execution, plugin system or full builder work is introduced.
