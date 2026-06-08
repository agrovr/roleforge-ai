import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const layout = readFileSync("app/layout.tsx", "utf8");
const sitePolish = readFileSync("app/components/SitePolish.tsx", "utf8");
const globals = readFileSync("app/globals.css", "utf8");

test("site polish layer is mounted once in the app shell", () => {
  assert.match(layout, /import \{ SitePolish \}/);
  assert.match(layout, /<SitePolish \/>/);
});

test("site polish layer adds motion and texture without hiding content for reduced motion", () => {
  assert.match(sitePolish, /prefers-reduced-motion: reduce/);
  assert.match(sitePolish, /IntersectionObserver/);
  assert.match(sitePolish, /rf-reveal-disabled/);
  assert.match(sitePolish, /rf-scroll-progress/);
  assert.match(sitePolish, /rf-page-texture/);
  assert.match(globals, /\.rf-scroll-progress/);
  assert.match(globals, /animation-timeline:\s*scroll/);
  assert.match(globals, /\.rf-page-texture/);
  assert.match(globals, /html\.rf-polish-ready \[data-polish-reveal="true"\]/);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test("site polish reveal targets cover public and signed-in product surfaces", () => {
  for (const selector of [
    ".hero-stage",
    ".template-card",
    ".legal-card",
    ".support-request-card",
    ".updates-card",
    ".settings-section",
    ".studio-card",
  ]) {
    assert.match(sitePolish, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
