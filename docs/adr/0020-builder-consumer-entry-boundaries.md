# ADR-0020 — Consumer entry boundaries for the builder loading split

Status: proposed — owner review before split implementation
Date: 2026-10-23
Milestone: M09b+
Related: accepted ADR-0018; accepted ADR-0019 remains M09d

## Context and evidence

The owner approved M09b screenshots at `79e69f688b1779696449465fbe34869460018cd0`.
PR #15 merged as `0b3b452c46096e852248ca11872f9697888c621e` after both Verify runs
passed on attempt 1. M09b+ starts with the ADR-0018 split, before authoring shortcuts.
This ADR records a concrete split plan and an accounting question; it changes no accepted ceiling.

A read-only probe of the unchanged published build on Node 22.22.3, esbuild 0.25.12 and default
`node:zlib.brotliCompressSync` reports:

| Scope                                                                 | Raw bytes | Brotli bytes |
| --------------------------------------------------------------------- | --------: | -----------: |
| Existing `@ourform/builder` entry, with package dependencies external |   124,040 |       29,982 |
| Minimal browser consumer, all transitive imports bundled and minified |   264,157 |       64,613 |

Probe entry: `import { createBuilder } from "@ourform/builder"; globalThis.mountOurFormBuilder = createBuilder;`.
Use esbuild `bundle:true`, `format:"esm"`, `minify:true`, `target:"es2022"`, `write:false`,
`metafile:true`, and compress the emitted bytes. The second row includes core, schema, SDK,
builder-core, renderer, theme registrations and their transitive dependencies; it contains no form
fixture, native framework app or new shortcut. It is a baseline probe, not a completed split,
Vite/Angular acceptance, cold-route measurement or evidence that the 26 kB target is met.

## Proposed split boundaries

- Keep palette/canvas/outline, command dispatch and undo/redo, standard component settings and their
  compact sentence expression controls, Data/Preview and host save events in the core entry.
- Move root Logic UI, full/component JSON editing UI, dependency map UI, History view and command
  search UI into five separate internal feature entries. Move feature-only styles/strings/search/diff
  code with their owner. Keep the command history store, lock checks and JSON validation/apply in
  headless core; a lazy view cannot gain a second state store or bypass a command.
- Do not add spec-11 rules or a fabricated dependency map in this split. Logic/map stay unavailable
  until M09c; their module boundaries and budget tests must already exist without falsely claiming
  the future screens implemented. History initially remains the existing undo-command log, not
  persistent version history/diff/restore. Command search is activated only when its M09b+ step lands.
- A small instance-owned loader maps feature ids to static import functions in bundler builds.
  Script-tag builds publish the same self-hostable ESM assets, with configurable `assetBase` and a
  generated manifest of fixed known feature paths; never evaluate source or import schema-provided URLs.
  Resolve all required chunks/styles against that asset base and include them in the offline package.
- `preload:'none'` is the default: no deferred requests at construction or idle. `idle` fetches Logic
  and JSON only after idle, never mounts them and cancels pending scheduling at destroy. M09c feature
  implementation remains deferred; preloading must not pretend a disabled feature is usable.
- Keep focus on the activating control through an accessible loading state. A failed load exposes
  Retry and leaves definition, selection, history and unsaved edits intact. Cache successful module
  imports; module code is shared but view state belongs to each instance. Activation tokens and
  abortable lifecycle prevent stale loads mounting after navigation/destroy; teardown releases
  feature subscriptions. Reopening a loaded feature does not make another module request.

## Budget accounting — explicit owner decision required

ADR-0018 fixes core builder at **26 kB**, Logic at **10 kB**, JSON at **8 kB**, dependency map at
**10 kB**, and the existing deferred union at **28 kB**. Command bar/History need additional measured,
owner-approved individual and aggregate allowances; none is granted by this ADR. No kit loader or
validator may be charged to these entries; ADR-0019 keeps them optional and separately budgeted.

The published-entry and whole-consumer numbers above measure different things. The old 29.982 kB
check excludes package dependencies. The requested new consumer accounting must explicitly determine
whether the 26 kB ceiling applies to the builder-owned initial entry or to the entire initial
transitive closure. Do not silently substitute one for the other or move code to unbudgeted chunks.

Proposed interpretation for review: enforce the 26 kB ceiling on builder-owned initial code/styles
**after** a consumer production build; report and account for the common form-runtime closure under
its existing package budgets as well. Also publish full initial transfer and every first-open route's
actual transitive closure, counting shared chunks exactly once in the union. Consumer-owned runtime
bytes must never disappear from that report. This interpretation is **not accepted** until the owner
confirms it; if 26 kB means the whole initial closure instead, plan to that stricter contract.

Once the boundary is settled, prototype/measure the extracted History and upcoming command search,
then bring their numeric budget proposal with emitted files and transfer evidence before shipping.
Do not raise existing ceilings or infer a new allowance from the 28 kB Logic/JSON/map union.

## Implementation and acceptance plan

1. Settle the accounting boundary above. Write selection/bulk-command contracts in a separate ADR
   before those commands are implemented; retain stable ids/keys and the approved interaction rules.
2. Split build outputs and feature ownership; wire the instance loader and host `assetBase`/`preload`
   options through vanilla, Element, React and Angular without global mutable configuration.
3. Add production consumer fixtures for Vite/React, Angular CLI, vanilla and script-tag distribution.
   Pin tools and publish entry/chunk/asset manifests, initial and route closures, shared-union bytes,
   and cold/warm requests. Do not use the multi-host playground as a minimal consumer measurement.
4. Test no-load/default, idle-only Logic/JSON fetches, first-open/reopen, failure/retry, stale activation,
   destroy cleanup, independent builders, focus, schema/history preservation and locks in all browsers.
   Serve every asset locally under strict CSP; exercise a custom assetBase and blocked external network.
5. Add exact deterministic count assertions, unchanged size limits and affected five-theme/axe/visual
   coverage. Full pinned verify and first-attempt current-head CI are required for delivery; owner
   screenshot approval remains mandatory. Keep 127.0.0.1:4173 running at handover.

No split, new host option or authoring shortcut is implemented by this planning ADR. The baseline
measurements above are before-only; no after number or milestone PASS is claimed.
