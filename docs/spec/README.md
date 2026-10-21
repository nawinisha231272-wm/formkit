# Specification index

Normative contracts. Code must match these; change them only together with an ADR.

| File                   | Covers                                                                    |
| ---------------------- | ------------------------------------------------------------------------- |
| 00-architecture.md     | Product boundary, layers, allowed imports, data flow                      |
| 01-form-definition.md  | JSON form definition, identity, diagnostics, submission JSON Schema       |
| 02-runtime.md          | Engine, compile, session, paths, change processing, validation            |
| 03-expressions.md      | Expression format, evaluator rules, dependencies                          |
| 04-sdk.md              | Component model, properties, defineField, shells, native bridges, plugins |
| 05-rendering-themes.md | Renderer rules, FieldShell anatomy, themes                                |
| 06-adapters.md         | Vanilla, Web Component, React, Angular                                    |
| 07-builder.md          | builder-core commands, property panel, builder UI                         |
| 08-licensing.md        | Offline keys, distribution                                                |
| 09-standards.md        | Toolchain, tests, CI, security, versioning                                |

Spec [10-builder-ui.md](10-builder-ui.md) records the planned M09b replacement for the current harness; M09a implements engine/schema changes only.

Milestones with tasks and acceptance criteria: `../milestones/M00.md` … `M12.md`;
M10 is split into [M10a](../milestones/M10a.md) (data structures) and
[M10b](../milestones/M10b.md) (advanced inputs). M11/M12 retain their numbering.
