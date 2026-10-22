# ADR-0016 — Approved builder UX delivery and builder theme contract

Status: accepted for implementation by the owner's 2026-10-21 request.

The attached specifications replace planned spec 10 and add normative spec 11. The owner approved
screens 1–5 on 2026-10-21. Preserve original exported HTML as visual references, never implementation
source. M09b delivers screens 1/2/5 and builder themes; M09c delivers Logic; M10a delivers Table and
screen 4 grid/edit-grid authoring. The old 10-builder-ui.md placeholder is replaced by 10-builder-ux.md.

Builder chrome uses internal accessible primitives, --ofb-\* tokens and per-theme recipes. Theme packages
still import SDK types only and export both form and builder theme descriptors. SDK owns the public
builder-theme contracts/defineBuilderTheme; builder owns their runtime application. Material is a
portable appearance theme, with no Material framework dependency. Neutral is the default chrome for
Base; match-form follows other form themes. Custom/pinned chrome remains independent of the canvas.

Modal edits use a draft and real renderer preview, saving one atomic command; cancel discards the draft.
Drawer edits use debounced edit sessions. Structural rules remain in builder-core, including the new
spec's conflict rename plus diagnostic for cross-scope moves. No renderer/core depends on builder.

Existing compact-expression conditions/calculations support M09b dialog rows. Root logic rules,
triggers/actions/effects/dependency-map UI are M09c; full grid/array authoring is M10a. Future controls
are registered through the palette contract, not hard-coded placeholders. Plan changes ship separately
before implementation. Owner approval of the designs and owner sign-off of implementation screenshots
are distinct evidence. The fresh-session trial uses the M08 author rules; human usability stays in M11.

## Implementation contracts

SDK exports BuilderTheme, BuilderTokens, BuilderPrimitive and defineBuilderTheme additively. Recipes
are per-primitive token overrides, not arbitrary selectors. Descriptors are bounded safe JSON with
CSS delimiter/network-value rejection; theme packages still import SDK types only. Renderer preset
exports provide defaultBuilderThemes alongside defaultThemes, retaining the existing preset exception;
builder resolves/applies chrome per instance. Primitive CSS uses only --ofb-\* appearance values.

Lucide 1.61.0 supplies outline icon data, mounted with the owning document rather than its global
DOM helper ([official package](https://lucide.dev/guide/lucide)). This adds a builder-only runtime
dependency, with named icon imports for tree shaking; no headless package depends on it. Playground
font assets use pinned @fontsource Inter/Roboto 5.3.0 locally, avoiding runtime font services.

The owner's lock clarification replaces the undefined readOnlyKeys-only contract with key/structure/all
levels, matching stable ids or keys; readOnlyKeys remains shorthand for structure. Enforcement belongs
in builder-core across commands/imports and presentation belongs in chrome. The exact scope is spec 10.

Material uses the existing renderer preset exception and receives its own 10 kB gzip package budget,
consistent with each existing theme. No existing budget is raised. Portable CSS preserves shell DOM;
floating labels remain visible for empty controls and accessible names remain native label/legend links.

### Owner clarification: add-and-edit history

The owner chose private modal additions: Save commits one `AddComponent` with the prepared node and
settings (history description “Add Email”); Cancel, Escape and Close discard it without schema events
or history and restore pre-drop selection/focus. Drawer additions commit on drop and later live edits
are separate grouped steps. `openOnAdd:false` commits defaults without opening the editor. Paste,
Duplicate and Wrap never open it. Prepared nodes are snapshotted as safe JSON and checked by core.
Clipboard Paste shares Duplicate's stable-id/reference remapping and scoped key checks, and captures
the source independently of later edits/deletion. Native preview contexts bind per controller so React
hooks act on the private draft while retaining application providers. Existing compact calculation and
conditional expressions remain the only Logic editor format; M09c root rules are not implemented.

Builder production output uses tsup minification and retains source maps. The original 30 kB Brotli
budget stays unchanged; an intermediate unminified workbench exceeded it by 470 bytes. The retained
size report is /tmp/m09b-checkpoint-size.log. Existing correctness, count and screenshot thresholds are
unchanged; production output must pass the same tests.

### Verification and view behavior

Mutation actions produce one command; opening an editor/JSON inspector, Copy and starting/cancelling
Move publish no schema history. Pointer capture and selection remain independent of theme changes.
The outline includes virtual rows for each declared tab/column slot, so keyboard paste can target an
inactive tab or empty column without an application-specific builder extension. Enter on an empty
slot chooses that destination; Enter on a toolbar button activates its action rather than editing
its ancestor. Virtual slot context actions cannot accidentally delete the owning container.

Existing runtime visual tests retain their original crop width, theme font, line height, hover state
and outward-rounded capture height inside the new full-width Preview mode. No old PNG is regenerated
and no pixel threshold changes. The new workbench screenshots are separate approval evidence.
The 500-field Chromium trace is collected by `pnpm benchmark:builder`, isolated from `pnpm verify`;
wall-clock results remain advisory in CI under the owner's performance-gate redesign. The milestone's
50ms requirement still needs actual trace evidence and cannot be passed with an empty trace.

Material also joins the test kit's default theme-selection conformance loop, Tabs and SDK composite/
native checks, and all six hosts' preview images. Demo selectors and author guides expose all five
shipped themes consistently. New Material-only image recording is guarded independently of existing
baseline suites; existing images and comparison tolerances remain unchanged.
