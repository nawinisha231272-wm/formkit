# ADR-0003 — SDK 0.x public API freeze

Status: accepted — M08 GO under the owner-amended criterion (ADR-0013), after full corrective verification. Date: 2026-10-20.

## Context

M02 selected portable VNodes, M04 native view bridges, M05 metadata-driven builder commands and M07
layouts. M08 completes declarative extension packaging and author tooling. The SDK must keep labels,
errors, ARIA, themes and builder wiring out of basic customer control implementations. Core must
remain headless and registries must be per engine. Bootstrap 4 remains fully supported for 1.0 by
ADR-0011; new controls must pass all four supported themes.

## Decision

Freeze the existing public contracts and the additions below for SDK 0.x. Additive APIs from later
milestones remain possible; a breaking change requires a new ADR, spec/README, changeset and review.
The exact package export inventory is [sdk-0.x.json](../api/sdk-0.x.json), checked against declared TypeScript
exports and the built runtime exports by `SDK 0.x export inventory matches ADR-0003`. No default export or source subpath is public.

Runtime exports:

booleanProperty, booleanValue, controlAttributes, defaultMessage, defineComposite, defineDisplay,
defineField, defineLayout, definePlugin, definePreset, englishMessages, escapeHtml, exprProperty, h,
jsonProperty, mapNativeProps, nullableBooleanValue, numberProperty, numberValue, optionsProperty, registerNativeField,
renderVNodeToString, resolveConfig, selectProperty, stringProperty, stringValue.

Type exports:

ComponentModel, ComponentViews, ConfigOf, Expr, FieldControlProps, FieldDefinition, FieldPart,
FocusTarget, FormDefinition, FormField, LayoutView, NativeFieldOptions, NativeRegistrationArgs,
NativeView, Plugin, PortableControl, PrimitiveNativeValue, PropertyDefinition, PropertyGroup,
PropertyKind, PropertyMap, RegisteredField, ShellVariant, Theme, ThemeMode, ThemeOverride, VNode,
VNodeAttribute, VNodeChild, VNodeProps, ValueAdapter.

### Extension semantics

- definePreset(type,{base,defaults,title}) derives a new portable or native field type. Defaults are validated, typed
  property metadata defaults, overridable by node.properties. The preset shares the base's view,
  value adapter and validators and leaves its metadata unchanged. A distinct nonempty type is required.
- defineComposite({type,title,components,dataScope}) snapshots fixed child templates. Object scope is
  the default (requiring an instance key); none is transparent. The renderer uses a fieldset/legend.
  Each generated id is `<instance-id>/<local-id>`, including nested local ids. Runtime visibility/calculation/validation ref expressions pointing
  into the template are rebased; properties/meta/default values stay opaque. External refs and absolute paths retain their meaning. Generated
  collisions remain compile errors. Original wire JSON is preserved; compiled nodes contain expansions.
  Instance components cannot replace registered children. Trusted model.expand callbacks run only
  during compile, return safe JSON and are bounded to 64 levels / 10,000 nodes; recursive types fail.
  Expanded shape/types/properties/ids/keys/refs are revalidated before graph/session creation.
- definePlugin returns a frozen package descriptor with components/themes (empty arrays by default),
  optional validators/functions/dataSources and dependency requirements. EngineOptions.plugins installs
  the complete set at engine creation; order does not matter. Engine/plugin ranges use standard npm
  semver, including caret/tilde/comparators/unions/prerelease rules. Invalid/incompatible registrations,
  missing plugin dependencies and duplicate names throw programmer errors. Form requirements return
  missing-plugin diagnostics instead. Core snapshots models and registered functions/validators, stores
  only plugin id/version metadata and does not retain view/theme implementations. Hosts pass packaged
  views/themes explicitly. dataSources are trusted providers under providers.dataSources; no networking
  or M11 remote-control UI is added. Host and plugin provider-name conflicts also throw.
- Core adds coreVersion (from its package version) and the structural PluginRegistration input type;
  ComponentModel gains headless expand. The sole added runtime dependency is pinned semver 7.8.5:
  using the [npm reference implementation](https://github.com/npm/node-semver) avoids an incomplete
  private range grammar. It has no runtime dependencies. Package/size checks remain enforced.
- @ourform/testing adds renderComponent(def,{host,theme,...}) (host is an empty caller-owned Element),
  RenderComponentOptions, componentTestEngine, checkValueAdapter, checkValidation and
  checkBuilderRoundTrip and mountComponentBuilder. The Playwright subpath adds
  checkPropertyEditors/PropertyEditorCase. An engine with custom validators/providers and native hosts can be supplied explicitly; destroy releases the fixture.
  Helpers throw on invariant failures and use the actual public engine/renderer/builder/validation.
- @ourform/cli exports createScaffold, runCli, ScaffoldKind and ScaffoldOptions and the ourform binary.
  create-component/create-theme/create-plugin generate standalone projects with pinned tools and
  verification. They refuse existing output and do not install or make network calls. Prepublication
  development uses --local-packages with packed SDK tarballs; published dependencies use exact 0.0.1.
  A theme contains a preview field to prove palette integration; themes themselves are not fields.

### Interaction correction found by the SDK exercise

The new required Rating/composite flow exposed lost clicks on host-owned submit buttons outside the
form: pointerdown was observed only inside root, so blur could remove errors and move the outside
target before activation. The renderer now tracks pointerdown on its owner document (and removes that
listener on destroy), deferring touch through pointerup just as for inside targets. No timeout,
assertion, pixel threshold or control source is weakened. The four-theme browser flow covers this case.

## Gate

ADR-0013 records the owner decision: fresh context-free Codex sessions may satisfy the author criterion;
the owner explicitly accepts this continued-session Yes/No trial despite its failed fresh-session
condition. The original report's requested fresh-author label is corrected in place by its provenance
note; it must not be treated as evidence of a fresh session. The original No usability verdict is kept.
A human guide-usability pass is an M11 task and acceptance criterion.

Adapters/shells/captions/help are corrected and full pinned verification passes; the M08 recommendation is GO. Final author/timing/result/gap/fix records
and the GO/NO-GO recommendation live in docs/progress.md and docs/rehearsals/yes-no/. Earlier Slider/Color
rehearsals remain AI-assisted rehearsals. This ADR is accepted after 194 unit tests, 444 browser cases, all size budgets/count checks and
public export verification pass. The inventory above includes nullableBooleanValue in the freeze.

No M09 implementation or plan amendment is authorized by this gate. Stop for owner review after the
closure PR merges on its initial green CI checks.
