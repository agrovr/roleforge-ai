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
