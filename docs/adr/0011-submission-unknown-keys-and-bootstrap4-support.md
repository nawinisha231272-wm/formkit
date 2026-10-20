# 0011 — Submission unknown keys and Bootstrap 4 support

Status: accepted by user decision 2026-10-20  
Date: 2026-10-20  
Scope: validation boundary and 1.0 theme support

## Context

The pre-M08 review left two explicit product questions open. The user resolved both before M08.

## Decision

validateSubmission accepts `unknownKeys: 'reject' | 'strip'`, default 'reject'. Rejection preserves
existing errors and behavior. Strip copies only declared object-scope keys before normalization,
calculations and custom/provider validation. The input is never mutated. Value-adapter-owned objects
and arrays are opaque values and retain their keys subject to that adapter's canonical validation.
Unknown data cannot influence host validators, expressions or required/calculated checks after stripping.

The whole input still passes the bounded safe-JSON inspection before filtering: prototype keys,
non-JSON values, cycles and non-object roots fail in either mode. Declared object scopes must still be
objects. Coercions, missing visible required fields and forged calculations still fail. The result
remains ValidationResult, not a sanitized payload; strip affects validation, not caller serialization.
Generated JSON Schema continues to reject additional properties; bare JSON Schema does not perform
this SDK preprocessing. Hosts using strip must apply their chosen filtering policy when persisting data.
Invalid option strings are programmer errors (TypeError), not submitted-data diagnostics.

Bootstrap 4 is fully supported for 1.0 alongside base, Bootstrap 5 and Tailwind. Every new component
must pass conformance and visual checks in all four themes. Existing framework stylesheet compatibility
versions (4.6.2 and 5.3.8) remain pinned. This does not add a promise that both global framework CSS
files can be loaded together.

## Consequences

Existing callers keep strict rejection. Hosts can explicitly validate extensible envelopes without
allowing unknown scope data into rules/providers. The public options type, README, spec 01/02,
changeset and browser/Node tests ship together. Both questions are removed from Open questions.
