# 11 — Logic rules

Status: normative for M09c. Visual reference: approved design screen 3 ("Logic").
Packages: `@ourform/schema` (format), `@ourform/core` (engine), `@ourform/validation` (parity),
`@ourform/builder-core` + `@ourform/builder` (Logic mode).

## Goal

Let authors say how one component affects others — "when Customer type changes, if it is Business,
show Company details, require VAT number and set Invoice type" — as data, with no JavaScript in the
form, evaluated identically in the browser and in customer-run Node validation, and shown visually as
rules and a dependency map.

Existing `visibleWhen`, `disabledWhen` and `calculate` (spec 01/03) stay. They are shorthand for
single-target rules and compile into the same engine.

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
        ["in", { "ref": "cmp_country" }, ["US", "CA"]]
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
   skips `focus` and `emit`, and runs `call` only for functions marked `availableInNode`.
5. **Ordering per change:** normalize → calculate → rules (in list order, cascading) → visibility →
   clear-on-hide → validate → one StatePatch (spec 02). A cascade (a `setValue` triggering another rule)
   continues up to depth 10; deeper is a runtime diagnostic and the change stops cascading.
6. **Cycles** (rule A's target feeds rule B whose target feeds A) are compile errors naming every rule
   and component involved. Conflicts (two rules setting the same property on the same target with
   overlapping conditions) are compile warnings shown in the builder.
7. **Hidden by rule** behaves exactly like hidden by `visibleWhen`: excluded from validation,
   `clearOnHide` applies.
8. **Parity:** `validateSubmission` evaluates the same rules on the submitted data (load trigger, then
   final state) so requiredness, visibility and calculated/set values are enforced server-side.
   A submission whose rule-set values disagree with the rules is rejected like a forged calculation.

## Builder: Logic mode (approved screen 3)

- Left: rule list with search, filters (Visibility, Values, Validation, Data), on/off state, "+ New rule".
- Centre: rule editor as stacked blocks **When → If → Then → Otherwise**, each a sentence of pickers:
  field picker (components with type glyph), operator picker filtered by the field's value adapter,
  value picker (options for Select/Radio, typed input otherwise). Match All/Any, nested groups,
  "Write as expression" for the raw compact format. Actions reorder by drag or Alt+arrows.
- "Test this rule": pick sample values; the panel runs the rule in a throwaway session and lists the
  resulting state changes.
- Right: dependency map built from the compiled graph: sources → targets with the action verb;
  selected rule highlighted; click opens the field or rule; reports cycles, conflicts and unused rules.
- In Build mode: logic badge on driving fields ("Controls 3 fields"), info chip on conditionally shown
  components, Logic tab in the edit dialog listing rules that read or target the component, with
  "Add logic" pre-filling the trigger.
- Every rule edit is a builder-core command (one undo step) emitting JSON Patch.

## Import

`fromFormio` maps Form.io component `logic` where possible: simple and JSON-logic triggers → `when`;
property actions (hidden, disabled, required, label …) → state actions; value actions with a static or
JSON-logic value → `setValue`. JavaScript triggers/values and custom actions produce diagnostics
(spec 01 import rules); they are never executed.

## Acceptance (M09c)

- [ ] Schema, meta-schema and migrations for `logic`; `visibleWhen`/`disabledWhen`/`calculate` compile
      into the same engine with no behaviour change (all existing tests pass unchanged).
- [ ] Engine tests for every action, trigger, precedence, edge vs state semantics, revert, cascade limit,
      cycle and conflict diagnostics, per-row rules in arrays (once M10a arrays exist; until then, objects).
- [ ] Browser and customer Node produce identical state and validation results for all logic fixtures,
      including rejection of forged rule-set values.
- [ ] Logic mode matches approved screen 3 in structure (visual baselines per platform, owner sign-off),
      fully keyboard operable, axe clean, in every builder theme.
- [ ] The dependency map reflects the compiled graph for the onboarding fixture; cycles and conflicts appear.
- [ ] A fresh Codex session builds the "Business customers" rule from the docs alone.
