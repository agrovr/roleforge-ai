import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const smokeLayout = readFileSync("scripts/smoke_layout.mjs", "utf8");

test("rendered layout smoke supports targeted page and viewport filters", () => {
  assert.match(smokeLayout, /name === "--page" \|\| name === "--pages"/);
  assert.match(smokeLayout, /name === "--width" \|\| name === "--widths" \|\| name === "--viewport"/);
  assert.match(smokeLayout, /name === "--narrow-desktop-width" \|\| name === "--narrow-desktop-widths"/);
  assert.match(smokeLayout, /PAGE_CHECKS\.filter\(\(pageCheck\) => pageFilters\.has\(pageCheck\.name\.toLowerCase\(\)\)/);
  assert.match(smokeLayout, /const viewportWidths = args\.widths \|\| VIEWPORTS/);
  assert.match(smokeLayout, /const narrowDesktopWidths = args\.narrowDesktopWidths \|\| NARROW_DESKTOP_VIEWPORTS/);
  assert.match(smokeLayout, /anchorClearanceChecks/);
  assert.match(smokeLayout, /anchor-covered-by-sticky-guard/);
  assert.match(smokeLayout, /rule\.minWidth && window\.innerWidth < Number\(rule\.minWidth\)/);
});

test("rendered layout smoke prints progress for long browser passes", () => {
  assert.match(smokeLayout, /console\.log\(`CHECK \$\{pageCheck\.name\} width=\$\{width\}`\)/);
  assert.match(smokeLayout, /console\.log\(`CHECK \$\{pageCheck\.name\} narrow-desktop width=\$\{width\}`\)/);
  assert.match(smokeLayout, /rendered layout smoke passed \$\{checkedPageCount\} pages across \$\{viewportWidths\.length\} responsive widths/);
});

test("rendered layout smoke installs and preflights a real browser session", () => {
  assert.match(smokeLayout, /installBrowserSession\(page\.send, baseUrl, signedInSession\.cookie\)/);
  assert.match(smokeLayout, /await verifySignedInBrowserSession\(page\.send, baseUrl\)/);
  assert.match(smokeLayout, /Signed-in browser session did not open protected Studio/);
  assert.match(smokeLayout, /if \(pageCheck\.requiresAuth\) await ensureSignedInBrowserSession\(\)/);
  assert.doesNotMatch(smokeLayout, /Network\.setExtraHTTPHeaders/);
});

test("rendered layout smoke permits reachable content in intentional horizontal rails", () => {
  assert.match(smokeLayout, /const isInsideReachableHorizontalScroller = \(element\) =>/);
  assert.match(smokeLayout, /\["auto", "scroll", "overlay"\]\.includes\(ancestorStyle\.overflowX\)/);
  assert.match(smokeLayout, /ancestor\.scrollWidth - ancestor\.clientWidth > 3/);
  assert.match(smokeLayout, /!isInsideReachableHorizontalScroller\(element\)/);
});

test("rendered layout smoke rejects observer-polished sections that remain fully transparent", () => {
  assert.match(smokeLayout, /querySelectorAll\('\[data-polish-reveal="true"\]'\)/);
  assert.match(smokeLayout, /opacity\s*<\s*0\.1/);
  assert.match(smokeLayout, /reason:\s*"polish-reveal-hidden"/);
});

test("rendered layout smoke catches clipped and visibly under-filled template papers", () => {
  assert.match(smokeLayout, /documentFillChecks/);
  assert.match(smokeLayout, /\.templates-hero-thumb \.r-doc[^\n]*minFill:\s*0\.72[^\n]*maxFill:\s*0\.95/);
  assert.match(smokeLayout, /reason:\s*"document-content-clipped"/);
  assert.match(smokeLayout, /reason:\s*"document-under-filled"/);
  assert.match(smokeLayout, /reason:\s*"document-over-filled"/);
});

test("rendered layout smoke exercises template filters and their accessible state", () => {
  assert.match(smokeLayout, /async function evaluateTemplateFilters\(send, baseUrl\)/);
  assert.match(smokeLayout, /template-filter-results-mismatch/);
  assert.match(smokeLayout, /template-filter-pressed-count/);
  assert.match(smokeLayout, /template-filter-label-mismatch/);
  assert.match(smokeLayout, /pageChecks\.some\(\(pageCheck\) => pageCheck\.name === "templates"\)/);
});

test("rendered layout smoke exercises the interactive landing Studio sample", () => {
  assert.match(smokeLayout, /async function evaluateLandingStudioDemo\(send, baseUrl\)/);
  assert.match(smokeLayout, /studio-demo-view-mismatch/);
  assert.match(smokeLayout, /studio-demo-suggestion-state-mismatch/);
  assert.match(smokeLayout, /studio-demo-history-state-mismatch/);
  assert.match(smokeLayout, /studio-demo-highlight-state-mismatch/);
  assert.match(smokeLayout, /studio-demo-reset-state-mismatch/);
  assert.match(smokeLayout, /pageChecks\.some\(\(pageCheck\) => pageCheck\.name === "landing"\)/);
});
