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
  const finishPass = globals.slice(
    globals.indexOf("/* Full-site finish pass: quiet depth and restrained motion. */"),
    globals.indexOf("/* Template gallery polish:"),
  );
  assert.doesNotMatch(globals, /\.nav::after\s*\{/);
  assert.doesNotMatch(globals, /:where\(\s*\.section-head,/);
  assert.match(finishPass, /\.templates-head,[\s\S]*?\.rf-studio-hero[\s\S]*?\)::after\s*\{/);
  assert.match(finishPass, /\.template-card,[\s\S]*?\.export-readiness-item[\s\S]*?\)\s*\{/);
  assert.doesNotMatch(finishPass, /admin-support-(?:hero|card)/);
});

test("progress polish keeps ambient depth static and inexpensive", () => {
  assert.match(globals, /\.dash-progress-track,[\s\S]*?\.dash-resume-progress[\s\S]*?\)::after\s*\{/);
  assert.match(globals, /\.rf-ambient-field span\s*\{[^}]*filter:\s*none/s);
  assert.doesNotMatch(globals, /@keyframes\s+rf-ambient-drift-/);
  assert.doesNotMatch(globals, /\.rf-ambient-field span:nth-child\([^)]*\)\s*\{[^}]*animation:/s);
});
