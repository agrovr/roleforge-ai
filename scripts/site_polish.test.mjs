import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { allPublicStyles } from "./style_sources.mjs";

const layout = readFileSync("app/layout.tsx", "utf8");
const sitePolish = readFileSync("app/components/SitePolish.tsx", "utf8");
const globals = `${allPublicStyles}\n${readFileSync("app/settings/settings.css", "utf8")}`;
const adminStyles = readFileSync("app/admin/support/admin-support.css", "utf8");

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
  assert.match(globals, /@keyframes\s+rf-section-reveal/);
  assert.match(globals, /html\.rf-polish-ready \[data-polish-reveal="true"\]\s*\{(?=[^}]*opacity:\s*1)(?=[^}]*transform:\s*none)[^}]*\}/s);
  assert.match(globals, /data-polish-visible="true"\]\s*\{(?=[^}]*animation:\s*rf-section-reveal)[^}]*\}/s);
  assert.doesNotMatch(globals, /data-polish-reveal="true"\]\s*\{[^}]*opacity:\s*0/s);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test("landing information stays immediately visible instead of cascading in", () => {
  for (const selector of [".hero-copy", ".hero-stage", ".feature-card", ".price-card", ".pricing-clarity-grid a", ".step-card"]) {
    assert.doesNotMatch(sitePolish, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.equal((globals.match(/animation:\s*rise-in/g) ?? []).length, 2);
  assert.match(globals, /\.hero-copy\s*\{[^}]*animation:\s*rise-in/s);
  assert.match(globals, /\.hero-stage\s*\{[^}]*animation:\s*rise-in/s);
  assert.doesNotMatch(globals, /\.step,\s*\.feature-card,\s*\.template-card,\s*\.price-card,\s*\.faq-item/);
});

test("site polish reveal targets stay at section level instead of every repeated card", () => {
  for (const selector of [
    ".templates-page-grid",
    ".legal-index",
    ".updates-ledger",
    ".settings-section",
    ".rf-preflight-panel",
    ".export-readiness-panel",
    ".admin-support-list",
  ]) {
    assert.match(sitePolish, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const selector of [".template-card", ".settings-activity-item", ".studio-card", ".admin-support-card", ".suggestion", ".ats-item"]) {
    assert.doesNotMatch(sitePolish, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("offscreen marketing sections can skip paint without changing their measured layout", () => {
  assert.match(globals, /\.page-shell > section:not\(\.hero\)[\s\S]*content-visibility:\s*auto/);
  assert.match(globals, /\.templates-page-shell > \.templates-page-grid\s*\{[^}]*contain-intrinsic-size:\s*auto 1800px/s);
  assert.doesNotMatch(globals, /data-polish-reveal="true"[^}]*will-change:/s);
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

  assert.doesNotMatch(adminStyles, /\.admin-support-card::before/);
  assert.doesNotMatch(adminStyles, /\.admin-support-card::after/);
  assert.match(adminStyles, /\.admin-support-action\.is-pending svg/);
  assert.doesNotMatch(globals, /admin-support-/);

  assert.match(globals, /@keyframes\s+rf-status-flow/);
  assert.match(globals, /prefers-reduced-motion:\s*reduce[\s\S]*rf-studio-stat-fill/);
});
