import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sitePolish = readFileSync("app/components/SitePolish.tsx", "utf8");
const globals = readFileSync("app/globals.css", "utf8");

test("ambient polish field is mounted behind the shared page texture", () => {
  assert.match(sitePolish, /className="rf-ambient-field"/);
  assert.match(globals, /\.rf-ambient-field\s*\{/);
  assert.match(globals, /\.rf-ambient-field span:nth-child\(1\)/);
  assert.match(globals, /\.rf-ambient-field span:nth-child\(2\)/);
  assert.match(globals, /\.rf-ambient-field span:nth-child\(3\)/);
});

test("site depth polish avoids global landing rails while keeping product surfaces consistent", () => {
  assert.doesNotMatch(globals, /\.nav::after\s*\{/);
  assert.doesNotMatch(globals, /:where\(\s*\.section-head,/);
  assert.match(globals, /\.templates-head,[\s\S]*?\.admin-support-hero[\s\S]*?\)::after\s*\{/);
  assert.match(globals, /\.template-card,[\s\S]*?\.admin-support-card[\s\S]*?\)\s*\{/);
  assert.match(globals, /\.template-card,[\s\S]*?\.admin-support-card[\s\S]*?\):hover\s*\{/);
});

test("progress polish and ambient motion respect reduced motion", () => {
  assert.match(globals, /\.dash-progress-track,[\s\S]*?\.dash-resume-progress[\s\S]*?\)::after\s*\{/);
  assert.match(globals, /@keyframes\s+rf-ambient-drift-a/);
  assert.match(globals, /@keyframes\s+rf-ambient-drift-b/);
  assert.match(globals, /@keyframes\s+rf-ambient-drift-c/);
  assert.match(globals, /prefers-reduced-motion:\s*reduce[\s\S]*\.rf-ambient-field span[\s\S]*animation:\s*none/);
});
