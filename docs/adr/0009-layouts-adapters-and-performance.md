# ADR-0009 — Layouts, adapter synchronization and performance gate

Status: accepted. Date: 2026-10-19. Milestone: M07.

## Decisions

SDK defineLayout composes the existing metadata validation/freezing helpers into a non-value,
kind=layout descriptor. It exposes a declarative LayoutView (tag div/section/fieldset and optional
columns), with dataScope none/object. Layout children remain independent renderer units. The renderer
owns their mounting and appends them to the layout root after its heading/description, so updating a
parent's shell never rebuilds child controls. This small contract avoids an arbitrary DOM slot or
HTML-string API. Panel is a named section, Fieldset uses a legend, Columns is a transparent 12-track
grid, and Container creates an object scope. Children default to span 12; node.layout.width chooses
1–12. At viewport widths up to 640px columns stack in document order. Layout styles live in the base
preset, inherited by all four themes including Bootstrap 4 and 5, with no framework JS dependency.

builtinFields retains its M06 value/display list for compatibility. builtinLayouts and builtinComponents
are new exports; adapters and the builder install builtinComponents. Advanced hosts still supply their
own registry explicitly. Layouts have generated builder metadata, with no layout-specific edit panel.
Static SSR uses exactly the same layout shells and escaped child output as DOM rendering. It remains
portable-only SSR: native Angular/React controls are not server-rendered. Client mount replaces server
markup and installs fresh listeners/session state; this is an explicit remount, not hydration.

FormView.reset(data?) now clears summary/submitted state and queued blur work before resetting the
session. Every controller/adapter imperative reset delegates to it. Headless session.reset retains
its existing headless role. Controlled data stays a full snapshot, diffed at compiled value leaves;
echoes are no-ops and controls retain identity. React/Angular examples now expose controlled and
uncontrolled variants of the same realistic 40-value customer onboarding form. Read-only continues
to rebuild with current data, as documented in ADR-0006; theme and data updates retain controls.

Custom elements observe schema/data JSON attributes and theme/read-only attributes. Property objects
remain available for schema/data/engine/fields and custom Theme objects. String themes and readOnly
reflect to theme/read-only; boolean attributes use normal presence semantics. Attribute JSON parse or
compile failures dispatch a composed of-error event rather than escaping an attribute callback.
Malformed attribute JSON does not replace the current form. No URL loading or network behavior is added.
Disconnect disposes listeners and preserves current data for reconnect.

The playground's onboarding page is rendered on the server by a Vite HTML transform using the built
packages. Its production HTML works with JS disabled; the client remounts it and the production preview
is tested after all networking is disabled. This gate proves local editing/validation/submission/reset
and theme changes without a backend or licensing service. It does not implement commercial licensing.

## Performance measurement

The benchmarks app mounts 100/500/1,000 actual Text controls, with 25 calculated dependents on the first
field. It measures compile, mount plus forced layout, 25 edits plus forced layout, and two mode changes
plus forced layout. Each count has three warm-ups and 15 measured samples; stored values are medians.
Count, focused input identity, cleanup and exactly 650 affected processor executions are also asserted.
A separate single-worker Chromium Playwright invocation records or checks the baseline. The comparator
rejects any 500-field metric exceeding the stored median by more than 20%, including in pnpm verify and
CI. Invalid/missing metrics fail. Tests independently prove the exact 20% boundary and rejection above it.

The report records platform, browser, sample count and timestamp. Absolute timings depend on hardware,
OS, browser version, CPU load and power state; use an idle foreground runner and review baseline changes
as measured artifacts. The initial baseline is local macOS evidence; a remote Linux run is not claimed.
A baseline update requires an explicit benchmark:record run and review, never an automatic update on
check failure. Grid/repeater benchmarks remain with M10; this milestone has no row execution.

No new external runtime dependency is introduced.

Host model compatibility also checks kind and dataScope, not only value normalization identity.
Two non-value layouts with the same type but conflicting object/transparent scopes are rejected.

Schema/appearance attribute updates retain the previous valid property when validation fails. Removing
schema clears the mounted controller and markup; setting it again remounts with retained data. Initial
connection failures also emit of-error. Named div layouts expose role=group so their accessible name
is valid; named sections and fieldsets use their native semantics.
