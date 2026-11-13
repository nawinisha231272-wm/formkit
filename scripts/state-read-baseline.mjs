const cases = [
  "plain100",
  "plain500",
  "plain1000",
  "legacy100",
  "legacy500",
  "legacy1000",
  "onboarding",
];
/** New metrics are measured on immutable main; later increases/removals cannot edit the budget away. */
export function checkStateReadBaselineEvolution(previous, current) {
  if (
    current?.version !== 1 ||
    current.edits !== 25 ||
    (previous &&
      (previous.version !== current.version ||
        previous.edits !== current.edits))
  )
    throw new Error("Unsupported state-read workload");
  for (const name of cases) {
    const value = current.cases?.[name];
    if (!Number.isSafeInteger(value) || value < 0)
      throw new Error(`Invalid or missing state-read count: ${name}`);
    if (previous && value > previous.cases?.[name])
      throw new Error(`Cannot increase state-read count: ${name}`);
  }
}
