# ADR-0019 — Extension and configuration without executable JSON

Status: accepted with owner amendments on 2026-10-23; plan only, implementation not started
Date: 2026-10-23
Milestone: M09d

## Context

Applications need component variants, replacement native widgets and reusable form conventions at
Form.io-level flexibility. Current presets reuse defaults/views, composites reuse fixed templates,
and plugins install trusted code; none provides a complete inherited authoring/configuration contract.
Core remains headless, registries remain instance-owned and duplicate registration must keep failing.
ADR-0003 permits additive SDK APIs, but importing executable configuration or reversing core → SDK
dependencies would violate the architecture. M10's inputs/structures should use a proven extension
path instead of copying controls or adding built-in-specific property panels.

## Options considered

1. Copy fields/layouts and hand-write application edit dialogs. Easy initially; fixes, accessibility,
   defaults and validation drift between copies.
2. Class inheritance, mutable global overrides or JavaScript in JSON. Flexible but breaks composition,
   host isolation, deterministic Node validation and the untrusted-data boundary.
3. **Accepted:** immutable descriptor composition, explicit per-host view overrides and versioned
   JSON kits lowering to the same registrations as trusted SDK helpers.

## Accepted decision — owner amendments, 2026-10-23

- Insert M09d in **M09b+ → M09c → M09d → M10a → M10b**. This task writes a plan only; it neither
  closes M09b nor starts M09b+/M09c/M09d implementation. M09d starts only after M09c;
  PR #15 approval remains a separate owner decision.
- Add `extendField`/`extendLayout`, inheriting adapters, validators, shells, properties and views.
  Root-to-leaf metadata merges retain base ordering; defaults/hides/extra validators and a portable
  base-control wrapper compose rather than mutate ancestors. Count presets/extensions together,
  with a maximum of 8 derivation edges. Kind/scope/storage/slots/expansion cannot change.
- Adapter replacement is explicit (`value: {replace: true, adapter}`), typed and conformance-gated;
  there is no partial adapter merge or implicit validation removal. Plugin engine/dependency ranges
  and base ownership remain checked with existing npm-semver semantics.
- `overrideView(type, adapter, view)` returns a descriptor consumed by per-instance host options.
  It replaces rendering for an exact type/host only, not a model or JSON. Duplicate registration
  still throws; conflicting explicit overrides fail rather than using last-wins.
- Publish kit format 1.0 and its offline meta-schema. Kits contain presets/composites and palette/
  edit-dialog data; executable behavior is named, pre-registered capability only. They are loaded
  via `createEngine({kits})` and the builder's engine, with atomic, order-independent resolution.
- Ship the standard trusted **`ourform.builtins`** plugin with stable id and a release version
  matching core. It wraps all shipped built-in fields/layouts; the acceptance kit depends on it,
  not an application-written wrapper. Installation stays explicit and Node models/browser views
  stay separate; core never imports components/SDK.
- Allow complete JSON data-only preset properties of kinds string/number/boolean/select/options/json,
  with safe defaults, label and group. Store them at `properties.<name>`, generate editors and expose
  read-only resolved config to expressions/hosts. They introduce no rendering or submission-validation
  behavior unless trusted code or an explicitly authored expression consumes them. US phone's
  `reportColumn` string property proves this; executable/unknown metadata and unsafe names are rejected.
- Put shared model lowering in core/schema and view assembly in SDK/hosts. Core does not import
  SDK, components, renderer or frameworks. Trusted base registrations must be supplied at creation.
  Invalid imported kits produce load/compile diagnostics and publish no kit registrations; ordinary
  trusted programmer/plugin mistakes continue to throw.
- Add `{kit,version}` form requirements alongside `{plugin,version}`; builder saves **caret ranges
  from installed versions** (`1.0.0` → `^1.0.0`) for active kits/dependencies. Compatible patch/minor
  1.x upgrades keep forms valid; npm-semver's narrower 0.x caret rules remain. Any change to canonical
  values, validation or composite structure requires a **major kit version bump**, documented in
  the kit author guide. Missing/incompatible requirements return `missing-kit`, and nothing fetches
  a package or executes imported source. Runtime defaults and builder-only Add defaults stay distinct.
