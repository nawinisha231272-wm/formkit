/** Reproduce owner evidence against main; expected Playwright PNGs are never modified. */
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { createHash } from "node:crypto";
const require = createRequire(import.meta.url);
const playwright = require.resolve("playwright/package.json", {
  paths: [dirname(require.resolve("@playwright/test/package.json"))],
});
const core = require.resolve("playwright-core/package.json", {
  paths: [dirname(playwright)],
});
const { PNG } = require(join(dirname(core), "lib/utilsBundle.js"));
const root = resolve(import.meta.dirname, "..");
const destination = join(root, "docs/reviews");
const assets = join(destination, "m09b-plus-comparison");
const base = execFileSync(
  "git",
  ["rev-parse", process.argv[2] ?? "origin/main"],
  { cwd: root, encoding: "utf8" },
).trim();
const previous = "7885dcaec4a838c8057391f5ae2dba834c9b81d6";
const escape = (text) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");
const sha = (data) => createHash("sha256").update(data).digest("hex");
const baselineFiles = new Set(
  execFileSync(
    "git",
    ["ls-tree", "-r", "--name-only", base, "tests/e2e/__screenshots__"],
    { cwd: root, encoding: "utf8" },
  )
    .trim()
    .split("\n"),
);
const oldFiles = new Set(
  execFileSync(
    "git",
    ["ls-tree", "-r", "--name-only", previous, "tests/e2e/__screenshots__"],
    { cwd: root, encoding: "utf8" },
  )
    .trim()
    .split("\n"),
);
const gitImage = (ref, file) =>
  execFileSync("git", ["show", `${ref}:${file}`], {
    cwd: root,
    maxBuffer: 30_000_000,
  });
