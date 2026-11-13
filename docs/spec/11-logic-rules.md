# 11 — Logic rules

Status: normative for M09c. Visual reference: approved design screen 3 ("Logic").
Packages: `@ourform/schema` (format), `@ourform/core` (engine), `@ourform/validation` (parity),
`@ourform/builder-core` + `@ourform/builder` (Logic mode).

## Goal

Let authors say how one component affects others — "when Customer type changes, if it is Business,
show Company details, require VAT number and set Invoice type" — as data, with no JavaScript in the
form, evaluated identically in the browser and in customer-run Node validation, and shown visually as
rules and a dependency map.

Existing visibleWhen, disabledWhen and calculate (spec 01/03) stay on the legacy root-core path.
Root rules use the pay-for-use **@ourform/core/logic** entry, explicitly registered at createEngine
in browser and customer Node. Root logic without registration fails **missing-logic** (even an empty
declared list); never ignore it. Builder always registers the entry. The execution entry is distinct
from the lazy Logic/map UI; importing root core or SDK must not pull it in. See accepted ADR-0022.

## Format

```json
{
  "logic": [
    {
      "id": "rule_business",
      "name": "Business customers",
      "enabled": true,
      "trigger": { "on": "change", "refs": ["cmp_customer_type"] },
      "when": [
        "and",
        ["eq", { "ref": "cmp_customer_type" }, "business"],
        [
          "or",
          ["eq", { "ref": "cmp_country" }, "US"],
          ["eq", { "ref": "cmp_country" }, "CA"]
        ]
      ],
      "then": [
        { "action": "show", "target": "cmp_company_panel" },
        { "action": "require", "target": "cmp_vat" },
        {
          "action": "setValue",
          "target": "cmp_invoice_type",
          "value": "company"
        }
      ],
      "otherwise": "revert"
    }
  ]
}
```

- `logic` lives at the form root (rules can reference any component by `id`).
- `trigger.on`: `change` (any of `refs` changes; default refs = every ref read by `when`), `load`
  (session start, including loading saved data), `submit` (before validation), `event` (a named event
  emitted by a Button or the host: `{ "on": "event", "name": "lookupCompany" }`).
- `when`: an expression (spec 03). Omitted = always true.
- `then`: ordered list of actions. `otherwise`: `"revert"` (default), `"none"`, or an action list.
- Rows inside repeaters and data grids: a rule whose refs and targets are in the same array scope runs
  per row (`{ "ref" }` resolves within the row, as in spec 03).

### Membership picker (owner correction, 2026-11-10)

The Logic editor's **is one of** picker compiles to an OR of equality checks for M09c, as in the
country example above. The original literal-array example was an owner drafting error. Expr format
and evaluator stay unchanged: arrays are prefix operations. A literal list value, such as a future
`["list", ...]` or `["literal", ...]`, needs a separate explicitly approved spec 03 change and is
**not part of M09c**. Existing `in` still works with an array value obtained through a supported
reference/path or trusted expression; this correction does not change that operator.

## Actions

| Action                 | Fields                               | Kind                                                                                                         |
| ---------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `show` / `hide`        | `target`                             | state                                                                                                        |
| `enable` / `disable`   | `target`                             | state                                                                                                        |
| `require` / `optional` | `target`                             | state                                                                                                        |
| `setReadOnly`          | `target`, `value: boolean`           | state                                                                                                        |
| `setProperty`          | `target`, `property`, `value` (Expr) | state — only properties a model marks `logicSettable` (label, description, placeholder, options, min, max …) |
| `setValue`             | `target`, `value` (Expr)             | value                                                                                                        |
| `clear`                | `target`                             | value                                                                                                        |
| `calculate`            | `target`, `expr`                     | derived value (continuous, like `calculate` in spec 01)                                                      |
| `refreshOptions`       | `target`                             | effect — re-run the target's data source                                                                     |
| `focus`                | `target`                             | effect (browser only)                                                                                        |
| `emit`                 | `name`, `payload` (Expr)             | effect — event to the host app                                                                               |
| `call`                 | `function`, `args`                   | effect — host-registered trusted function (spec 03); never schema code                                       |

Targets are component ids; a container target applies to the whole subtree (show/hide/disable/readOnly).

## Semantics (deterministic, browser = Node)

1. **State actions are derived state, not one-off commands.** After every change, the engine
   recomputes each state property from the rules whose `when` currently holds. Rule list order is the
   precedence: for the same target and property, the later matching rule wins. A component's own
   `visibleWhen` / `disabledWhen` is evaluated first (as an implicit rule at position 0).
