# @ourform/components

Text, Number, Checkbox and Rating, authored entirely on the public SDK with no external runtime dependencies.
Exports: textField, numberField, checkboxField and ratingField. Register each .model on an engine and
put .views in the renderer's per-form view map.

Text is a string input, Number is number|null (zero is valid), Checkbox is boolean and Rating is number|null.
An unset Rating is null and fails required validation. Rating's properties are typed `{ max: number,
allowHalf: boolean }`, defaulting to 5 and false. max is constrained to 1–10; half-star mode adds half-step
buttons. Metadata generates the same property editors used by the playground; no Rating editor is handwritten.

Controls spread shared a11y/state attributes, report blur/value changes and expose focus refs. They render
with h() and update in place through the keyed renderer. Full shell semantics and themes arrive in M03.
See ADR-0002 for the measured renderer choice and the 29-meaningful-line Rating definition.

Use the playground's “Try all four SDK controls” link (`/?sdk`) for Number/Checkbox along with feedback.
`/sdk-probe.html` is a development-only automated test page for lifecycle and framework embedding.

## M06 Tier 1

builtinFields is the frozen shared registration list used by every adapter: Text, Textarea, Number,
Email, Password, Checkbox, Radio, Select, Hidden, Content, Button, plus the existing Rating.
New named exports: textareaField, emailField, passwordField, hiddenField, radioField, selectField,
contentField, buttonField and sanitizeContent. Static choices have options metadata with unique nonempty
string values. Email/options domain rules run in the headless validator registry. Radio uses a group shell.
Hidden remains submitted/validated data; conditional invisibility is a separate concept.

Content/Button are non-value defineDisplay controls. Button properties action/text/event select submit,
reset or a host custom action. Content's html property is converted to an allow-listed VNode subset
(p/strong/em/b/i/ul/ol/li/br/a/code/pre/span), never written as raw HTML. Only safe anchor href/title are
retained, with explicit http/https/mailto/tel protocols. Active embedded subtrees/events/styles/media are
dropped. Source/nesting limits are 100,000 characters/64 levels. sanitizeContent returns a safe VNode,
not a sanitized HTML string for arbitrary HTML sinks. See ADR-0008 for details and limits.
