# ADR-0007 — Phase 0 builder commands and Bootstrap 4

Status: accepted for the M05 implementation; Phase 0 still requires human gate review.

## Decisions

The headless builder exposes AddComponent, UpdateProperty and RemoveComponent. The mini UI is a
list with generated property inputs; drag/drop, moves, duplication, plugin editors and a reusable
builder UI package remain M09. select(id) changes selection with an empty patch and no history entry.

Commands produce RFC 6902 patches against the form definition. Property updates replace the affected
component. Inverses use an internal RestoreSnapshot command and root replacement (path is the empty
string). History keeps before/after definition snapshots and selection; redo replays the successful
snapshot instead of regenerating ids. This guarantees byte-identical JSON including property order,
at O(history × definition size) memory. Bound/compact history before large production builder sessions
in M09. No new runtime dependency is needed.

Invalid commands leave state, selection, history and subscriptions unchanged. Removing a referenced
component produces a dangling-ref warning and leaves an editable draft; preview stops until repaired
or undone. Renaming a key warns stale-path; stable id references remain intact. Ordinary new invalid
references are errors. Already unresolved draft references remain warnings while repairing the draft.
The engine remains strict: it never renders an unresolved draft.

Model properties use properties.<name> in panel keys, preventing collisions with base properties.
Base groups precede new groups, and custom entries merge into existing groups in declaration order.
Validation editors follow the adapter's empty value and JSON Schema type (nullable numbers included).
Metadata visibility evaluates expressions against the component's own configuration: data.<property>
paths or property-name refs. Editors are generic by property kind. Custom editor ids are carried as
metadata only until M09. JSON/expressions use generic JSON text editors.

The builder spec requested hidden/accessibility editors without wire fields for both. Hidden is an
alias for visibleWhen: false; unchecking clears that expression. Setting Hidden intentionally replaces
an existing conditional expression, which remains editable in Visible when. Accessibility uses a new
optional top-level ariaLabel string in the schema. meta remains uninterpreted host metadata. The shared
shell exposes the override through its labelled-by target while keeping the visible label; portable
and native controls share it. Placeholder metadata reaches controlAttributes and native props.
Layout width is authored in JSON; layout sizing remains with later layout milestones.

Schema edits rebuild the mini preview session with current data and reset transient validation and
touched state. Theme/mode changes update the same view and retain complete session/control state.
M09 should reconcile authoring edits with a long-lived preview if that interaction is required.

## Bootstrap versions

At the user's explicit request, ship @ourform/theme-bootstrap4 beside Bootstrap 5. Field groups map to
form-group and labels to col-form-label, with Bootstrap 4 form-control/check/button/error classes.
Compiled scoped fallback CSS and light/dark/high-contrast tokens are included. SDK imports are types
only. The renderer's narrow preset dependency exception in ADR-0005 now includes Bootstrap 4.
The legacy bootstrap alias continues to mean Bootstrap 5; explicit names are bootstrap4 and bootstrap5.

Bootstrap 4.6.2 CSS is a development-only npm alias (bootstrap4); Bootstrap 5.3.8 remains bootstrap.
Each is tested independently. No Bootstrap JavaScript, jQuery or CDN request is loaded by the preset, and no framework runtime
dependency is added. The stylesheet test dependency auto-installs jQuery/Popper peers as development dependencies only. Class references:
[Bootstrap 4 forms](https://getbootstrap.com/docs/4.6/components/forms/) and
[Bootstrap 5 forms](https://getbootstrap.com/docs/5.3/forms/overview/).
Bootstrap 4 is a compatibility theme; this project does not maintain its upstream framework.

## Offline evidence

On macOS, sh scripts/verify-offline.sh uses sandbox-exec to deny all network operations to builds and
subprocesses. An outbound TCP probe must receive EPERM/EACCES before uncached package builds run.
Toolchain/dependencies must already be cached/installed; npm installation without a cache is not claimed.
Browser tests go offline after local assets load, then edit/add native controls, switch themes, validate
and submit. No licensing integration or service is configured in Phase 0.

Turbo cannot spawn package jobs under this macOS network-denial policy. The offline proof runs the same 19 package build scripts directly through pnpm in dependency order, bypassing Turbo and its cache. Normal pnpm verify still tests the standard Turbo pipeline.