2. **Value actions run on the trigger edge.** `setValue` and `clear` run when the trigger fires and
   `when` is true (and, for `otherwise` lists, when it is false). They behave like a user edit
   (dirty, re-validation, dependants re-run) and can be overwritten by the user afterwards.
3. **`otherwise: "revert"`** removes the rule's state contributions when `when` is false and clears
   values the rule set, unless the user has since edited them.
4. **Effects** (`refreshOptions`, `focus`, `emit`, `call`) run once per trigger edge; Node validation
   skips focus/emit and runs call only for functions marked availableInNode. Typed StatePatch effects
   and session triggerLogicEvent bridge trusted host/Button events. An async call starts after its
   patch, cannot mutate the frozen invocation snapshot or silently write results, and is cancelled
   on dispose/destroy. Node submit/validation awaits allowed calls with host-configurable timeout,
   **default 5,000 ms**, returning a diagnostic on expiry; late results cannot publish. Explicit later
   writes are separate transactions. See spec 02 for registration and Node timeout configuration.
5. **Ordering per change:** normalize → calculate → rules (in list order, cascading) → visibility →
   clear-on-hide → validate → one StatePatch (spec 02). A cascade (a `setValue` triggering another rule)
   continues up to depth 10; deeper is a runtime diagnostic and the change stops cascading.
