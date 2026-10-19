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

Milestones with tasks and acceptance criteria: `../milestones/M00.md` … `M12.md`.
