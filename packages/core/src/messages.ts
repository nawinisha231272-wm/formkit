export const englishMessages: Readonly<Record<string, string>> = Object.freeze({
  "of.ratingMax": "Number of stars",
  "of.rating.allowHalf": "Allow half stars",
  "of.rating.stars": "{score} of {max} stars",
  "of.required": "{label} is required",
  "of.requiredMarker": "(required)",
  "of.errorSummary": "Please correct these errors",
  "of.errorCount": "{count} {noun} in the form",
  "of.noErrors": "No errors in the form",
  "of.employee.searchPlaceholder": "Search placeholder",
  "of.validation.pending": "Validating…",
  "of.builder.label": "Label",
  "of.builder.description": "Description",
  "of.builder.placeholder": "Placeholder",
  "of.builder.hidden": "Hidden",
  "of.builder.key": "Data key",
  "of.builder.defaultValue": "Default value",
  "of.builder.clearOnHide": "Clear on hide",
  "of.builder.validation.required": "Required",
  "of.builder.validation.minLength": "Minimum length",
  "of.builder.validation.maxLength": "Maximum length",
  "of.builder.validation.pattern": "Pattern",
  "of.builder.validation.min": "Minimum",
  "of.builder.validation.max": "Maximum",
  "of.builder.validation.minItems": "Minimum items",
  "of.builder.validation.maxItems": "Maximum items",
  "of.builder.visibleWhen": "Visible when",
  "of.builder.disabledWhen": "Disabled when",
  "of.builder.layout.width": "Width",
  "of.builder.ariaLabel": "Accessible label",

  "of.validation.required": "{label} is required",
  "of.validation.minLength": "{label} must contain at least {min} characters",
  "of.validation.maxLength": "{label} must contain at most {max} characters",
  "of.validation.min": "{label} must be at least {min}",
  "of.validation.max": "{label} must be at most {max}",
  "of.validation.pattern": "{label} has an invalid format",
  "of.validation.minItems": "{label} must contain at least {min} items",
  "of.validation.maxItems": "{label} allows at most {max} items",
  "of.validation.email": "{label} must be a valid email address",
  "of.validation.option": "Choose an available option for {label}",
  "of.validation.unavailable":
    "Validation is unavailable for {label}. Try again.",
  "of.validation.aborted": "Validation changed for {label}. Submit again.",
  "of.validation.type": "{label} has an invalid value type",
  "of.validation.submission":
    "The submission must contain only safe, known form data",
  "of.validation.calculated": "{label} does not match the calculated value",
  "of.button.submit": "Submit",
  "of.button.reset": "Reset",
  "of.button.custom": "Run action",
  "of.select.placeholder": "Choose an option",
  "of.content.html": "Content",
  "of.options": "Options",
  "of.button.action": "Action",
  "of.button.event": "Event name",
  "of.button.label": "Button text",
});
export function englishMessage(
  key: string,
  params: Record<string, unknown> = {},
): string {
  const values =
    key === "of.errorCount"
      ? { ...params, noun: params.count === 1 ? "error" : "errors" }
      : params;
  return (
    Object.hasOwn(englishMessages, key) ? englishMessages[key]! : key
  ).replace(/\{(\w+)\}/g, (token, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : token,
  );
}
