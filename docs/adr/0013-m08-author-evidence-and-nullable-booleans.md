# ADR-0013 — M08 author evidence and nullable boolean semantics

Status: accepted by explicit project-owner decision, 2026-10-20.

A fresh Codex session with no implementation context may satisfy M08's independent-author criterion
using only the guide, CLI and generated project. A human guide-usability pass is moved to M11's tasks
and acceptance criteria. This replaces the earlier human-only restriction; it does not imply that AI
trials constitute human usability testing.

The owner additionally accepts the submitted Yes/No trial from the continued “Build Slider via author
guide” chat as a specific exception. The original report correctly says prior Slider context remained
available: the fresh-session condition FAILS. No earlier trial files were reused and no SDK source or
type declarations were inspected according to the report, but it is not a context-free trial. Preserve
that correction, the author's No comfort verdict, all failed experiments and the owner's acceptance.
Earlier implementing-agent Slider/Color rehearsals are not retroactively independent evidence.

Before freezing SDK 0.x, correct every reported gap. nullableBooleanValue({requiredTrue?:boolean})
returns boolean|null, empty null, with ordinary answers by default (false is a valid required answer).
Consent opts into requiredTrue:true: false/null count as empty, but false is stored/serialized intact.
Optional false/null are valid in either mode; required uses isEmpty, not JavaScript truthiness.
booleanValue remains unchanged. Generated boolean/null JSON Schema enumerates isEmpty over its
finite canonical domain, preserving required parity with Node and session validation.

Editable captions are string properties containing literal text by default. Separate optional message
key string properties opt into translation; unknown keys fall back to the configured literal. This
avoids accidentally translating user text that happens to equal a known catalog key. The guide's typed
example compiles and is tested with real generated editors and four-theme visual/a11y checks.

CLI --help/-h return usage and exit zero without writing anything; invalid generation commands still
fail. The guide documents every ValueAdapter member and all five shell variants. These are final
additions before ADR-0003's freeze inventory is accepted. A GO recommendation requires verification
and resolved findings; owner evidence acceptance alone does not waive a failing correctness check.

M09 nested drag-and-drop and the M10a/M10b roadmap amendments belong to a separate future request.
No slots, Tabs, nested moves, future components or builder features are added by this M08 closure.
