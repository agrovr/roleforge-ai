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
  assert.match(globals, /\.steps\s*\{(?=[^}]*gap:\s*clamp\(28px,\s*4vw,\s*58px\))(?=[^}]*border:\s*0)(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)[^}]*\}/s);
  assert.match(globals, /\.step\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*42px minmax\(0,\s*1fr\))(?=[^}]*padding:\s*20px 0 24px)(?=[^}]*border:\s*0)(?=[^}]*border-radius:\s*0)(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)(?=[^}]*transition:\s*none)[^}]*\}/s);
  assert.match(globals, /\.step \+ \.step\s*\{[^}]*border-inline-start:\s*0[^}]*\}/s);
  assert.match(globals, /\.step:hover\s*\{(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)(?=[^}]*transform:\s*none)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.step:nth-child\(n\),\s*html\[data-theme="dark"\]\s+\.step:nth-child\(n\):hover\s*\{(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.steps,\s*\.features-grid\s*\{(?=[^}]*grid-template-columns:\s*1fr)(?=[^}]*gap:\s*28px)[^}]*\}[\s\S]*?\.step:nth-child\(n\)\s*\{(?=[^}]*grid-template-columns:\s*36px 36px minmax\(0,\s*1fr\))(?=[^}]*padding:\s*0 2px)(?=[^}]*border:\s*0)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.step:nth-child\(n\)\s*\{(?=[^}]*grid-template-columns:\s*32px 34px minmax\(0,\s*1fr\))(?=[^}]*padding:\s*0 2px)[^}]*\}/s);
  assert.doesNotMatch(globals, /--landing-workflow-rail|--landing-workflow-glint/);
});

test("feature index uses a two-column whitespace-led list without divider rails", () => {
  assert.match(globals, /\/\* Landing workflow refinement: compact indexes instead of elevated cards\. \*\//);
  assert.match(globals, /\.features-grid\s*\{(?=[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\))(?=[^}]*gap:\s*clamp\(34px,\s*5vw,\s*64px\) clamp\(44px,\s*7vw,\s*88px\))[^}]*\}/s);
  assert.match(globals, /\.feature-card\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*44px minmax\(0,\s*1fr\))(?=[^}]*padding:\s*0)(?=[^}]*border:\s*0)(?=[^}]*border-radius:\s*0)(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)(?=[^}]*transition:\s*none)[^}]*\}/s);
  assert.match(globals, /\.feature-card:nth-child\(3n \+ 2\),\s*\.feature-card:nth-child\(3n \+ 3\),\s*\.feature-card:nth-child\(n \+ 4\)\s*\{[^}]*border:\s*0[^}]*\}/s);
  assert.match(globals, /\.feature-card:hover\s*\{(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)(?=[^}]*transform:\s*none)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.feature-card:nth-child\(n\),\s*html\[data-theme="dark"\]\s+\.feature-card:nth-child\(n\):hover\s*\{(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.feature-card:nth-child\(n\)\s*\{(?=[^}]*grid-template-columns:\s*42px minmax\(0,\s*1fr\))(?=[^}]*padding:\s*0 4px)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.feature-card-list\s*\{[^}]*display:\s*grid[^}]*\}/s);
});
