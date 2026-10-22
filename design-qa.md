# M09b design QA

Final result: passed

This is implementation QA, not owner approval of the generated screenshots. The owner approved the
source designs on 2026-10-21; implementation screenshot sign-off remains pending.

## Visual truth and captures

Source: `docs/design/builder-ux-2026-10-21/` (unmodified approved HTML/canvas references), with
`/Users/dharanesh/Downloads/OurForm Builder UX.pdf` rendered to
`/tmp/ourform-builder-ux-reference/page-{1,2,5}.png`.
Implementation: `tests/e2e/__screenshots__/darwin-arm64/builder-visual.spec.ts/chromium/`:
`screen-1-neutral-material-drag.png`, `screen-2-neutral-edit-dialog.png`,
`screen-5-theme-comparison.png`, plus the matching-theme and dark/compact full workbench images.

Source pages 1/2: 1800×1200 pixels, normalized to 1440×960 CSS pixels. Source page 5: 1800×1250,
normalized to 1440×1000. Chromium captures use these exact CSS viewports, deviceScaleFactor 1.
No browser frame or device decoration is compared. Full side-by-side comparisons are retained in
`visual-results/m09b-design-qa/comparison-screen-{1,2,5}.png`; focused readable comparisons are
`detail-screen-{1,2,5}.png`. These ignored working artifacts are regenerated from the source pages and
committed implementation PNGs, rather than committed as duplicate binary assets.

States: screen 1 is an actual palette drag into a nested column with selected Email and collapsed
Company details; screen 2 is a generated Email modal with a real invalid input in its private renderer;
screen 5 uses one definition and independent sessions in three form themes, with a live dark compact
Material builder below. The screenshot suite also captures each full matching-theme workbench.

## Findings, fixes and comparison history

| Severity | Earlier finding                                                                                                                    | Fix and post-fix evidence                                                                                                                                                                      |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1       | The demo page scrolled outside the workbench, losing persistent controls.                                                          | Caller-owned demo viewport now bounds the workbench with internal panes. Screen 1 retains the header, palette and outline; browser workbench/task tests cover navigation.                      |
| P2       | Design controls were styled read-only irrespective of their schema state; submit lost its theme selector through an extra wrapper. | Controls are inert with non-mutating callbacks while retaining actual state. Shell-none keeps the original control root. Workbench tests assert the inert property and filled Material submit. |
| P2       | Restyling repeated signal/lock decorations.                                                                                        | Existing decorations are removed before replacement. Workbench regression checks one badge and lock per component.                                                                             |
| P2       | Material layout overrides produced square cards and stretched submit buttons.                                                      | Theme-specific card selectors and button alignment preserve 12px raised cards and content-width pills. Screen 1 and the screen-5 focused comparison show the result.                           |
| P2       | Modal vertical position drifted from the reference.                                                                                | Native dialog uses a 48px top inset. Screen-2 comparison retains the two-pane modal, tab strip, preview-state controls and complete footer.                                                    |
| P2       | The theme gallery's heading selector leaked into SDK headings; its compact builder extended below the capture.                     | Scoped app headings and a bounded 272px scrollable builder. The gallery test asserts its bottom is within 1000px. Browser DOM reports bottom 994.90px and body width 1440px.                   |
| P2       | Outline carets used text glyphs while toolbar icons used the icon set.                                                             | Both use Lucide's actual icon data; final screen-1 capture shows consistent vectors.                                                                                                           |

All these iterations have post-fix full and detail comparisons. Earlier unreviewed screenshots are
retained under `visual-results/m09b-workbench-before-*` and `m09b-before-gallery-fit`. Existing committed
baseline bytes, visual thresholds and correctness assertions were not changed to resolve these issues.

## Required fidelity surfaces

- **Typography:** self-hosted Inter for Neutral and Roboto for Material; consistent compact labels,
  readable hierarchy, no missing font requests. Actual form themes retain their published typography.
- **Layout:** three-pane workbench, header modes/actions, nested active-tab canvas, selected toolbar,
  outline/details, two-pane tabbed modal and three-theme gallery follow the reference structure.
  Persistent controls remain visible; inner panes scroll. Phone widths use the specified read-only form.
