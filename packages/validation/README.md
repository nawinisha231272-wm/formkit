# @ourform/validation

Browser/customer Node validation with no DOM, renderer or external runtime dependency.

```ts
import {
  compileForm,
  validateSubmission,
  toSubmissionSchema,
} from "@ourform/validation";
const result = compileForm(engine, definition); // engine already has models/validators
if (result.ok) {
  const validation = await validateSubmission(result.form, submittedData, {
    providers,
  });
  const schema = toSubmissionSchema(result.form);
}
```

compileForm accepts unknown definitions and returns the engine's CompileResult diagnostics.
validateSubmission returns ValidationResult (valid/errors with path, componentId and FieldError). Supply
server-side providers explicitly; the compiled form retains validator functions, not engine provider
instances. Register equivalent host functions/validators in browser and Node. This API sends nothing.

The boundary rejects unsafe/non-object JSON, unknown keys, malformed scopes, normalization/serialization
coercions, missing visible required fields and forged calculations. Custom serialized data must round-trip
through normalize/serialize. It validates with the same session pipeline, including async rules, then disposes
its temporary session. Provider exceptions fail validation. Providers are trusted host code and own timeouts.

JSON Schema output is Draft 2020-12. Static type/rule/required/option constraints are assertions; conditional
visibility/validation, calculations and custom validators are x-ourform-\* annotations. Use the SDK for those
runtime rules; bare JSON Schema validation does not execute them. Arbitrary adapter domain rules need model
validators and correct jsonSchema hints. No Ajv/runtime code generation dependency is shipped.

See ADR-0008 and the shared good/bad fixtures. Build: pnpm --filter @ourform/validation build.
