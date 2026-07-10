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

test("landing process index removes elevated step cards across breakpoints", () => {
  assert.match(globals, /\/\* Landing workflow refinement: compact indexes instead of elevated cards\. \*\//);
  assert.match(globals, /\.steps,\s*\.features-grid\s*\{[^}]*gap:\s*0[^}]*\}/s);
  assert.match(globals, /\.step\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*42px minmax\(0,\s*1fr\))(?=[^}]*padding:\s*28px 26px 30px)(?=[^}]*border:\s*0)(?=[^}]*border-radius:\s*0)(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)(?=[^}]*transition:\s*none)[^}]*\}/s);
  assert.match(globals, /\.step:hover\s*\{(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)(?=[^}]*transform:\s*none)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.step:nth-child\(n\),\s*html\[data-theme="dark"\]\s+\.step:nth-child\(n\):hover\s*\{(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.step:nth-child\(n\)\s*\{(?=[^}]*grid-template-columns:\s*36px 36px minmax\(0,\s*1fr\))(?=[^}]*padding:\s*22px 2px)(?=[^}]*border-block-start:)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.step:nth-child\(n\)\s*\{(?=[^}]*grid-template-columns:\s*32px 34px minmax\(0,\s*1fr\))(?=[^}]*padding:\s*20px 2px)[^}]*\}/s);
  assert.doesNotMatch(globals, /--landing-workflow-rail|--landing-workflow-glint/);
});

test("feature index removes elevated card chrome and stays compact on phones", () => {
  assert.match(globals, /\/\* Landing workflow refinement: compact indexes instead of elevated cards\. \*\//);
  assert.match(globals, /\.feature-card\s*\{(?=[^}]*padding:\s*30px 32px 32px)(?=[^}]*border:\s*0)(?=[^}]*border-radius:\s*0)(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)(?=[^}]*transition:\s*none)[^}]*\}/s);
  assert.match(globals, /\.feature-card:nth-child\(3n \+ 2\),\s*\.feature-card:nth-child\(3n \+ 3\)\s*\{[^}]*border-inline-start:\s*1px solid var\(--line\)[^}]*\}/s);
  assert.match(globals, /\.feature-card:hover\s*\{(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)(?=[^}]*transform:\s*none)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.feature-card:nth-child\(n\),\s*html\[data-theme="dark"\]\s+\.feature-card:nth-child\(n\):hover\s*\{(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.feature-card:nth-child\(n\)\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*42px minmax\(0,\s*1fr\))(?=[^}]*padding:\s*24px 4px)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.feature-card-list\s*\{[^}]*display:\s*none[^}]*\}/s);
});