- **Tokens and colour:** builder chrome uses `--ofb-*` descriptors/recipes. Selection is accent,
  conditions are info, logic is orange, errors are danger. Stronger boundaries than the light mockup
  are intentional to meet the normative 3:1 requirement; text is checked at 4.5:1 in both modes.
- **Assets:** crisp library Lucide vectors, self-hosted fonts and native form controls; no screenshot
  is used as interactive UI. The source has no photographic/illustrative assets to reproduce.
- **Copy/content:** actual registered components and metadata drive the palette and editor. Future
  Date, grids, Wizard and M09c rule actions from the illustrative mockup are absent rather than fake.
  The fixture has 12 real fields and a custom reference field; errors/dependencies are computed.

## Intentional product constraints and P3 follow-up

The approved drawings illustrate Email options (prefix/suffix/domain suggestions), an API editor tab,
root rule actions, and future components that have no shipped model metadata in M09b. The dialog only
shows supported properties and extra declared groups. The task's Phone is Text. Existing Bootstrap
runtime themes retain their baseline-tested label/error placement, full-width submit and card treatment,
so the gallery is less dense than the illustrative forms; changing these existing appearances is not
part of this builder change. The screen-5 compact builder retains the full working header and scrolls
its canvas internally, unlike the abbreviated drawing. Cosmetic spacing and border differences are
visible in the comparisons and are acceptable within these explicit constraints, subject to owner
review. No actionable P0/P1/P2 remains in the implemented M09b scope.

## Interaction and accessibility checks

Real Pointer Events and keyboard task construction, modal/drawer lifecycle, theme changes during an
active drag, all action routes, native-host context, locks and phone resize have automated coverage.
The gallery browser inspection has no console errors and no horizontal overflow. Its three form
instances preserve independent answers. Axe tests cover gallery and all chrome themes/modes/densities
with dialog open and closed. Full pinned verification and the isolated author exercise are separate
milestone gates; this report does not substitute for either or for owner screenshot approval.

## Implementation checklist

- [x] Full-view and readable detail comparisons at normalized source dimensions.
- [x] Fix and recapture all actionable P0/P1/P2 findings.
- [x] Check typography, rhythm, tokens, vectors and supported copy/content.
- [x] Inspect running gallery bounds and console errors.
- [ ] Record owner approval of implementation screenshots after review.

## Material coverage follow-up

Additional Material-only baseline captures cover both Tabs panels, SDK composite/native controls
and preview output in all six hosts on macOS and Linux. Inspected the Linux composite error state
and React preview capture: floating labels remain readable, errors stay linked beside controls,
tabs expose the active underline, and the Fieldset retains its rounded raised boundary. Existing
main baseline files remain byte-identical. These checks add coverage and are not owner approval.

## Owner review fixes — 2026-10-22

Final result: passed (implementation QA); owner approval remains pending.

Compared the updated screen 1/2/5 captures beside the approved reference at the same normalized
viewports, including readable crops in `visual-results/m09b-owner-review-qa/`. The owner's newer
one-row header and Display requirements supersede the corresponding drawing details. Inspected
sentence rules, the header More menu and the phone preview separately. The header retains its right
aligned actions; palette icons/order, registered layout titles and generated Display controls are
visible. Dialog location includes the tab and column. Conditional rows precede the expression view.

QA caught an initially indistinct read-only fill (equal to the card surface). Material now has a
separate neutral filled token in light/dark/high-contrast modes, with solid boundaries. Token contrast
tests pass in all three modes. The final phone capture shows a visibly distinct fill. Native Pointer
Events were exercised by dragging Email into Column 2, saving and undoing the addition; automated
500-field traces retain the original 50ms ceiling. No actionable P0/P1/P2 remains in this review scope.

Linux captures were generated and compared in the official digest-pinned Playwright 1.56.1 image.
Only seven existing workbench captures and three Material read-only captures per platform changed;
three new review captures per platform supplement them. The hash manifest is
`docs/reviews/m09b-owner-review-baselines.json`. No pixel threshold or size/performance limit changed.
The linked image index is `docs/reviews/m09b-owner-review-2026-10-22.md`. This QA does not mark those
implementation images approved by the owner and does not close M09b.
