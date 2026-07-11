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

test("landing process index adds localized depth without restoring divider rails", () => {
  assert.match(globals, /\/\* Landing workflow refinement: expressive indexes without a card matrix\. \*\//);
  assert.match(globals, /\.steps\s*\{(?=[^}]*gap:\s*clamp\(18px,\s*2\.4vw,\s*34px\))(?=[^}]*padding:\s*clamp\(14px,\s*2vw,\s*22px\))(?=[^}]*border:\s*0)(?=[^}]*border-radius:\s*28px)(?=[^}]*radial-gradient)[^}]*\}/s);
  assert.match(globals, /\.step\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*42px minmax\(0,\s*1fr\))(?=[^}]*padding:\s*22px 18px 24px)(?=[^}]*border:\s*0)(?=[^}]*border-radius:\s*18px)(?=[^}]*background:\s*transparent)(?=[^}]*transition:\s*transform 280ms)[^}]*\}/s);
  assert.match(globals, /\.step \+ \.step\s*\{[^}]*border-inline-start:\s*0[^}]*\}/s);
  assert.match(globals, /\.step:hover\s*\{(?=[^}]*background:)(?=[^}]*box-shadow:)(?=[^}]*transform:\s*translateY\(-4px\))[^}]*\}/s);
  assert.match(globals, /\.step:hover \.step-icon\s*\{(?=[^}]*rotate\(-4deg\))(?=[^}]*scale\(1\.05\))[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.steps,\s*\.features-grid\s*\{(?=[^}]*grid-template-columns:\s*1fr)(?=[^}]*gap:\s*28px)[^}]*\}[\s\S]*?\.step:nth-child\(n\)\s*\{(?=[^}]*grid-template-columns:\s*36px 36px minmax\(0,\s*1fr\))(?=[^}]*padding:\s*14px 12px)(?=[^}]*border:\s*0)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.step:nth-child\(n\)\s*\{(?=[^}]*grid-template-columns:\s*32px 34px minmax\(0,\s*1fr\))(?=[^}]*padding:\s*12px 8px)[^}]*\}/s);
  assert.doesNotMatch(globals, /--landing-workflow-rail|--landing-workflow-glint/);
});

test("feature index uses responsive spotlights and restrained icon motion", () => {
  assert.match(globals, /\/\* Landing workflow refinement: expressive indexes without a card matrix\. \*\//);
  assert.match(globals, /\.features-grid\s*\{(?=[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\))(?=[^}]*gap:\s*clamp\(18px,\s*3vw,\s*34px\) clamp\(24px,\s*4vw,\s*48px\))[^}]*\}/s);
  assert.match(globals, /\.feature-card\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*44px minmax\(0,\s*1fr\))(?=[^}]*padding:\s*16px 18px 18px)(?=[^}]*border:\s*0)(?=[^}]*border-radius:\s*18px)(?=[^}]*background:\s*transparent)(?=[^}]*transition:\s*transform 260ms)[^}]*\}/s);
  assert.match(globals, /\.feature-card:nth-child\(3n \+ 2\),\s*\.feature-card:nth-child\(3n \+ 3\),\s*\.feature-card:nth-child\(n \+ 4\)\s*\{[^}]*border:\s*0[^}]*\}/s);
  assert.match(globals, /\.feature-card:nth-child\(3n \+ 1\)\s*\{[^}]*radial-gradient[^}]*var\(--accent-soft\)[^}]*\}/s);
  assert.match(globals, /\.feature-card:nth-child\(3n \+ 2\)\s*\{[^}]*radial-gradient[^}]*var\(--sky-soft\)[^}]*\}/s);
  assert.match(globals, /\.feature-card:nth-child\(3n \+ 3\)\s*\{[^}]*radial-gradient[^}]*var\(--coral-soft\)[^}]*\}/s);
  assert.match(globals, /\.feature-card:hover\s*\{(?=[^}]*radial-gradient)(?=[^}]*box-shadow:)(?=[^}]*transform:\s*translateY\(-3px\))[^}]*\}/s);
  assert.match(globals, /\.feature-card:hover \.feature-icon\s*\{(?=[^}]*rotate\(3deg\))(?=[^}]*scale\(1\.05\))[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.feature-card:nth-child\(n\)\s*\{(?=[^}]*grid-template-columns:\s*42px minmax\(0,\s*1fr\))(?=[^}]*padding:\s*14px 12px)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.feature-card-list\s*\{[^}]*display:\s*grid[^}]*\}/s);
});
