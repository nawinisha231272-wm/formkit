# ADR-0020 — Consumer entry boundaries for the builder loading split

Current enforcement: the owner-approved 2026-10-30 amendment below supersedes earlier size tables:
**UI 31,800 / builder-core 7,300 / full initial 67,700 / standalone builder 31,600 bytes.**
Earlier measurements, ceilings and rejected probes remain historical evidence.
Status: accepted by the owner, including the explicit 2026-10-28 size reset/lazy bodies and final 2026-10-30 menu allowance
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

## Final M09b+ owner-review allowance — accepted 2026-10-30

The owner approved final consumer ceilings of **31,800 builder UI initial (excludes builder-core)**
and **67,700 full initial closure** Brotli bytes. `9c7f0f4` replaced the styled Menu primitive with
`ofb-action-menu` but removed its CSS without a replacement. Restoring initial menu styles/viewport
positioning, plus the requested delivery polish, accounts for the growth. Context actions/clipboard,
selection, Ctrl/Cmd+K's frame and PointerDrag stay initial. No additional deferral is authorized.
Builder-core stays **7,300**, standalone builder stays **31,600**, and every lazy/aggregate ceiling
is unchanged. These supersede only the UI/full numbers in the historical 2026-10-28 reset table.

The final build's machine-readable size report is the single measurement source used by progress,
the delivery report and PR. Earlier probe/build logs remain historical evidence, clearly labelled;
they are not interchangeable final measurements. No further M09b+ ceiling increase is authorized.

Current-build measurement (2026-10-30): UI **31,784 / 31,800**, builder-core **7,190 / 7,300**,
full initial **67,651 / 67,700** Brotli bytes, independently identical on native and pinned Linux.
Canonical evidence: `docs/reviews/m09b-plus-owner-fixes-evidence/consumer-size.json`.
No code moved into builder-core; marginal compression attribution can change shared bytes.
At this historical checkpoint local verification was blocked by CLI deadline/native navigation failures;
the final November 6 proof below resolves them. The original failures remain recorded
in the owner-fix report. These size passes do not imply a completed milestone or current-head CI.

## Final measurement evidence — 2026-11-06

Full pinned local verify passed: 341 unit / 1,593 browser checks and every size/count gate. Current consumer UI/core/full **31,784 / 7,190 / 67,651**, within **31,800 / 7,300 / 67,700**; standalone builder and all lazy ceilings unchanged. Canonical source: `docs/reviews/m09b-plus-owner-fixes-evidence/consumer-size.json`. No code moved into builder-core. Earlier failed runs and measured probes remain historical; no current-head CI result is claimed before it finishes. Owner delivery review and PR #16 remain open.

## Final pinned follow-up proof — 2026-11-07

The owner authorized narrowly scoped compaction of the redundant-CSP-write fix while retaining every
ceiling. Binding the existing declaration once within the same helper brings UI/core/full to
**31,733 / 7,168 / 67,657**, within **31,800 / 7,300 / 67,700**. The initial rejected guarded
candidate (31,760 / 7,266 / 67,714) remains recorded; this compaction reduces its full closure by 57.
No source moved between packages or lazy boundaries. No additional API, form JSON, runtime dependency,
threshold or deadline change. Standalone builder stays capped at 31,600; lazy ceilings are unchanged.

Full pinned verification **PASS, exit 0**: **341 unit / 1,596 browser / 36 size gates / five runtime
count fixtures**. Non-document source and all 472 baseline PNG hashes match before/after verification.
All 117 focused native checks pass, including the original twelve-field mouse/keyboard tasks in all
three browsers; native WebKit took **9.9 s / 13.4 s** in that focused run. Fresh pinned Linux source
build measurements match native; 142 runtime source files match. Linux six regression/CSP checks
across three browsers and 41 Chromium visual comparisons pass, with no baseline update.

500-field browser indexing: **13.800 ms**, exactly 500 visits, cached reopen. Bulk Delete/Move/Required:
**500 child commands, one publication and one history entry each**. Timings are advisory; the field-drag
report retains its 72.941 ms maximum task rather than hiding it.

Canonical final numeric source: `docs/reviews/m09b-plus-linux-task-evidence/final-consumer-size.json`;
consumer host reports and full logs are alongside it. The older November 6 files and numbers are
historical evidence for pushed head 3bdf034. Its two first-attempt Verify failures remain recorded.
New-head first-attempt CI must pass after push; local PASS does not imply CI PASS. PR #16 stays open
for owner delivery/image review. **Do not merge or start M09c/M09d.**

### Owner review follow-up measurement — 2026-11-09

