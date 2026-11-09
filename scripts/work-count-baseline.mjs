import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
const metrics = [
  "processorsPerEdit",
  "domCreatedPerEdit",
  "domReplacedPerEdit",
  "statePatchesPerEdit",
  "rendersPerStatePatch",
];
/** A count increase cannot be hidden by editing the expectation upward in the same PR. */
export function checkCountBaselineEvolution(previous, current) {
  if (current?.version !== 1 || current.edits !== 25)
    throw new Error("Unsupported count baseline format/workload");
  for (const [fixture, expected] of Object.entries(current.fixtures ?? {}))
    for (const metric of metrics)
      if (!Number.isSafeInteger(expected[metric]) || expected[metric] < 0)
        throw new Error(`Invalid count expectation: ${fixture}/${metric}`);
  if (!previous) return;
  if (previous.version !== current.version || previous.edits !== current.edits)
    throw new Error(
      "Do not change the measured count workload to bypass its baseline",
    );
  for (const [fixture, expected] of Object.entries(previous.fixtures)) {
    if (!current.fixtures[fixture])
      throw new Error(`Cannot remove count fixture ${fixture}`);
    for (const metric of metrics)
      if (current.fixtures[fixture][metric] > expected[metric])
        throw new Error(
          `Cannot increase count baseline ${fixture}/${metric}: ${current.fixtures[fixture][metric]} > ${expected[metric]}`,
        );
  }
}
/** Authoring work is also a deterministic gate; the 500-field workload cannot change in a PR. */
export function checkAuthoringCountBaselineEvolution(previous, current) {
  if (
    current?.version !== 1 ||
    current.fields !== 500 ||
    (previous &&
      (previous.version !== current.version ||
        previous.fields !== current.fields))
  )
    throw new Error("Unsupported authoring count workload");
  const values = (value) => [
    value.indexNodeVisits,
    ...["delete", "move", "required"].flatMap((action) =>
      ["childCommands", "publications", "historyEntries"].map(
        (metric) => value.bulk?.[action]?.[metric],
      ),
    ),
  ];
  const next = values(current);
  if (next.some((value) => !Number.isSafeInteger(value) || value < 0))
    throw new Error("Invalid or missing authoring count expectation");
  if (previous && next.some((value, index) => value > values(previous)[index]))
    throw new Error("Cannot increase authoring count baseline");
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const file = "docs/performance/work-counts.json";
  const reference =
    process.env.OURFORM_COUNT_BASE_REF ||
    (process.env.GITHUB_REF === "refs/heads/main" ? "HEAD^1" : "origin/main");
  if (!/^(?:[a-f0-9]{40}|origin\/main|HEAD\^1)$/.test(reference))
    throw new Error("Invalid count baseline reference");
  execFileSync("git", ["rev-parse", "--verify", `${reference}^{commit}`], {
    stdio: "pipe",
  });
  const exists = execFileSync(
    "git",
    ["ls-tree", "--name-only", reference, "--", file],
    { encoding: "utf8" },
  ).trim();
  const previous = exists
    ? JSON.parse(
        execFileSync("git", ["show", `${reference}:${file}`], {
          encoding: "utf8",
        }),
      )
    : null;
  const current = JSON.parse(readFileSync(file, "utf8"));
  checkCountBaselineEvolution(previous, current);
  const authoringFile = "docs/performance/builder-authoring-counts.json";
  const authoringExists = execFileSync(
    "git",
    ["ls-tree", "--name-only", reference, "--", authoringFile],
    { encoding: "utf8" },
  ).trim();
  const authoringPrevious = authoringExists
    ? JSON.parse(
        execFileSync("git", ["show", `${reference}:${authoringFile}`], {
          encoding: "utf8",
        }),
      )
    : null;
  checkAuthoringCountBaselineEvolution(
    authoringPrevious,
    JSON.parse(readFileSync(authoringFile, "utf8")),
  );
  console.log(
    previous
      ? `Count baseline cannot increase relative to ${reference}; exact measurements follow.`
      : "Initial reviewed count baseline: main has no prior artifact; exact measurements follow.",
  );
}
