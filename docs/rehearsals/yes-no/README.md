# Owner-accepted Yes/No author trial

The author was Codex trial agent in the continued “Build Slider via author guide” chat. Its fresh-session
condition failed; prior Slider context remained available. The owner explicitly accepts it as an M08
exception (ADR-0013). This is not human review or evidence that the session was fresh.

- [Original report, byte-preserved](original-report.md.txt), including its provenance correction and No comfort verdict.
- [Original component, byte-preserved](original-component.ts.txt).
- [Original notes](original-notes.md).
- [Complete command index](command-index.jsonl.txt), preserving failed help/adapter experiments.
- [Original-file hashes and commits](provenance.json).
- [M08 gate report and correction matrix](../../m08-gate-report.md).

The standalone source/report and full command output remain under
`/Users/dharanesh/Documents/ChatGPT/ourform-toggle-trial-2026-10-20/acme-yes-no/`.
Source/lockfile/24 agent-reviewed baseline commit: 3f694e8; report commit: d0ec4c9.
The corrected executable guide example is apps/docs/examples/yes-no.ts, demonstrated at
`/boolean-authoring.html`; tests/nullable-boolean.test.ts and tests/e2e/nullable-boolean.spec.ts cover
its public helper, canonical validation, schema parity, caption editors and all four themes.