Same consumer method and unchanged ceilings: **31,746 / 31,800 UI**, **7,209 / 7,300 builder-core**,
**67,699 / 67,700 full initial** Brotli bytes. Delta from `cc05111` **+13 / +41 / +42**. No code was
moved, deferred or relabeled; builder-core source is unchanged and its marginal measurement changes
through compression/chunk accounting. Linux and native values match. Existing lazy budgets remain.
[Owner follow-up](../reviews/m09b-plus-owner-followup.md) retains the original advisory, measured cause,
negative control and production A/B fix results; final verification/CI do not imply merge approval.

Final loading audit (same follow-up): lazy-theme completion also needs the owned announcement
cleanup. Current native UI/core/full **31,730 / 7,223 / 67,726**, full **26 bytes over** the fixed
67,700 ceiling. Earlier 31,746 / 7,209 / 67,699 is a retained pre-theme checkpoint. No ceiling
change, push or new CI. Fifteen focused browser cases pass; targeted announcement/theme bookkeeping
compaction authorization is pending under the owner's no-more-byte-hunting restriction.

Owner compaction approval and result (2026-11-09): behavior-preserving compaction is authorized for
M09b+, removing no CSS rule/selector, ARIA attribute, message or test. Full browser plus menu/selection
visual checks remain mandatory. Share the identical theme focus-restoration callback at the same
success/failure call sites: UI/core/full **31,769 / 7,120 / 67,674**, delta **+39 / −103 / −52** from
the blocked candidate. All fixed ceilings pass. A unique request-object alternative grew full by 50
and exceeded core, so it was discarded. No code moved/deferred, no ceiling or API/JSON change.
See the [compaction ledger](../reviews/m09b-plus-owner-followup.md); full verification/CI are pending.

### Final owner-follow-up local proof — 2026-11-09

Final single measurement set: **31,769 UI / 7,120 builder-core / 67,674 full initial**,
fixed **31,800 / 7,300 / 67,700** ceilings, identical native/pinned Linux; standalone 31,600
and all lazy limits unchanged. Delta from cc05111 **+36 / −48 / +17**. Full pinned verify PASS:
341 unit, 1,605 browser, 36 size and nine runtime count checks; unchanged-source fingerprints.
Linux 15 focused, 50 menu/selection visual and nine completed-loading checks PASS. The kept
shared-focus helper saves 52 full bytes (UI +39/core −103); the growing request-object probe
was discarded. No code moved between packages or deferred, no CSS/selector/ARIA/message removal,
no API/JSON or ceiling change. Only 43 requested host captures changed; 429 unchanged.
Three old stale-loading assertions were corrected explicitly for the owner's requested behavior;
ordinary toast expiry assertions and all deadlines/thresholds remain. Earlier pending/STOP
measurements above are historical. [Canonical proof](../reviews/m09b-plus-owner-followup.md)
records logs, sizes and compactions. PR #16/final report carry immutable first-attempt CI evidence
after push; local PASS does not imply remote success or owner merge approval. Do not merge.

## M09b+ closure and M09c proposal — 2026-11-09

The owner approved M09b+ at `a9899587bd9369589e2cc9729dbc73238c33e7df`; PR #16 merged as
`cd6d0b679027da328da9f5e4f63480437d6c765b` after first-attempt green correctness CI. The final
consumer baseline remains **31,769 UI / 7,120 builder-core / 67,674 full initial** against
**31,800 / 7,300 / 67,700**. Earlier pending/no-merge checkpoints above are historical.
[ADR-0022](0022-logic-engine-and-authoring-plan.md) proposes M09c engine/loading/initial allowances
for owner review. It is not accepted and does not amend these enforced ceilings. Logic/map retain
10,000 each; Logic/JSON/map 28,000 and that union with Settings 36,000 remain unchanged.

## Accepted M09c amendment — owner 2026-11-10 (ADR-0022)

The owner accepted maximums **UI 32,600 / builder-core 8,300 / no-logic full 68,500** (≤+826 versus
historical 67,674). Legacy execution stays root; root-rule runtime opts in through core/logic and
builder always registers it. Actual logic-enabled consumer closures require prototype measurement
and a separately proposed **owner-approved ceiling before shipping**, expected ≤6,000 increment over
matched no-logic. Report actual enabled builder and matched real form consumers without relabeling or
externalizing required code. Historical M09b+ gates/evidence remain; the plan PR changes no size script.
Logic/map 10,000 each, runtime-package and other lazy/aggregate/standalone limits stay unchanged.
The map now auto-loads as a separate request after interactive Logic mount, never idle preload.
See [accepted ADR-0022](0022-logic-engine-and-authoring-plan.md) for replay/effects, 5 s default Node
call timeout/cancellation, no importer, performance gates and delivery stops. Earlier proposed 75,700
and manual map activation are superseded. Do not treat accepted caps as an implementation PASS.
