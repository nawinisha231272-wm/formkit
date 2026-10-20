const keys = [
  "processorsPerEdit",
  "domCreatedPerEdit",
  "domReplacedPerEdit",
  "statePatchesPerEdit",
];
/** Exact equality: increases fail; improvements must update the reviewed expectation in the same PR. */
export function checkWorkCounts(expected, edits) {
  if (!expected || !Array.isArray(edits) || edits.length !== 25)
    throw new Error("Expected a stored baseline and exactly 25 edits");
  for (const [index, edit] of edits.entries()) {
    for (const key of keys) {
      if (
        !Number.isSafeInteger(expected[key]) ||
        expected[key] < 0 ||
        !Number.isSafeInteger(edit[key])
      )
        throw new Error(`Invalid work count: ${key}`);
      compare(key, expected[key], edit[key], index);
    }
    if (
      !Number.isSafeInteger(expected.rendersPerStatePatch) ||
      expected.rendersPerStatePatch < 0 ||
      !Array.isArray(edit.rendersPerStatePatch) ||
      edit.rendersPerStatePatch.length !== edit.statePatchesPerEdit
    )
      throw new Error("Invalid per-StatePatch render counts");
    for (const renders of edit.rendersPerStatePatch)
      compare(
        "rendersPerStatePatch",
        expected.rendersPerStatePatch,
        renders,
        index,
      );
  }
}
function compare(key, expected, actual, edit) {
  if (!Number.isSafeInteger(actual) || actual < 0)
    throw new Error(`Invalid work count: ${key}`);
  if (actual !== expected)
    throw new Error(
      `${key} ${actual > expected ? "increased" : "decreased"} at edit ${edit}: ${actual} vs ${expected}. ${actual < expected ? "Update the reviewed count baseline in this PR for an improvement." : "Work-count regression."}`,
    );
}
