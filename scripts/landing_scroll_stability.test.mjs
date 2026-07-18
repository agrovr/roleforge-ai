import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globals = readFileSync("app/globals.css", "utf8");
const smoke = readFileSync("scripts/smoke_layout.mjs", "utf8");

const sectionSize = (selector, size) => new RegExp(
  `\\.page-shell > #${selector} \\{ contain-intrinsic-size: auto ${size}px; \\}`,
);

test("landing sections retain offscreen rendering with calibrated desktop space", () => {
  assert.match(globals, /\.page-shell > section:not\(\.hero\),[\s\S]*?content-visibility:\s*auto;[\s\S]*?contain-intrinsic-size:\s*auto 900px;/);
  assert.match(globals, /\/\* Keep the landing scroll range stable while below-the-fold sections are skipped\. \*\//);

  for (const [selector, size] of [
    ["studio", 940],
    ["templates", 690],
    ["features", 920],
    ["pricing", 775],
    ["faq", 755],
    ["final-cta", 530],
  ]) {
    assert.match(globals, sectionSize(selector, size));
  }
});

test("landing intrinsic sizes follow the stacked tablet and mobile layouts", () => {
  assert.match(globals, /@media \(max-width: 900px\) \{[\s\S]*?\.page-shell > #templates \{ contain-intrinsic-size: auto 1330px; \}[\s\S]*?\.page-shell > #pricing \{ contain-intrinsic-size: auto 1300px; \}[\s\S]*?\.page-shell > #final-cta \{ contain-intrinsic-size: auto 520px; \}[\s\S]*?\}/);
  assert.match(globals, /@media \(max-width: 640px\) \{[\s\S]*?\.page-shell > #studio \{ contain-intrinsic-size: auto 1785px; \}[\s\S]*?\.page-shell > #templates \{ contain-intrinsic-size: auto 2430px; \}[\s\S]*?\.page-shell > #pricing \{ contain-intrinsic-size: auto 1620px; \}[\s\S]*?\}/);
  assert.match(globals, /@media \(min-width: 401px\) and \(max-width: 640px\) \{[\s\S]*?\.page-shell > #studio \{ contain-intrinsic-size: auto 1752px; \}[\s\S]*?\.page-shell > #features \{ contain-intrinsic-size: auto 1560px; \}[\s\S]*?\.page-shell > #final-cta \{ contain-intrinsic-size: auto 611px; \}[\s\S]*?\}/);
  assert.match(globals, /@media \(min-width: 600px\) and \(max-width: 640px\) \{[\s\S]*?\.page-shell > #templates \{ contain-intrinsic-size: auto 2371px; \}[\s\S]*?\.page-shell > #final-cta \{ contain-intrinsic-size: auto 518px; \}[\s\S]*?\}/);
  assert.match(globals, /@media \(min-width: 830px\) and \(max-width: 900px\) \{[\s\S]*?\.page-shell > #templates \{ contain-intrinsic-size: auto 1493px; \}[\s\S]*?\}/);
  assert.match(globals, /@media \(min-width: 901px\) and \(max-width: 1100px\) \{[\s\S]*?\.page-shell > #templates \{ contain-intrinsic-size: auto 1548px; \}[\s\S]*?\.page-shell > #features \{ contain-intrinsic-size: auto 904px; \}[\s\S]*?\.page-shell > #final-cta \{ contain-intrinsic-size: auto 454px; \}[\s\S]*?\}/);
});

test("rendered layout smoke guards landing scroll-height and section-position drift", () => {
  assert.match(smoke, /scrollStabilityCheck:\s*\{/);
  assert.match(smoke, /maxDocumentHeightDrift:\s*120/);
  assert.match(smoke, /maxSectionTopDrift:\s*90/);
  assert.match(smoke, /maxSectionHeightDrift:\s*120/);
  assert.match(smoke, /reason:\s*"scroll-height-drift"/);
  assert.match(smoke, /reason:\s*"section-position-drift"/);
  assert.match(smoke, /reason:\s*"section-height-drift"/);
});
