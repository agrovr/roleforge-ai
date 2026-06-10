import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appPage = readFileSync("app/app/page.tsx", "utf8");
const globals = readFileSync("app/globals.css", "utf8");
const sectionStart = globals.indexOf("/* Studio preview finish:");
assert.notEqual(sectionStart, -1, "studio preview finish section is missing");
const section = globals.slice(sectionStart);

test("studio preview markup keeps the review desk surfaces available", () => {
  assert.match(appPage, /className="rf-preview-wrap"/);
  assert.match(appPage, /className="rf-preview-status"/);
  assert.match(appPage, /className=\{previewMode === "tailored" \? "active" : ""\}/);
  assert.match(appPage, /className="rf-resume-paper rf-resume-paper-diff"/);
  assert.match(appPage, /className="rf-preview-empty-steps"/);
});

test("studio preview tabs get a compact animated command rail", () => {
  assert.match(section, /\.rf-live-card\s+\.studio-tabs-mini\s*\{(?=[^}]*position:\s*relative)(?=[^}]*isolation:\s*isolate)(?=[^}]*overflow:\s*hidden)(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(section, /\.rf-live-card\s+\.studio-tabs-mini::before\s*\{(?=[^}]*height:\s*1px)(?=[^}]*linear-gradient\(90deg,\s*transparent,\s*color-mix\(in srgb,\s*var\(--brand\) 52%)(?=[^}]*opacity:\s*0\.72)[^}]*\}/s);
  assert.match(section, /\.rf-live-card\s+\.studio-tabs-mini\s+button\s*\{(?=[^}]*position:\s*relative)(?=[^}]*overflow:\s*hidden)(?=[^}]*transition:)[^}]*\}/s);
  assert.match(section, /\.rf-live-card\s+\.studio-tabs-mini\s+button:hover,\s*\.rf-live-card\s+\.studio-tabs-mini\s+button:focus-visible\s*\{(?=[^}]*transform:\s*translateY\(-1px\))(?=[^}]*border-color:)[^}]*\}/s);
  assert.match(section, /\.rf-live-card\s+\.studio-tabs-mini\s+button\.active\s*\{(?=[^}]*radial-gradient\(circle at 18% 0%)(?=[^}]*box-shadow:)[^}]*\}/s);
});

test("studio preview status and paper surfaces have layered review polish", () => {
  assert.match(section, /\.rf-preview-wrap::after\s*\{(?=[^}]*position:\s*absolute)(?=[^}]*border:\s*1px solid)(?=[^}]*pointer-events:\s*none)[^}]*\}/s);
  assert.match(section, /\.rf-preview-status\s+span,\s*\.rf-preview-alert\s*\{(?=[^}]*position:\s*relative)(?=[^}]*overflow:\s*hidden)(?=[^}]*padding-inline-start:\s*14px)(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(section, /\.rf-preview-status\s+span::before,\s*\.rf-preview-alert::before\s*\{(?=[^}]*width:\s*3px)(?=[^}]*linear-gradient\(180deg,\s*var\(--accent\),\s*var\(--good\)\))[^}]*\}/s);
  assert.match(section, /\.rf-resume-paper\s*\{(?=[^}]*isolation:\s*isolate)(?=[^}]*background-size:\s*26px 26px,\s*26px 26px,\s*auto,\s*auto)(?=[^}]*scrollbar-color:)[^}]*\}/s);
  assert.match(section, /\.rf-resume-paper::before\s*\{(?=[^}]*height:\s*3px)(?=[^}]*rgba\(191,\s*107,\s*44,\s*0\.46\))[^}]*\}/s);
  assert.match(section, /\.rf-resume-paper\s+>\s+\*\s*\{(?=[^}]*position:\s*relative)(?=[^}]*z-index:\s*1)[^}]*\}/s);
});

test("studio preview readiness and diff cards have rails across themes", () => {
  assert.match(section, /\.rf-preview-empty-steps\s+span,\s*\.rf-diff-readiness\s+span,\s*\.rf-resume-change-list\s+li,\s*\.rf-diff-column\s*\{(?=[^}]*position:\s*relative)(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(section, /\.rf-preview-empty-steps\s+span::before,\s*\.rf-diff-readiness\s+span::before,\s*\.rf-resume-change-list\s+li::before,\s*\.rf-diff-column::before\s*\{(?=[^}]*width:\s*3px)(?=[^}]*linear-gradient\(180deg,\s*rgba\(191,\s*107,\s*44,\s*0\.52\))[^}]*\}/s);
  assert.match(section, /html\[data-theme="dark"\]\s+\.rf-live-card\s+\.studio-tabs-mini\s*\{(?=[^}]*rgba\(255,\s*247,\s*233,\s*0\.14\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(section, /html\[data-theme="dark"\]\s+\.rf-live-card\s+\.studio-tabs-mini\s+button\.active\s*\{(?=[^}]*color:\s*#fff7e9)[^}]*\}/s);
  assert.match(section, /html\[data-theme="dark"\]\s+\.rf-preview-wrap::after\s*\{(?=[^}]*rgba\(255,\s*247,\s*233,\s*0\.07\))(?=[^}]*opacity:\s*0\.64)[^}]*\}/s);
  assert.match(section, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.rf-live-card\s+\.studio-tabs-mini\s+button,[\s\S]*?\.rf-preview-alert\s*\{(?=[^}]*animation:\s*none)(?=[^}]*transition:\s*none)[^}]*\}/s);
});
