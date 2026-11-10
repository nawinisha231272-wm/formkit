# Architecture decision records

One file per decision that changes a contract: `NNNN-short-title.md`.

Template:

```markdown
# NNNN — Title

Status: proposed | accepted | superseded by NNNN
Date: YYYY-MM-DD
Milestone: MNN

## Context

## Options considered

## Decision

## Consequences
```

Planned: 0001 monorepo tooling (M0), 0002 portable control representation (M2), 0003 SDK 0.x freeze (M8).

Accepted with owner amendments (plan only): [ADR-0019 — Extension and configuration without executable JSON](0019-extension-and-configuration.md)
(M09d; starts only after M09c; no implementation in this change).

Accepted with owner no-growth amendment: [ADR-0020 — Consumer entry boundaries for the builder loading split](0020-builder-consumer-entry-boundaries.md)
(M09b+; opt-in themes, option-B loading, builder-owned ≤29 kB, full initial closure ≤64,613 bytes).

Accepted: [ADR-0021 — Builder selection and command contracts](0021-builder-selection-and-command-contracts.md)
(M09b+; ordered DOM selection, atomic bulk commands, precise quick-add and shared command search).

Accepted with owner amendments on 2026-11-10: [ADR-0022 — Logic engine placement, lazy authoring and M09c allowances](0022-logic-engine-and-authoring-plan.md)
(M09c; pay-for-use core/logic, missing-logic, accepted initial maximums, measured enabled-budget gate, auto-map, replay/effects and post-1.0 import deferral).
