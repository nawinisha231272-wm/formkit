# ADR-0012 — Protected write restoration and complete author fixtures

Status: accepted for the M08 correction implementation, 2026-10-20. Author-evidence policy is later superseded by ADR-0013; the correction implementation remains accepted.

The AI-assisted Slider rehearsal is not human gate evidence. It exposed a core/UI mismatch: core
ignored protected user writes, but a native range or optimistic input could keep an unstored DOM value.
Controls were forced to duplicate guards and manual restoration. The author guide also omitted
provisioning, full numeric/i18n examples, browser setup, fixture shapes, builder preview assertions
and the exact Linux image command. The user requested these corrections and explicitly authorizes
merging their delivery PR after green CI while keeping M08 open for the human trial report.

Protected user writes now emit one StatePatch naming only the rejected field, with empty changedPaths
and the unchanged data snapshot. They do not normalize, write data, mark dirty, validate or process
dependents. API/default-source writes continue normally. The renderer restores live value/checked
properties even when their VNode descriptions are unchanged, preserving DOM identity and focus.
Existing native bridge guards remain defense in depth. No count baseline or test threshold changes.

The public testing package adds mountComponentBuilder and its Playwright subpath adds
checkPropertyEditors/PropertyEditorCase. The mini builder is a development fixture using existing
builder-core AddComponent/UpdateProperty and metadata-generated editors; M09's full builder commands
and product UI remain out of scope. Each custom property needs an explicit observable preview assertion.

Scaffolds include exact tool provisioning metadata, a browser/axe preview and verification, four
supported themes, and guarded platform-specific visual recording with the pinned official image.
A new customer's first verify captures explicitly unapproved visual evidence when no baseline exists;
it cannot confer visual approval. Explicit fresh-baseline recording/comparison and review remain
necessary. Existing baselines are never automatically replaced and all existing checks stay enforced.

The SDK t(key,params?) signature is unchanged. The guide demonstrates a typed component English catalog
and fallback when the host returns an unknown key. Required/disabled are wire-node settings, while
readOnly is a host/session setting; the existing test-kit types already expressed this correctly.