6. **Cycles** (rule A's target feeds rule B whose target feeds A) are compile errors naming every rule
   and component involved. Conflicts (two rules setting the same property on the same target with
   overlapping conditions) are compile warnings shown in the builder.
7. **Hidden by rule** behaves exactly like hidden by `visibleWhen`: excluded from validation,
   `clearOnHide` applies.
8. **Parity (owner correction, 2026-11-11):** load-triggered setValue/clear are one-time initializers,
   editable afterwards like change/event writes. Node never replays or enforces these assignments.
   It does evaluate load-rule derived state from final submitted data. State actions
   (show/hide/enable/disable/require/optional/readOnly/setProperty) are always enforced server-side.
   Non-overridable continuous calculations and submit-triggered assignments are authoritative;
   disagreeing results are rejected. Browser submit runs submit-triggered rules before capturing
   its payload; calculations are already current. No additional canonicalization/effect replay.
   setValue/clear targeting a field whose calculate has allowOverride:false (also the omitted default)
   is a compile error, logic-calculation-conflict, naming rule and field and surfaced in Issues/Logic.
   A root continuous calculate target is likewise protected unless the field explicitly allows overrides. With allowOverride:true, assignments
   are ordinary editable values, not enforced calculations. Node does not infer prior client events;
   canonical/unknown-key checks remain. Acceptance: source A copied to target at load, later source B,
   browser submits target A and Node accepts; a change rule assigning 99 to non-overridable calculate
   2 is rejected at compile. Load state requiredness must still be enforced on final data.

9. **Calculation contributions (owner decision, 2026-11-11):** a field's own calculate is the
   position-zero contribution. Active root calculate actions fold over it in rule order; the last
   active contribution wins. With no active root calculation the field formula applies again.
   Revert must not clear a calculated target to null while a preceding writer exists. The field's
   allowOverride setting applies to the combined result: false (default) is authoritative in Node;
   true permits user overrides and Node does not enforce the derived result. Requiredness, canonical
   types and ordinary validation constraints still apply to the submitted override. Without a field
   formula, keep the existing otherwise/revert behavior: clear the rule-set value unless the user
   edited it afterwards. No new form JSON or extra submission canonicalization.

## Builder: Logic mode (approved screen 3)

- Left: rule list with search, filters (Visibility, Values, Validation, Data), on/off state, "+ New rule".
- Centre: rule editor as stacked blocks **When → If → Then → Otherwise**, each a sentence of pickers:
  field picker (components with type glyph), operator picker filtered by the field's value adapter,
  value picker (options for Select/Radio, typed input otherwise). Match All/Any, nested groups,
  "Write as expression" for the raw compact format. Actions reorder by drag or Alt+arrows.
- "Test this rule": pick sample values; the panel runs the rule in a throwaway session and lists the
  resulting state changes.
- Right: dependency map automatically requested as a **separate lazy entry right after Logic mounts
  and is interactive**. Show a loading pane, keep editing usable, preserve focus and offer reason/Retry
  on failure. Idle preload never fetches the map; only an actual mount triggers it. Built from the compiled graph: sources → targets with the action verb;
  selected rule highlighted; click opens the field or rule; reports cycles, conflicts and unused rules.
- In Build mode: logic badge on driving fields ("Controls 3 fields"), info chip on conditionally shown
  components, Logic tab in the edit dialog listing rules that read or target the component, with
  "Add logic" pre-filling the trigger.
- Every rule edit is a builder-core command (one undo step) emitting JSON Patch.

## Import — post-1.0 backlog, not M09c

All Form.io import is deferred to the **post-1.0 importer backlog** ([backlog](../post-1.0-backlog.md)), including simple/JSON-logic
triggers, property/static-value mappings and the previously proposed narrow helper. No fromFormio
entry or new Form.io converter is delivered in M09c. Existing fromJsonLogic expression conversion
retains its current behavior. Future importers must diagnose unsupported JavaScript/custom actions
without executing them. This resolves the earlier conflict with architecture 00's importer exclusion.

## Acceptance (M09c)

- [ ] Schema, meta-schema and migrations for `logic`; `visibleWhen`/`disabledWhen`/`calculate` compile
      on their existing legacy path with no behaviour change or opt-in requirement (old tests unchanged).
- [ ] Root rules require registered core/logic in browser/Node; missing registration returns missing-logic;
      builder always registers it and no-logic consumers do not import/request its implementation.
- [ ] Engine tests for every action, trigger, precedence, edge vs state semantics, revert, cascade limit,
      cycle and conflict diagnostics, per-row rules in arrays (once M10a arrays exist; until then, objects).
- [ ] Browser and customer Node produce identical state and validation results for all logic fixtures,
      including rejection of forged rule-set values.
- [ ] Logic mode matches approved screen 3 in structure (visual baselines per platform, owner sign-off),
      fully keyboard operable, axe clean, in every builder theme.
- [ ] The dependency map reflects the compiled graph for the onboarding fixture; cycles and conflicts appear.
- [ ] A fresh Codex session builds the "Business customers" rule from the docs alone.

## Accepted M09c delivery gates (owner, 2026-11-10)

**Owner budget approval/tightening, 2026-11-11:** the enabled builder full ceiling is **74,500**;
UI **32,600**, builder-core **8,300**. Enforce an exact matched no-logic form ceiling **28,832**
(immutable main 28,232 +600) and opt-in increment **6,000**. Keep no-logic full 68,500 and every
package/lazy limit. Move rule validation/meta-schema and rule-only hooks to the opt-in path;
ordinary edits and complete validation remain correct. Stop with measured options if the matched
no-logic target cannot be reached without violating either. This supersedes pending-budget wording.

[Milestone](../milestones/M09c.md) and [accepted ADR-0022](../adr/0022-logic-engine-and-authoring-plan.md)
record the delivery order. Root execution is opt-in; legacy path retained; Build badges/chips initial;
Logic/map authoring lazy with automatic post-interactive map request. UI maximum 32,600, builder-core
8,300, **no-logic full 68,500** (≤+826 versus historical full baseline). The actual logic-enabled
consumer/builder closure needs prototype measurement and a proposed numeric ceiling, **owner approved
before shipping**, with expected increment ≤6,000 over a matched no-logic consumer. Never classify a
builder as no-logic when it always registers the entry. Shared chunks count once; report fixtures,
packages, initial/route assets and deltas. Logic/map stay **10,000 each**, runtime-package budgets
unchanged; existing aggregate/Settings/other lazy caps remain. No gate code changes in the plan PR.

Performance acceptance applies separately to both no-logic and legacy-condition/calculation fixtures:
≤1.10 form-edit ratio against immutable merged main at 100/500/1,000 fields, absolute ms and at least
five same-runner alternating production-build pairs. Timing CI remains advisory; delivery GO still
requires ≤10% evidence. Exact rule-evaluation/index/action/writer/write/effect/cascade and existing
processor/patch/render/DOM counts remain hard gates, with zero unrelated rule work. Final five-theme
screenshots/delivery require owner approval; do not pull M09d or Form.io import into this milestone.

### Persistent calculation diagnostics (M09c correctness)

Invalid active root-calculation values retain an `invalid-logic-value` diagnostic across unrelated
edits and block browser submission. Re-evaluate only affected contributions; do not clear the error
because another field changed. Clear the affected error when its contribution recovers/deactivates,
on an allowed explicit override, or on reset. Errors are isolated by target and session. Node still
accepts supplied canonical `allowOverride:true` values because it cannot infer client edit history;
protected calculations remain authoritative and reject invalid/forged results.

### Final M09c remaining-runtime envelope (owner, 2026-11-12)

ADR-0022's final amendment supersedes historical size figures above: UI initial **32,600**,
builder-core **8,300**, enabled builder full **76,200**, matched no-logic form **29,200**, matched
opt-in increment **7,000**. Preserve no-logic full 68,500, package/lazy budgets and ≤1.10 edit ratios.
Record every actual rise and its cause; above any maximum STOP with measured options. These
allowances cover remaining runtime work only; they do not grant later-milestone budgets.
