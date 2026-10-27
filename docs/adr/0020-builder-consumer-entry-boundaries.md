# ADR-0020 — Consumer entry boundaries for the builder loading split

Status: accepted by the owner with the no-growth amendment on 2026-10-23
Date: 2026-10-23
Milestone: M09b+
Related: accepted ADR-0018; accepted ADR-0019 remains M09d

## Context and evidence

The owner approved M09b screenshots at `79e69f688b1779696449465fbe34869460018cd0`.
PR #15 merged as `0b3b452c46096e852248ca11872f9697888c621e` after both Verify runs
passed on attempt 1. M09b+ starts with the ADR-0018 split, before authoring shortcuts.
This ADR records the accepted split plan and accounting boundary. Existing ceilings stay fixed;
the owner additionally gates the full initial transitive closure at 64,613 Brotli bytes.

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

## Accepted split boundaries

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

## Accepted budget accounting — owner decision 2026-10-23

ADR-0018 fixes core builder at **26 kB**, Logic at **10 kB**, JSON at **8 kB**, dependency map at
**10 kB**, and the existing deferred union at **28 kB**. Command bar and History need measured, owner-approved individual allowances. The owner later
approved the command-bar ceiling below; History remains unbudgeted. No kit loader or
validator may be charged to these entries; ADR-0019 keeps them optional and separately budgeted.

The **≤29 kB** ceiling applies to **builder UI initial (excludes builder-core) code and styles after a consumer
production build**: the incremental builder on top of the form runtime an app already uses. Shared
form-runtime dependencies (core, renderer, themes and other shared packages) retain their existing
budgets and must be fully reported in every size report, attributing each shared chunk once.

Also enforce **no growth of the entire initial transitive closure: ≤64,613 Brotli bytes**. Include
all initially required builder/runtime/shared code and styles; no bytes may disappear through
relabeling or chunk placement. Logic, JSON editor, dependency map, command bar and History chunks
are excluded only while truly deferred: they make no initial request and remain under their own
ADR-0018 budgets. Report each full first-open transfer closure and the union of shared chunks once.
Any later increase to 64,613 requires a measured proposal and explicit owner approval.

Prototype/measure the extracted History and upcoming command search,
then bring their numeric budget proposal with emitted files and transfer evidence before shipping.
Do not raise existing ceilings or infer a new allowance from the 28 kB Logic/JSON/map union.

## Implementation and acceptance plan

1. Enforce the accepted accounting boundary above. Write selection/bulk-command contracts in a separate ADR
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

## Accepted Settings amendment — 2026-10-25

ADR-0018's retained-core wording is amended only for generated Settings: modal/drawer editor UI and
styles load as their own deferred entry, while the dialog frame, focus/loading/error lifecycle,
commands, locks, schema/draft/Add semantics and validation remain initial. PointerDrag remains
initial and responds to its first pointerdown. Settings idle-preloads by default through the separate
`settingsPreload` policy; `none` remains available. Loading failure exposes its reason, Retry, and for
private Add, Add with defaults. The Settings entry gets an owner-approved individual budget outside
the 28 kB Logic/JSON/map aggregate and is included in a newly reported deferred total.

The full-initial gate remains 64,613 bytes. The opt-in-theme amendment below supersedes the earlier
26,000-byte builder-owned limit and candidate-deferral review.

## Accepted opt-in-theme and option-B amendment — 2026-10-26

The owner accepted the measured opt-in-theme design and option B. The main builder includes Neutral
chrome, Settings remains lazy, and context menu, toolbar More, Issues and clipboard remain initial.
There is no secondary-tools entry. Explicit form-theme and builder-recipe subpaths, instance-local
registration, registered-only picker options, host-owned lazy theme loaders, Material's Base
dependency, custom recipes, per-theme/all-theme script builds and compatibility exports are required.

The builder-owned ceiling is **29,000 Brotli bytes**, including Neutral and registered builder recipes.
The measured reason is approximately 1.4 kB transferred from shared runtime accounting plus about
1 kB M09b+ headroom. The entire initial closure remains **≤64,613 bytes with no growth** and is the
primary consumer gate. Settings ≤8,000, Logic/JSON/map ≤28,000 combined and
Logic/JSON/map/Settings ≤36,000 are unchanged. New menu/panel/dialog features default to lazy loading;
each reports both initial deltas and stops before crossing either ceiling.

Implementation now follows the accepted option-B boundary. The final pinned production probe reports
27,484 builder UI initial (excludes builder-core) bytes and 61,049 full minimal initial bytes. Settings is 7,391 bytes;
Logic/JSON/map/Settings share-counted union is 8,136 bytes. The reproducible host and per-theme
distribution report is `docs/reviews/m09b-plus-loading-split.md`. These measurements do not authorize
unresolved command-bar/History budgets or any M09c implementation.

## Owner amendment — command bar and multi-select, 2026-10-27

The command-bar consumer closure has an approved **4,500 Brotli-byte** ceiling with lazy indexing.
Builder UI initial (excludes builder-core) remains ≤29,000 bytes (target ≤28,800); the full initial closure remains
≤64,613 bytes. Preserve all owner-protected initial behavior and defer nothing else without approval.
Before shipping either the command bar or multi-select, measure their combined initial builder-owned
and full-closure sizes, and measure the separately lazy bulk editor with a proposed ceiling. If the
combined initial exceeds 29,000, present measured compaction or shared headless selection alternatives.

On first Ctrl/Cmd+K the accessible frame appears immediately. Indexing the 500-field fixture is
advisory ≤50 ms and has a deterministic index-work count gate; typing is never blocked by results.
Reopening uses the cached index, rebuilt only on schema changes. History/diff remains unbudgeted
and unshipped.

## Owner amendment — quick-add budget, 2026-10-27

| Consumer-built lazy closure         | Brotli ceiling |
| ----------------------------------- | -------------: |
| Quick-add (including Retry closure) |    3,750 bytes |
| Command bar (lazy indexing)         |    4,500 bytes |

Every future lazy chunk requires an owner-approved ceiling before shipping. Quick-add measured
3,403 bytes including shared chunks; the size gate enforces its main and Retry closures.

## Owner decision — builder-core consumer accounting

Keep the established builder UI boundary, now named **builder UI initial (excludes builder-core)**,
and the full initial closure boundary. Report builder-core separately as the marginal Brotli difference
between the full consumer build and the otherwise identical build with `@ourform/builder-core`
externalized; static shared output is counted once in each closure. Compression and chunk changes
mean this is a marginal contribution, not a sum of independently compressed source files. At the
current head it measures **6,675 bytes**, suggesting a ceiling of **7,050 bytes** (105%, rounded up
to 50). The third gate is pending owner confirmation and is not yet enforced. Every combined-feature
report must show all three measurements and moved-code attribution. Headless selection may move to
builder-core only within the confirmed ceiling; full closure remains at most 64,613 bytes. Compact
first, then measure headless placement, then propose at most a one-time 29,500 UI ceiling if needed.
