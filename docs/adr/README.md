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

Proposed: [ADR-0020 — Consumer entry boundaries for the builder loading split](0020-builder-consumer-entry-boundaries.md)
(M09b+; confirms ADR-0018 accounting before split implementation; existing ceilings unchanged).
