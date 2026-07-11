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

test("site polish keeps ambient depth without global line overlays", () => {
  assert.match(sitePolish, /prefers-reduced-motion: reduce/);
  assert.match(sitePolish, /IntersectionObserver/);
  assert.match(sitePolish, /rf-reveal-disabled/);
  assert.match(sitePolish, /rf-ambient-field/);
  assert.doesNotMatch(sitePolish, /rf-scroll-progress/);
  assert.doesNotMatch(sitePolish, /rf-page-texture/);
  assert.doesNotMatch(globals, /\.rf-scroll-progress/);
  assert.doesNotMatch(globals, /\.rf-page-texture/);
  assert.match(globals, /html\.rf-polish-ready \[data-polish-reveal="true"\]/);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test("landing information stays immediately visible instead of cascading in", () => {
  for (const selector of [".feature-card", ".price-card", ".pricing-clarity-grid a", ".step-card"]) {
    assert.doesNotMatch(sitePolish, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("site polish reveal targets cover public and signed-in product surfaces", () => {
  for (const selector of [
    ".hero-stage",
    ".template-card",
    ".legal-card",
    ".support-request-card",
    ".updates-card",
    ".settings-section",
    ".settings-account-health-card",
    ".settings-activity-item",
    ".rf-preflight-panel",
    ".export-readiness-panel",
    ".studio-card",
    ".admin-support-card",
  ]) {
    assert.match(sitePolish, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("product surface polish adds protected workspace details with reduced-motion safety", () => {
  for (const selector of [
    ".settings-plan-active-card::after",
    ".rf-preflight-item::after",
    ".export-readiness-item::after",
    ".rf-studio-stat-fill",
  ]) {
    assert.match(globals, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.doesNotMatch(globals, /\.admin-support-card::before/);
  assert.doesNotMatch(globals, /\.admin-support-card::after/);
  assert.match(globals, /\.admin-support-action\.is-pending svg/);

  assert.match(globals, /@keyframes\s+rf-status-flow/);
  assert.match(globals, /prefers-reduced-motion:\s*reduce[\s\S]*rf-studio-stat-fill/);
});
