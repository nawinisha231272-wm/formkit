# 0004 — M01 runtime semantics

Status: accepted
Date: 2026-10-19
Milestone: M01

## Context

M01 introduces the compile/session contract. The specification leaves expression arities, lifecycle details and the treatment of later capabilities implicit.

## Decision

- `compile(unknown)` returns diagnostics for malformed or unsupported definitions; it does not accept executable schema values. Definition objects are JSON-only, with bounded nesting and node counts. The exported JSON meta-schema describes the full version 1.0 wire format; the runtime additionally checks semantic constraints.
- Each compiled form snapshots its definition/models and exposes frozen records for O(1) id/path lookups. It belongs to the engine that compiled it. Composite expansion, plugin requirements, array scopes and custom validators are diagnosed as unsupported until their milestones.
- M01 paths contain object keys only. Numeric indexes, row objects and row-relative expressions are explicitly rejected until M10; `form.mode` is available and immutable for a session.
- Comparisons with differing types return false, including `neq`. Ordered comparison accepts finite numbers or strings of matching type. Arithmetic accepts finite numbers only and returns null for invalid inputs, non-finite results or zero divisors. Boolean operators return booleans; `if`, `and` and `or` short-circuit. `sum`, `min` and `max` accept numeric arguments or one numeric array; sum of no values is zero, empty min/max is null. `concat` accepts strings only. `empty` recognizes null, blank strings and empty arrays/objects. JSONLogic conversion supports the strict-comparison subset; loose equality and variable fallbacks receive diagnostics. Host functions must declare pure and availableInNode; failures/non-JSON results become null.
- Calculations are processed topologically. An allowed user override lasts until reset or a dependency change. API writes to calculated values are recomputed. Self references in calculations or state conditions produce cycle diagnostics.
- Hidden ancestors hide descendants; disabled ancestors disable descendants. Hidden fields are not validated. Hiding clears by default; reappearance restores a declared default (or the adapter empty value), unless clearOnHide is false.
- Default validation timing is blur. Touch validates in blur/change modes; explicit validate/submit validates regardless of timing and emits a state patch. Validation errors are message keys. Submit validates/serializes the snapshot at invocation, even if the host changes data before its Promise resolves; it sends nothing. A disposed session rejects further mutation.
- All snapshots are frozen (including production) for predictable ownership. Changes retain unrelated object identities. Incoming values and host-produced values are copied before storage. Unknown initial keys are omitted.

## Consequences

The M00 tests move to compile diagnostics, Path[] patches and Promise-based validation while retaining their behavioral assertions. No legacy overload hides the new contract. M02/M03 remain responsible for the renderer lifecycle and complete shell accessibility. The existing DOM view receives state without performing validation.
