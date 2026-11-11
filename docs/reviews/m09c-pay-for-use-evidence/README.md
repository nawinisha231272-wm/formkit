# Pay-for-use extraction evidence

2026-11-11 checkpoint, based on `dcb7550c7990f57a789b4adc9a3563bd9059c221`, unpublished draft.
The [report](../m09c-pay-for-use.md) distinguishes this foundation from completed M09c.

`cycle-all-gates.json` is the canonical consumer measurement under the approved ceilings.
Its matched consumers include entry source and dependency attribution, with no root-rule metadata
or execution in the no-logic output. `*-consumers.json` retain intermediate/discarded candidates.
`paired-timings.json` preserves all five alternating pairs, against separately built immutable
main `cd6d0b679027da328da9f5e4f63480437d6c765b`. `timing-power.txt` records Low Power Mode off.
Focused logs record build, lint, typecheck and 149 schema/core/validation/size-policy tests.

Reproduce with Node 22.22.3, pinned pnpm 10.10.0, frozen install, `pnpm build`, then
`node scripts/builder-size-gate.mjs`, `pnpm typecheck`, `pnpm lint` and:

```sh
pnpm exec vitest run packages/schema/tests packages/core/tests packages/validation/tests tests/logic-size-policy.test.ts
```

The original [prototype harness](../m09c-prototype-evidence/README.md) documents timing reproduction.
Use the current workspace for the branch build and retain the immutable main archive as baseline;
do not copy branch package outputs into it. Scripts use only loopback HTTP, with no external requests.
Full pinned verify now passes: see `verification.json`, complete log and identical before/after source manifests. Implementation CI remains pending. Historical failed
and intermediate logs remain in the private `.git/ourform-m09c-completion-2026-11-11/` directory.
