import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("app/page.tsx", "utf8");
const preview = readFileSync("app/components/ResumePreview.tsx", "utf8");
const templates = readFileSync("app/lib/resumeTemplates.ts", "utf8");
const stylesheet = readFileSync("app/globals.css", "utf8");

test("landing templates come from the real catalog instead of a duplicate mock list", () => {
  assert.match(page, /import \{ RESUME_TEMPLATES \} from "\.\/lib\/resumeTemplates"/);
  assert.match(page, /RESUME_TEMPLATES\.filter\(\(template\) => template\.featured\)/);
  assert.match(page, /aria-label="Featured resume templates"/);
  assert.doesNotMatch(page, /\["Classic",\s*"General roles"/);
  assert.doesNotMatch(page, /borderTopColor/);
});

test("template catalog includes a researched default and role-based choices", () => {
  assert.match(templates, /name:\s*"Essential"[\s\S]*?recommended:\s*true/);
  assert.match(templates, /name:\s*"Professional"/);
  assert.match(templates, /name:\s*"Technical"/);
  assert.match(templates, /slug:\s*"student"[\s\S]*?name:\s*"Early Career"/);
  assert.match(templates, /name:\s*"Leadership"/);
  assert.match(templates, /name:\s*"Studio"/);
  assert.match(templates, /name:\s*"Career Pivot"/);
  assert.match(templates, /name:\s*"Academic"/);
  assert.match(templates, /name:\s*"Impact"/);
  assert.match(templates, /previewRole:\s*"Product Operations Manager"/);
});

test("resume previews expose complete role-specific document structures", () => {
  assert.match(preview, /variant === "technical"/);
  assert.match(preview, /variant === "student"/);
  assert.match(preview, /variant === "executive"/);
  assert.match(preview, /variant === "hybrid"/);
  assert.match(preview, /variant === "academic"/);
  assert.match(preview, /variant === "impact"/);
  assert.match(preview, /title:\s*"Projects"/);
  assert.match(preview, /title:\s*"Education"/);
  assert.match(page, /role=\{template\.previewRole\}/);
  assert.match(stylesheet, /\.template-thumb,\s*\.settings-template-thumb\s*\{(?=[^}]*aspect-ratio:\s*8\.5\s*\/\s*11)(?=[^}]*height:\s*auto)(?=[^}]*overflow:\s*hidden)[^}]*\}/s);
  assert.match(stylesheet, /\.template-thumb \.r-doc,\s*\.settings-template-thumb \.r-doc\s*\{(?=[^}]*aspect-ratio:\s*8\.5\s*\/\s*11)(?=[^}]*height:\s*auto)[^}]*\}/s);
});

test("featured gallery removes the horizontal rail and document rule clutter", () => {
  assert.match(stylesheet, /\.templates-row\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\))(?=[^}]*overflow:\s*visible)(?=[^}]*scroll-snap-type:\s*none)[^}]*\}/s);
  assert.match(stylesheet, /\.template-card\s*\{(?=[^}]*border:\s*0)(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)[^}]*\}/s);
  assert.match(stylesheet, /\.templates-head::after,[\s\S]*?\.r-section-title::after\s*\{[^}]*content:\s*none;/s);
  assert.match(stylesheet, /\.r-section-title\s*\{(?=[^}]*border:\s*0)(?=[^}]*padding:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.templates-row\s*\{[^}]*grid-template-columns:\s*1fr/s);
});
