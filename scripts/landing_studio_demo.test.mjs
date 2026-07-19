import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const landingPage = readFileSync("app/page.tsx", "utf8");
const demo = readFileSync("app/components/LandingStudioDemo.tsx", "utf8");
const globals = readFileSync("app/globals.css", "utf8");

test("landing studio is isolated as an honest client-side sample", () => {
  assert.match(demo, /^"use client";/);
  assert.match(landingPage, /<LandingStudioDemo[\s\S]*?studioHref=\{studioHref\}[\s\S]*?resumePreview=\{<ResumePreview highlight \/>\}[\s\S]*?\/>/);
  assert.doesNotMatch(demo, /from "\.\/ResumePreview"/);
  assert.match(demo, /Interactive sample: nothing is uploaded, saved, generated, or exported here\./);
  assert.match(demo, /data-demo-view=\{activeView\}/);
  assert.doesNotMatch(demo, /fetch\s*\(/);
  assert.doesNotMatch(demo, /\/tailor|checkout|billing|createObjectURL|download=/i);
});

test("landing studio exposes keyboard-operable sample views and state", () => {
  assert.match(demo, /Try the sample · choose a workspace view/);
  assert.match(demo, /aria-label="Reset interactive sample"/);
  assert.match(demo, /title="Reset interactive sample"/);
  assert.match(demo, /type="button"[\s\S]*?aria-pressed=\{activeView === item\.id\}/);
  assert.match(demo, /aria-label="Sample studio views"/);
  assert.match(demo, /role="status" aria-live="polite"/);
  assert.match(demo, /aria-label="Sample target source"/);
  assert.match(demo, /aria-pressed=\{targetSource === "url"\}/);
  assert.match(demo, /aria-pressed=\{reviewed\}/);
  assert.match(demo, /aria-pressed=\{historyVersion === version\.id\}/);
  assert.match(demo, /data-highlight=\{showHighlights\} aria-hidden="true">\{resumePreview\}<\/div>/);
  assert.match(demo, /href=\{studioHref\}/);
});

test("landing studio interaction remains responsive dark-mode safe and restrained", () => {
  assert.match(globals, /\.dash-demo \.dash-side-item\s*\{(?=[^}]*min-height:\s*44px)(?=[^}]*cursor:\s*pointer)[^}]*\}/s);
  assert.match(globals, /\.dash-demo-tabs\s*\{(?=[^}]*display:\s*none)(?=[^}]*overflow-x:\s*auto)[^}]*\}/s);
  assert.match(globals, /\.dash-demo-tabs button\s*\{(?=[^}]*min-height:\s*44px)[^}]*\}/s);
  assert.match(globals, /\.dash-mock\.dash-demo \.dash-stats\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*1180px\)\s*\{[\s\S]*?\.dash-demo-tabs\s*\{[^}]*display:\s*flex[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.dash-demo-tabs\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\))[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.dash-demo-reset\s*\{(?=[^}]*width:\s*44px)(?=[^}]*min-height:\s*44px)[^}]*\}/s);
  assert.match(globals, /\.dash-demo-content\s*\{(?=[^}]*min-height:\s*386px)[^}]*\}/s);
  assert.match(globals, /\.dash-resume-thumb\[data-highlight="false"\] \.r-hl-good\s*\{(?=[^}]*background:\s*transparent)(?=[^}]*background-image:\s*none)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\] \.dash-demo-tabs button\.active/);
  assert.match(globals, /html\[data-theme="dark"\] \.dash-demo \.dash-side-item\.active \.dash-pill\s*\{(?=[^}]*background:\s*color-mix\(in srgb, currentColor 10%, transparent\))(?=[^}]*color:\s*inherit)[^}]*\}/s);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.dash-demo-content,[\s\S]*?transition:\s*none/s);
});
