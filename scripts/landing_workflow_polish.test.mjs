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

test("landing workflow cards have guided progress and richer surfaces", () => {
  assert.match(globals, /\/\* Landing workflow polish: guided progress rails and richer feature surfaces\. \*\//);
  assert.match(globals, /\/\* Landing workflow finish: clearer progress, depth, and card affordance\. \*\//);
  assert.match(globals, /\.steps,\s*\.features-grid\s*\{(?=[^}]*--landing-workflow-rail:\s*linear-gradient\(90deg,\s*var\(--brand\),\s*var\(--accent\),\s*var\(--sky\)\))(?=[^}]*--landing-workflow-glint:)[^}]*\}/s);
  assert.match(globals, /\.steps\s*\{(?=[^}]*position:\s*relative)(?=[^}]*isolation:\s*isolate)(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /\.steps::before\s*\{(?=[^}]*height:\s*4px)(?=[^}]*background:\s*var\(--landing-workflow-rail\))(?=[^}]*z-index:\s*0)[^}]*\}/s);
  assert.match(globals, /\.step\s*\{(?=[^}]*position:\s*relative)(?=[^}]*z-index:\s*1)(?=[^}]*transition:)[^}]*\}/s);
  assert.match(globals, /\.step::before\s*\{(?=[^}]*background:\s*var\(--landing-workflow-rail\))(?=[^}]*transition:)[^}]*\}/s);
});

test("feature cards have dark-mode and reduced-motion polish", () => {
  assert.match(globals, /\.feature-card\s*\{(?=[^}]*position:\s*relative)(?=[^}]*isolation:\s*isolate)(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /\.feature-card::before\s*\{(?=[^}]*background:\s*var\(--landing-workflow-rail\))(?=[^}]*transition:)[^}]*\}/s);
  assert.match(globals, /\.feature-card::after\s*\{(?=[^}]*var\(--landing-workflow-glint\))(?=[^}]*background-size:\s*180%\s+100%,\s*auto)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.steps\s*\{(?=[^}]*rgba\(14,\s*19,\s*34,\s*0\.92\))[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.feature-card-list\s+li\s*\{(?=[^}]*rgba\(255,\s*247,\s*233,\s*0\.04\))[^}]*\}/s);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.step,[\s\S]*?\.feature-card::after\s*\{[\s\S]*?animation:\s*none;[\s\S]*?transition:\s*none;[\s\S]*?\}/s);
});