async function files(directory) {
  return (
    await Promise.all(
      (await readdir(directory, { withFileTypes: true })).map((item) =>
        item.isDirectory()
          ? files(join(directory, item.name))
          : join(directory, item.name),
      ),
    )
  ).flat();
}
function reason(file) {
  if (file.includes("builder-review-menus.spec.ts"))
    return [
      "Restored initial menu chrome",
      "Owner review 2026-10-30 item 1; context, component More and header More in all five themes.",
    ];
  if (file.includes("builder-authoring-visual.spec.ts")) {
    if (file.includes("plus-commands"))
      return [
        "Command search presentation",
        "Owner item 3: compact icon/title/location rows and active listbox option.",
      ];
    if (file.includes("plus-bulk-editor"))
      return [
        "Bulk editor title and shared properties",
        "Owner item 4: count/labels title, no duplicate tab heading; ADR-0021 shared-property editing.",
      ];
    return [
      "Selection, inline captions and quick-add",
      "Approved M09b+ authoring shortcuts and ADR-0021; new states absent from main.",
    ];
  }
  if (/builder-(visual|review-visual|round4)\.spec/.test(file))
    return [
      "Builder chrome and Settings polish",
      "Approved M09b+ polish: caption/type chip, fit-content preview, sentence conjunction, header menus, conditional chip and selection placement.",
    ];
  if (/builder-hosts\.spec/.test(file))
    return [
      "Unexplained preview capture changes",
      "Not attributed to an approved polish item. These host Preview captures submit no errors; reviewed Base examples differ in input hover border and subpixel crop/text rasterization. Main and after are shown for explicit owner review.",
    ];
  if (/bootstrap[45]/.test(file))
    return [
      "Help below inputs and single-error text",
      "Approved Bootstrap 4/5 description/help order; one validation error is plain text without a list bullet.",
    ];
  if (/(themes|sdk-extensions|authoring|nullable-boolean)\.spec/.test(file))
    return [
      "Single error without a bullet",
      "Approved single-error paragraph and zero paragraph margin; fixture submits invalid values before capture (source test retained).",
    ];
  return ["UNEXPLAINED", "No approved cause has been mapped to this change."];
}
function comparison(beforeBytes, afterBytes) {
  const before = beforeBytes ? PNG.sync.read(beforeBytes) : undefined;
  const after = PNG.sync.read(afterBytes);
  const width = Math.max(before?.width ?? 0, after.width),
    height = Math.max(before?.height ?? 0, after.height);
  const diff = new PNG({ width, height });
  let count = 0,
    left = width,
    top = height,
    right = 0,
    bottom = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const ai =
        before && x < before.width && y < before.height
          ? (y * before.width + x) * 4
          : -1;
      const bi =
        x < after.width && y < after.height ? (y * after.width + x) * 4 : -1;
      let changed = !before;
      let sum = 0;
      for (let c = 0; c < 4; c++) {
        const av = ai < 0 ? 255 : before.data[ai + c],
          bv = bi < 0 ? 255 : after.data[bi + c];
        if (av !== bv) changed = true;
        if (c < 3) sum += bv;
      }
      if (changed) {
        count++;
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = x;
        bottom = y;
      }
      const gray = Math.round((sum / 3) * 0.2 + 204);
      diff.data[i] = changed ? 225 : gray;
      diff.data[i + 1] = changed ? 28 : gray;
      diff.data[i + 2] = changed ? 75 : gray;
      diff.data[i + 3] = 255;
    }
  return {
    bytes: PNG.sync.write(diff),
    count,
    before: before ? [before.width, before.height] : null,
    after: [after.width, after.height],
    bounds: count ? { left, top, right, bottom } : null,
  };
}
await mkdir(assets, { recursive: true });
const images = [];
for (const path of (await files(join(root, "tests/e2e/__screenshots__")))
  .filter((file) => file.endsWith(".png"))
  .sort()) {
  const file = relative(root, path);
  const after = await readFile(path);
  const before = baselineFiles.has(file) ? gitImage(base, file) : undefined;
  const status = !before
    ? "new"
    : before.equals(after)
      ? "unchanged"
      : "changed";
  const old = oldFiles.has(file) ? gitImage(previous, file) : undefined;
  const sinceReview = !old
    ? "new"
    : old.equals(after)
      ? "unchanged"
      : "changed";
  const row = { file, status, sinceReview, sha256: sha(after) };
  if (status !== "unchanged") {
    const id = sha(Buffer.from(file)).slice(0, 20);
    const [group, explanation] = reason(file);
    const diff = comparison(before, after);
    row.group = group;
    row.explanation = explanation;
    row.pixelAudit = {
      changedPixels: diff.count,
      before: diff.before,
      after: diff.after,
      bounds: diff.bounds,
    };
    row.after = relative(destination, path);
    if (before) {
      row.before = `m09b-plus-comparison/${id}-main.png`;
      await writeFile(join(destination, row.before), before);
    }
    row.diff = `m09b-plus-comparison/${id}-diff.png`;
    await writeFile(join(destination, row.diff), diff.bytes);
  }
  images.push(row);
}
const counts = Object.fromEntries(
  ["changed", "new", "unchanged"].map((name) => [
    name,
    images.filter((row) => row.status === name).length,
  ]),
);
const sinceReviewCounts = Object.fromEntries(
  ["changed", "new", "unchanged"].map((name) => [
    name,
    images.filter((row) => row.sinceReview === name).length,
  ]),
);
const groups = [
  ...new Set(images.flatMap((row) => (row.group ? [row.group] : []))),
];
const unexplained = images.filter(
  (row) => row.group?.startsWith("Unexplained") || row.group === "UNEXPLAINED",
);
const manifest = {
  approval: "pending owner review",
  base,
  previousReview: previous,
  counts,
  sinceReviewCounts,
  groups: Object.fromEntries(
    groups.map((group) => [
      group,
      images.filter((row) => row.group === group).length,
    ]),
  ),
  unexplained: unexplained.map((row) => row.file),
  images,
};
await writeFile(
  join(destination, "m09b-plus-screenshots.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
const panel = (label, url) =>
  `<div><h4>${label}</h4>${url ? `<a href="${url}"><img loading="lazy" src="${url}" alt="${label}"></a>` : '<p class="absent">New state: no image exists in main. Diff highlights the entire addition.</p>'}</div>`;
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>M09b+ owner comparison</title><style>
body{font:16px/1.5 system-ui;margin:24px;color:#172535;background:#f4f6f8}h1,h2,h3,h4{margin:8px 0}a{color:#174fbc}p{max-width:100ch}nav{display:flex;flex-wrap:wrap;gap:12px}article{background:white;border:1px solid #ccd3dd;border-radius:8px;padding:12px;margin:16px 0}article h3{font-size:14px;overflow-wrap:anywhere}.images{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}img{width:100%;height:400px;object-fit:contain;object-position:top;background:#eef1f5}.absent{background:#eef1f5;padding:20px}.note{padding:12px;background:#fff3cc}summary{cursor:pointer}pre{white-space:pre-wrap;overflow-wrap:anywhere}@media(max-width:800px){.images{grid-template-columns:1fr}}section{scroll-margin-top:20px}</style>
<h1>M09b+ — main / after / pixel diff</h1><p class="note">Owner approval pending. Baseline generation and this evidence audit do not constitute approval. Images are unchanged main PNGs, current expected PNGs, and exact pixel differences (red); size changes are padded with white. New states have no invented main baseline.</p>
<p>Main: <code>${base}</code>. Compared with main: <strong>${counts.changed} changed · ${counts.new} new · ${counts.unchanged} unchanged</strong>. Since review 7885dca: ${sinceReviewCounts.changed} changed · ${sinceReviewCounts.new} new · ${sinceReviewCounts.unchanged} unchanged.</p>
<p><a href="http://127.0.0.1:4173/builder.html?approved">Open running builder</a> · <a href="m09b-plus-owner-fixes.md">Measurements/tests</a> · <a href="m09b-plus-screenshots.json">Full hash and pixel audit</a></p>
<h2>Unexplained-change audit (${unexplained.length})</h2>${unexplained.length ? `<p>These changes still require explanation; they are not silently grouped under approved polish.</p><pre>${escape(unexplained.map((row) => row.file).join("\n"))}</pre>` : "<p>No unexplained changes remain after the source and image audit; explanations accompany each group. Owner approval is still required.</p>"}
<nav>${groups.map((group, i) => `<a href="#group-${i}">${escape(group)} (${manifest.groups[group]})</a>`).join("")}</nav>
${groups
  .map(
    (group, i) =>
      `<section id="group-${i}"><h2>${escape(group)} — ${manifest.groups[group]} images</h2>${images
        .filter((row) => row.group === group)
        .map(
          (row) =>
            `<article><h3>${escape(row.file)} · ${row.status}</h3><p>${escape(row.explanation)}</p><div class="images">${panel("Before: main", row.before)}${panel("After: review candidate", row.after)}${panel("Diff: exact changed pixels", row.diff)}</div><details><summary>Pixel audit</summary><pre>${escape(JSON.stringify(row.pixelAudit, null, 2))}</pre></details></article>`,
        )
        .join("")}</section>`,
  )
  .join(
    "",
  )}<h2>Unchanged (${counts.unchanged})</h2><details><summary>Byte-identical main images</summary><pre>${escape(
  images
    .filter((row) => row.status === "unchanged")
    .map((row) => row.file)
    .join("\n"),
)}</pre></details></html>`;
await writeFile(join(destination, "m09b-plus-owner-review.html"), html);
console.log(
  JSON.stringify(
    {
      base,
      counts,
      sinceReviewCounts,
      groups: manifest.groups,
      unexplained: unexplained.length,
    },
    null,
    2,
  ),
);
