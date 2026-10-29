# ADR-0020 — Consumer entry boundaries for the builder loading split

Current enforcement: the owner-approved 2026-10-28 reset below supersedes earlier size tables:
**UI 31,600 / builder-core 7,300 / full initial 67,400 / standalone builder 31,600 bytes.**
Earlier measurements, ceilings and rejected probes remain historical evidence.
Status: accepted by the owner, including the explicit 2026-10-28 size reset and lazy-body amendments
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

| Consumer-build gate                        | Brotli ceiling |
| ------------------------------------------ | -------------: |
| Builder UI initial (excludes builder-core) |   29,000 bytes |
| Builder-core initial contribution          |    7,050 bytes |
| Full initial closure                       |   64,613 bytes |

Keep the established builder UI boundary, now named **builder UI initial (excludes builder-core)**,
and the full initial closure boundary. Report builder-core separately as the marginal Brotli difference
between the full consumer build and the otherwise identical build with `@ourform/builder-core`
externalized; static shared output is counted once in each closure. Compression and chunk changes
mean this is a marginal contribution, not a sum of independently compressed source files. At the
the baseline measures **6,675 bytes**. The owner confirmed the **7,050-byte** ceiling (105%,
rounded up to 50), and the third gate is enforced. Every combined-feature
report must show all three measurements and moved-code attribution. Headless selection may move to
builder-core only within the confirmed ceiling; full closure remains at most 64,613 bytes. Compact
first, then measure headless placement, then propose at most a one-time 29,500 UI ceiling if needed.

## Owner work-mode amendment — 2026-10-27

Complete the combined command-bar/multi-select/bulk-editor prototype and work-count/timing probes before
compaction. Measure UI, builder-core and full initial against 28,857 / 6,675 / 63,623 bytes. Compact
first and discard growing variants, then allow headless selection placement only within the enforced
7,050-byte core contribution. If still needed, the owner pre-approved one final UI ceiling equal to the
measured value rounded up to 50, at most 29,500, while full initial remains at most 64,613. Record the
actual amendment only after measurement; the current UI ceiling remains 29,000 until then.

New lazy chunk ceilings are pre-approved by formula: measured closure plus 10%, rounded up to 50,
at most 5,000 bytes. This does not change existing command-bar, quick-add, Settings or aggregate
ceilings. Each new ceiling is recorded and enforced before shipping. Immediate command frame, selection
highlighting/Shift arrows, clipboard, context menu and PointerDrag stay initial. History/diff remains
unbudgeted and unshipped. Every push requires a passing full pinned verify; do not merge this milestone.

## M09b+ bulk-editor measurement — 2026-10-28

Under the owner's pre-approved work-mode rule 4, the new bulk editor's consumer-built closure
measures **4,266 Brotli bytes** (Retry 4,252). Its enforced ceiling is **4,700 bytes**:
`ceil(4266 × 1.10 / 50) × 50`. Shared generated editor and message chunks count once per closure;
this is not its entry file in isolation. The command bar retains its 4,500-byte ceiling. UI initial
remains 29,000, builder-core 7,050, and full initial 64,613. The combined prototype exceeds the
initial gates and remains unshipped; no one-time UI increase is applied while the full gate fails.
See [combined prototype measurement](../reviews/m09b-plus-combined-prototype-measurement.md).

## Owner size reset and two additional lazy bodies — 2026-10-28

The owner explicitly approved lazy bulk Move/Wrap/Duplicate/Paste planning and the Data inspector
body, with separate `planningPreload` and `dataPreload` policies, both defaulting to `idle` (`none`
opts out). Their accessible activation frame, focus, reason/Retry and cancellation remain initial.
Bulk Delete/Required, Delete key, clipboard handlers/buffer/system access, selection, Shift arrows,
Ctrl/Cmd+K frame, context menu and PointerDrag remain initial. Pending planning snapshots the source
schema; intervening schema changes refuse the operation without history. Cancel/destroy never applies
late mutations. Preloading imports bodies only; it never mounts or mutates them.

The completed boundary measurement uses the same consumer method and accounting as every earlier
report. Before: UI **31,951**, builder-core **7,173**, full initial **67,628**. After: **31,069 /
7,196 / 66,818**. UI drops 882, core marginal contribution rises 23 (no core source changes), full
drops 810. The owner authorized one ceiling reset using measured +500, rounded up to 100, subject
to UI 32,000/full 68,500 maxima; all measurements are within those maxima:

| Enforced consumer gate                     |               Measured | New ceiling | Previous ceiling |
| ------------------------------------------ | ---------------------: | ----------: | ---------------: |
| Builder UI initial (excludes builder-core) |                 31,069 |  **31,600** |           29,000 |
| Builder-core marginal initial contribution |                  7,196 |   **7,300** |            7,050 |
| Full initial closure                       |                 66,818 |  **67,400** |           64,613 |
| Standalone builder package                 | reported by size-limit |  **31,600** |           30,000 |
| Bulk planning / Retry closure              |             1,547 each |   **1,750** |              new |
| Data inspector / Retry closure             |               269 each |     **300** |              new |

New lazy ceilings follow rule 4: measured +10%, rounded up to 50, at most 5,000. All earlier lazy
and aggregate ceilings stay unchanged. Independent-entry duplication (deferred union 15,399 →
32,900) is explicitly accepted by the owner; the two additional approved bodies bring the union to
**36,532**, counting each shared output once. The complete measurement and every rejected probe
remain in `docs/reviews/m09b-plus-combined-evidence/`; the failed attempts are not overwritten.

No more byte-hunting probes for the rest of M09b+. Remaining polish must fit these ceilings; new
bodies are lazy by default. No History/diff ships. From M09c onward, each milestone must propose
initial/lazy allowances for explicit owner approval before implementation. This reset is not an
open-ended future budget increase and does not authorize correctness-test changes.

## Approved form-host registry completion — 2026-10-29

The owner approved optional `OurFormElement.themes`, matching existing form-host registry inputs,
and the necessary atomic renderer `setThemes(registry, selectedTheme?)` update. React/Angular
registry changes reuse the mounted session; Element light/shadow instances retain their registry
on reconnect. Preserve values, touched/errors, control identity, focus/caret; unknown names report
`unknown-theme` without fallback. Document/test these additive consequences of the accepted opt-in
design and list them in delivery API additions. All fixed size gates remain unchanged.
