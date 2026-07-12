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

test("landing process reads as a connected workflow without restoring card dividers", () => {
  assert.match(globals, /\/\* Landing workflow refinement: expressive indexes without a card matrix\. \*\//);
  assert.match(globals, /\.steps\s*\{(?=[^}]*--workflow-track:)(?=[^}]*--workflow-progress:)(?=[^}]*gap:\s*clamp\(18px,\s*2\.4vw,\s*34px\))(?=[^}]*padding:\s*clamp\(14px,\s*2vw,\s*22px\))(?=[^}]*border:\s*0)(?=[^}]*border-radius:\s*28px)(?=[^}]*radial-gradient)[^}]*\}/s);
  assert.match(globals, /\.steps::before,\s*\.steps::after\s*\{(?=[^}]*inset-inline:\s*12\.5%)(?=[^}]*top:\s*clamp\(98px,\s*7vw,\s*105px\))(?=[^}]*height:\s*2px)(?=[^}]*content:\s*"")[^}]*\}/s);
  assert.match(globals, /html\.rf-polish-ready \.steps\[data-polish-reveal="true"\]\[data-polish-visible="true"\]::after\s*\{[^}]*transform:\s*scaleX\(1\)[^}]*\}/s);
  assert.match(globals, /\.step\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) 42px minmax\(0,\s*1fr\))(?=[^}]*grid-template-rows:\s*auto 42px auto auto)(?=[^}]*padding:\s*22px 18px 24px)(?=[^}]*border:\s*0)(?=[^}]*border-radius:\s*18px)(?=[^}]*background:\s*transparent)(?=[^}]*transition:\s*transform 280ms)[^}]*\}/s);
  assert.match(globals, /\.step \+ \.step\s*\{[^}]*border-inline-start:\s*0[^}]*\}/s);
  assert.match(globals, /\.step:hover\s*\{(?=[^}]*background:)(?=[^}]*box-shadow:)(?=[^}]*transform:\s*translateY\(-4px\))[^}]*\}/s);
  assert.match(globals, /\.step:hover \.step-icon\s*\{(?=[^}]*rotate\(-4deg\))(?=[^}]*scale\(1\.05\))[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\] \.step:nth-child\(n\)\s*\{(?=[^}]*border-color:\s*transparent)(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.steps,\s*\.features-grid\s*\{(?=[^}]*grid-template-columns:\s*1fr)(?=[^}]*gap:\s*28px)[^}]*\}[\s\S]*?\.step:nth-child\(n\)\s*\{(?=[^}]*grid-template-columns:\s*36px 36px minmax\(0,\s*1fr\))(?=[^}]*padding:\s*14px 12px)(?=[^}]*border:\s*0)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.steps::before,\s*\.steps::after\s*\{(?=[^}]*inset-inline-start:\s*clamp\(81px,\s*12vw,\s*92px\))(?=[^}]*top:\s*48px)(?=[^}]*bottom:\s*48px)(?=[^}]*width:\s*2px)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.step:nth-child\(n\)\s*\{(?=[^}]*grid-template-columns:\s*32px 34px minmax\(0,\s*1fr\))(?=[^}]*padding:\s*12px 8px)[^}]*\}/s);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.steps::after\s*\{[^}]*transition:\s*none[^}]*\}[\s\S]*?\.steps\[data-polish-reveal="true"\][\s\S]*?transform:\s*none/s);
  assert.doesNotMatch(globals, /--landing-workflow-rail|--landing-workflow-glint/);
});

test("feature index uses responsive spotlights and restrained icon motion", () => {
  assert.match(globals, /\/\* Landing workflow refinement: expressive indexes without a card matrix\. \*\//);
  assert.match(landing, /className="feature-card-heading"/);
  assert.match(landing, /String\(index \+ 1\)\.padStart\(2, "0"\)/);
  assert.match(globals, /\.features-grid\s*\{(?=[^}]*grid-template-columns:\s*repeat\(12,\s*minmax\(0,\s*1fr\)\))(?=[^}]*gap:\s*clamp\(18px,\s*2\.2vw,\s*28px\))[^}]*\}/s);
  assert.match(globals, /\.feature-card:nth-child\(1\),\s*\.feature-card:nth-child\(4\),\s*\.feature-card:nth-child\(5\)\s*\{[^}]*grid-column:\s*span 7[^}]*\}/s);
  assert.match(globals, /\.feature-card:nth-child\(2\),\s*\.feature-card:nth-child\(3\),\s*\.feature-card:nth-child\(6\)\s*\{[^}]*grid-column:\s*span 5[^}]*\}/s);
  assert.match(globals, /\.feature-card\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*44px minmax\(0,\s*1fr\))(?=[^}]*min-height:\s*220px)(?=[^}]*padding:\s*22px 24px 24px)(?=[^}]*border:\s*0)(?=[^}]*border-radius:\s*20px)(?=[^}]*background:\s*transparent)(?=[^}]*transition:\s*transform 260ms)[^}]*\}/s);
  assert.match(globals, /\.feature-card:nth-child\(3n \+ 2\),\s*\.feature-card:nth-child\(3n \+ 3\),\s*\.feature-card:nth-child\(n \+ 4\)\s*\{[^}]*border:\s*0[^}]*\}/s);
  assert.match(globals, /\.feature-card:nth-child\(3n \+ 1\)\s*\{[^}]*radial-gradient[^}]*var\(--accent-soft\)[^}]*\}/s);
  assert.match(globals, /\.feature-card:nth-child\(3n \+ 2\)\s*\{[^}]*radial-gradient[^}]*var\(--sky-soft\)[^}]*\}/s);
  assert.match(globals, /\.feature-card:nth-child\(3n \+ 3\)\s*\{[^}]*radial-gradient[^}]*var\(--coral-soft\)[^}]*\}/s);
  assert.match(globals, /\.feature-card:hover\s*\{(?=[^}]*radial-gradient)(?=[^}]*box-shadow:)(?=[^}]*transform:\s*translateY\(-4px\))[^}]*\}/s);
  assert.match(globals, /\.feature-card:hover \.feature-icon\s*\{(?=[^}]*rotate\(3deg\))(?=[^}]*scale\(1\.05\))[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*1180px\)\s*\{[\s\S]*?\.features-grid\s*\{(?=[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\))(?=[^}]*gap:\s*28px)[^}]*\}[\s\S]*?\.feature-card:nth-child\(n\)\s*\{[^}]*grid-column:\s*auto/s);
  assert.match(globals, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.feature-card:nth-child\(n\)\s*\{(?=[^}]*grid-template-columns:\s*42px minmax\(0,\s*1fr\))(?=[^}]*padding:\s*18px 16px)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.feature-card-list\s*\{[^}]*display:\s*grid[^}]*\}/s);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.feature-card-heading span\s*\{[^}]*transition:\s*none[^}]*\}[\s\S]*?\.feature-card:hover \.feature-card-heading span\s*\{[^}]*transform:\s*none/s);
});
