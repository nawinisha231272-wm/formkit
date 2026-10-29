# Specification index

Normative contracts. Code must match these; change them only together with an ADR.

| File                   | Covers                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 00-architecture.md     | Product boundary, layers, allowed imports, data flow                                                             |
| 01-form-definition.md  | JSON form definition, identity, diagnostics, submission JSON Schema                                              |
| 02-runtime.md          | Engine, compile, session, paths, change processing, validation                                                   |
| 03-expressions.md      | Expression format, evaluator rules, dependencies                                                                 |
| 04-sdk.md              | Component model, properties, defineField, shells, native bridges, plugins; accepted M09d extension/view/kit plan |
| 05-rendering-themes.md | Renderer rules, FieldShell anatomy, themes                                                                       |
| 06-adapters.md         | Vanilla, Web Component, React, Angular                                                                           |
| 07-builder.md          | builder-core commands, property panel, builder UI; accepted M09d kit/editor precedence plan                      |
| 08-licensing.md        | Offline keys, distribution                                                                                       |
| 09-standards.md        | Toolchain, tests, CI, security, versioning                                                                       |
| 10-builder-ux.md       | Approved builder UX, builder themes, Material theme, M09b delivery                                               |
| 11-logic-rules.md      | Logic format, deterministic browser/Node semantics, M09c acceptance                                              |

The owner approved the visual designs on 2026-10-21. References are in
[builder-ux-2026-10-21](../design/builder-ux-2026-10-21/README.md). M09b delivers screens 1, 2 and 5;
M09c delivers screen 3; M10a delivers screen 4. The HTML references are not implementation source.

Milestones with tasks and acceptance criteria: `../milestones/M00.md` … `M12.md`;
M10 is split into [M10a](../milestones/M10a.md) (data structures) and
[M10b](../milestones/M10b.md) (advanced inputs). M11/M12 retain their numbering.

Planned order: **M09b+ → M09c → [M09d](../milestones/M09d.md) → M10a → M10b**.
M09d is accepted with owner amendments, plan only, under [ADR-0019](../adr/0019-extension-and-configuration.md).
Its labeled sections in specs 04/07 describe future APIs; implementation starts only after M09c.
