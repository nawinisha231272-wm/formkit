# M09c — competing calculation decision recorded

2026-11-11. The owner's load-initializer decision is implemented and its focused parity tests pass.
This is a separate remaining contract combination, not a request to restore load authority or add
client canonicalization.

One field declares `calculate: {expr: 2, allowOverride: false}`. A root rule conditionally runs
`{action: "calculate", target: "target", expr: 3}` while Source is Yes. Both are currently accepted.
The browser starts at 3. Changing Source to No makes default otherwise/revert clear the prior root
value to null; browser submit succeeds with null. Node evaluates the still-active legacy calculation
and rejects the submitted null with `calculated` (expects 2).

[Exact definition/results](m09c-calculation-conflict-evidence/results.json) and
[public-API reproduction](m09c-calculation-conflict-evidence/repro.mjs.txt). Pinned Node 22.22.3;
no alternate evaluator, mutated input, effect replay or network provider.

The owner explicitly required compile errors for setValue/clear into protected calculated fields.
That does not decide how a second continuous calculate action interacts with the existing legacy
formula. Spec 11 also requires otherwise/revert clearing, calculation authority and browser/Node
parity. We must decide the authoring contract before changing this accepted definition's behavior.

Propose rejecting the competing root calculate at compile with logic-calculation-conflict naming
the root rule and protected field. Alternatively, explicitly allow the root formula to override the
legacy formula and define fallback to the legacy calculation when the root condition stops matching.
No new wire format or extra submit canonicalization is proposed. Existing contracts/tests/ceilings
stay unchanged while this question is pending. AGENTS.md requires recording/asking on ambiguous
contracts; the dependent behavior is paused for this decision.

## Owner decision — accepted 2026-11-11

Option 2: field formula is position zero, active root formulas fold over it in rule order; latest
active wins and no active root falls back to the field formula. Revert never clears while a preceding
writer exists. The field allowOverride applies to the combined result: false authoritative, true
user-overridable and not enforced in Node. With no own field formula keep existing otherwise/revert.
The earlier reject-at-compile recommendation was not accepted. The dependent pause above is historical;
implementation resumes with the four required active/inactive/override/forgery parity regressions.
