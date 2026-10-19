export function defaultMessage(
  key: string,
  params: Record<string, unknown> = {},
): string {
  if (key === "of.ratingMax") return "Number of stars";
  if (key === "of.rating.allowHalf") return "Allow half stars";
  if (key === "of.rating.stars")
    return `${params.score} of ${params.max} stars`;
  if (key === "of.required") return `${params.label} is required`;
  if (key === "of.requiredMarker") return "(required)";
  if (key === "of.errorSummary") return "Please correct these errors";
  if (key === "of.errorCount")
    return `${params.count} ${params.count === 1 ? "error" : "errors"} in the form`;
  if (key === "of.noErrors") return "No errors in the form";
  if (key === "of.validation.required") return `${params.label} is required`;
  if (key === "of.validation.minLength")
    return `${params.label} must contain at least ${params.min} characters`;
  if (key === "of.validation.maxLength")
    return `${params.label} must contain at most ${params.max} characters`;
  if (key === "of.validation.min")
    return `${params.label} must be at least ${params.min}`;
  if (key === "of.validation.max")
    return `${params.label} must be at most ${params.max}`;
  if (key === "of.validation.pattern")
    return `${params.label} has an invalid format`;
  if (key === "of.validation.minItems")
    return `${params.label} requires at least ${params.min} items`;
  if (key === "of.validation.maxItems")
    return `${params.label} allows at most ${params.max} items`;
  return key;
}
