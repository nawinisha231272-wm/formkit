export function defaultMessage(
  key: string,
  params: Record<string, unknown> = {},
): string {
  if (key === "of.ratingMax") return "Number of stars";
  if (key === "of.rating.allowHalf") return "Allow half stars";
  if (key === "of.rating.stars")
    return `${params.score} of ${params.max} stars`;
  return key;
}
