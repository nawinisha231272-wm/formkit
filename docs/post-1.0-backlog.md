# Post-1.0 backlog

## Form.io importer — deferred by owner, 2026-11-10 (ADR-0022)

Out of M09c and the pre-1.0 product boundary. Future importer planning includes complete form/schema
conversion and the previously proposed narrow logic helper: simple/JSON-logic triggers, property
state actions, static/JSON-logic value actions and unsupported-action diagnostics. No fromFormio or
new Form.io converter ships in M09c. Existing fromJsonLogic expression conversion stays supported.

Never execute imported JavaScript/custom actions. Diagnose unsupported triggers, values and actions;
preserve data-only expressions, stable ids/paths and safe JSON constraints. A future importer needs
its own owner-approved plan/ADRs, size/runtime allowance, mapping/parity tests and migration evidence.
This backlog is not authorization to implement it or an amendment to M09d/M10a/M10b scope.

See [spec 11](spec/11-logic-rules.md), [architecture](spec/00-architecture.md) and
[accepted ADR-0022](adr/0022-logic-engine-and-authoring-plan.md).
