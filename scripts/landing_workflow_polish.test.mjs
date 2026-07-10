import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globals = readFileSync("app/globals.css", "utf8");
const landing = readFileSync("app/page.tsx", "utf8");

test("landing workflow sections keep their real product structure", () => {
  assert.match(landing, /function HowItWorks\(\)/);
  assert.match(landing, /className="steps"/);
  assert.match(landing, /className="step-num"/);
  assert.match(landing, /function Features\(\)/);
  assert.match(landing, /className="features-grid"/);
  assert.match(landing, /className="feature-card-list"/);
});

test("landing workflow cards stay separated and free of decorative rails", () => {
  assert.match(globals, /\/\* Landing workflow refinement: quiet cards with clear product information\. \*\//);
  assert.match(globals, /\.steps\s*\{(?=[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\))(?=[^}]*gap:\s*16px)(?=[^}]*border:\s*0)(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)[^}]*\}/s);
  assert.match(globals, /\.step\s*\{(?=[^}]*border:\s*1px solid var\(--line\))(?=[^}]*border-radius:\s*var\(--radius-lg\))(?=[^}]*background:\s*var\(--surface\))[^}]*\}/s);
  assert.match(globals, /\.steps::before,\s*\.steps::after,\s*\.step::before,\s*\.step::after,\s*\.feature-card::before,\s*\.feature-card::after\s*\{[^}]*content:\s*none/s);
  assert.doesNotMatch(globals, /--landing-workflow-rail|--landing-workflow-glint/);
});

test("feature cards keep checklists readable without nested pills", () => {
  assert.match(globals, /\.feature-card\s*\{(?=[^}]*position:\s*relative)(?=[^}]*background:\s*var\(--surface\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /\.feature-card-list\s*\{(?=[^}]*padding-top:\s*2px)(?=[^}]*border-top:\s*0)[^}]*\}/s);
  assert.match(globals, /\.feature-card-list\s+li\s*\{(?=[^}]*padding:\s*0)(?=[^}]*border:\s*0)(?=[^}]*background:\s*transparent)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.step,\s*html\[data-theme="dark"\]\s+\.feature-card\s*\{(?=[^}]*background:\s*rgba\(16,\s*22,\s*37,\s*0\.86\))[^}]*\}/s);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.step,[\s\S]*?\.feature-card::after\s*\{[\s\S]*?animation:\s*none;[\s\S]*?transition:\s*none;[\s\S]*?\}/s);
});