- Resolve presentation/defaults from base → derived → dependency/dependent kit → host → explicit
  instance, with wildcard before exact within a layer. Unrelated conflicting kit writes fail.
  **Locks accumulate with no unlock path**; component host locks are always strongest. Hides are
  presentation: explicit host `editor.rules` / `palette.types` may reveal kit/inherited hides.
  Kits may reveal another kit's hide only through a declared dependency; unrelated conflicts fail.
  Hide is not serialization/validation policy. Enforce locks in builder-core, including JSON/history/
  bulk routes; revealing a property never unlocks it. Spec 07 defines explicit-false hide maps and
  compatible hide-only shorthand, precedence and the required regression matrix.
- Ship the kit loader/meta-schema validation in an **opt-in `@ourform/core/kits` entry**, with a
  kit-enabled `createEngine` facade; root core/builder imports do not include or request it. Apps
  without kits pay no kit loader/schema bytes. Give this entry a separate enforced consumer-build
  budget, counting shared chunks once and reporting incremental bytes. Its numeric ceiling needs
  a measured proposal and owner approval before shipping; no unbounded allowance or automatic
  increase is granted. ADR-0018's ≤26 kB core builder and existing entry/aggregate budgets stay fixed.
- Add **`ourform create-kit`** and **`ourform kit validate <file>`**, sharing engine diagnostics and
  JSON Pointers, explicit trusted local registrations and offline schema resolution. Publish the kit
  schema for editor autocomplete. The future **Save as reusable component** action writes presets
  in this format; its UI/gallery/storage remain deferred until after M10a.
- Hard limits: 32 kits, 1 MiB per kit/4 MiB aggregate UTF-8, JSON depth 64, 20,000 visited
  values per kit/50,000 total, 256 derived registrations per kit/1,024 total; retain existing
  composite expansion limits. Reject prototype keys, unsafe references, executable members and
  invalid data before publishing registrations. Hosts may tighten; kit documents cannot raise limits.

Specs [04](../spec/04-sdk.md#m09d--extension-and-configuration-accepted-plan-adr-0019) and
[07](../spec/07-builder.md#m09d--extension-and-kit-configuration-accepted-plan-adr-0019) are the canonical
planned merge/precedence/error contracts; [M09d](../milestones/M09d.md) contains tasks and acceptance.
The owner accepted the previous plan with these six amendments; this supersedes the initial
presentation-hide union, exact saved-version pin and ban on kit-declared data-only properties.
This ADR accepts a future contract, not an implemented API or a completed milestone.

## Consequences and acceptance evidence

No new component needs builder-specific editors. An under-25-line Currency extension must prove this
with its added property; a JSON contacts kit must use `ourform.builtins`, add US phone/Address and
`reportColumn`, hide two palette types and lock a property. Identical kit bytes and form/submission fixtures must validate identically in Node
and browser. React Select replacement must leave form JSON unchanged and other hosts isolated.
All five themes, host conformance, keyboard/axe, hostile-input boundaries and full pinned verify remain
required. Existing size/count thresholds and ADR-0018 consumer-build accounting are not relaxed.
Evidence must also cover host/dependency reveal precedence without unlocking, compatible kit upgrades,
CLI/engine diagnostic parity, editor schema association and zero optional-kit cost in no-kit builds.

Before closure, a fresh Codex session with no implementation context must build the extended field
and kit from guides/CLI/examples alone. Preserve exact provenance/report and fix its gaps. M11's
human usability exercise remains separate. M10a should define genuinely new structural models and
use extension for compatible variants/kits for compositions; M10b should derive compatible scalar
inputs (notably Currency/Phone) and use kits for defaults/region variants. File/Tags/new array storage
must not be forced into incompatible inherited adapters or scopes.

Implementation will need additive schema/runtime options, view plumbing, property policy types,
meta-schema/export inventory, docs/changesets and tests. **None is shipped or marked PASS here.**
