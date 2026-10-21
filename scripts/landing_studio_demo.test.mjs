import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { landingStylesForAssertions } from "./style_sources.mjs";

const landingPage = readFileSync("app/page.tsx", "utf8");
const demo = readFileSync("app/components/LandingStudioDemo.tsx", "utf8");
const deferredDemo = readFileSync("app/components/DeferredLandingStudioDemo.tsx", "utf8");
const globals = landingStylesForAssertions;

test("landing studio is isolated as an honest client-side sample", () => {
  assert.match(demo, /^"use client";/);
  assert.match(landingPage, /<DeferredLandingStudioDemo[\s\S]*?studioHref=\{studioHref\}[\s\S]*?resumePreview=\{<ResumePreview highlight \/>\}[\s\S]*?\/>/);
  assert.doesNotMatch(demo, /from "\.\/ResumePreview"/);
  assert.match(demo, /Interactive sample: nothing is uploaded, saved, generated, or exported here\./);
  assert.match(demo, /data-demo-view=\{activeView\}/);
  assert.doesNotMatch(demo, /fetch\s*\(/);
  assert.doesNotMatch(demo, /\/tailor|checkout|billing|createObjectURL|download=/i);
});

test("landing studio defers its client bundle until the section approaches", () => {
  assert.match(deferredDemo, /^"use client";/);
  assert.match(deferredDemo, /dynamic\([\s\S]*?import\("\.\/LandingStudioDemo"\)[\s\S]*?ssr:\s*false/);
  assert.match(deferredDemo, /new IntersectionObserver\([\s\S]*?window\.matchMedia\("\(max-width: 640px\)"\)\.matches[\s\S]*?\? "1300px 0px"[\s\S]*?: "600px 0px"/);
  assert.match(deferredDemo, /const observerTarget = root\.closest\("#studio"\) \?\? root/);
  assert.match(deferredDemo, /observer\.observe\(observerTarget\)/);
  assert.match(deferredDemo, /window\.location\.hash === "#studio"/);
  assert.match(deferredDemo, /window\.addEventListener\("hashchange", handleHashChange\)/);
  assert.match(deferredDemo, /className="dash-demo-placeholder-body" role="status"/);
  assert.match(deferredDemo, /Preparing the interactive workspace/);
  assert.match(globals, /\.dash-demo-placeholder-body\s*\{(?=[^}]*min-height:\s*720px)(?=[^}]*place-items:\s*center)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.dash-demo-placeholder-body\s*\{[^}]*min-height:\s*clamp\(1360px, calc\(1565px - 32vw\), 1465px\)[^}]*\}/s);
  assert.match(globals, /\.page-shell > section:not\(\.hero\)\s*\{(?=[^}]*content-visibility:\s*auto)[^}]*\}/s);
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

test("landing studio preserves the heavy resume preview across sample view switches", () => {
  assert.match(demo, /const ResumeDemoContent = memo\(function ResumeDemoContent/);
  assert.match(demo, /className="dash-demo-resume-panel"[\s\S]*?data-hidden=\{activeView !== "resume"\}[\s\S]*?aria-hidden=\{activeView !== "resume"\}[\s\S]*?inert=\{activeView === "resume" \? undefined : true\}/);
  assert.match(demo, /<ResumeDemoContent[\s\S]*?resumePreview=\{resumePreview\}[\s\S]*?\/>/);
  assert.doesNotMatch(demo, /className="dash-demo-content" key=\{activeView\}/);
  assert.doesNotMatch(demo, /\{activeView === "resume" \? \(/);
  assert.match(globals, /\.dash-demo-resume-panel\s*\{(?=[^}]*display:\s*grid)(?=[^}]*gap:\s*18px)[^}]*\}/s);
  assert.match(globals, /\.dash-demo-resume-panel\[data-hidden="true"\]\s*\{(?=[^}]*height:\s*0)(?=[^}]*content-visibility:\s*hidden)(?=[^}]*contain-intrinsic-size:\s*0 0)(?=[^}]*pointer-events:\s*none)[^}]*\}/s);
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
  assert.match(globals, /\.dash-resume-thumb\s*\{(?=[^}]*position:\s*relative)(?=[^}]*display:\s*grid)(?=[^}]*place-items:\s*center)(?=[^}]*height:\s*280px)(?=[^}]*overflow:\s*hidden)[^}]*\}/s);
  assert.match(globals, /\.dash-resume-thumb \.r-doc\s*\{(?=[^}]*position:\s*absolute)(?=[^}]*width:\s*340px)(?=[^}]*height:\s*auto)(?=[^}]*aspect-ratio:\s*8\.5\s*\/\s*11)(?=[^}]*transform:\s*scale\(0\.54\))(?=[^}]*transform-origin:\s*center)[^}]*\}/s);
  assert.match(globals, /@container\s+dash-resume-card\s*\(max-width:\s*520px\)\s*\{[\s\S]*?\.dash-resume-thumb\s*\{(?=[^}]*height:\s*280px)(?=[^}]*border-right:\s*0)(?=[^}]*border-bottom:\s*1px solid var\(--line\))[^}]*\}/s);
  assert.match(globals, /\.dash-resume-thumb\[data-highlight="false"\] \.r-hl-good\s*\{(?=[^}]*background:\s*transparent)(?=[^}]*background-image:\s*none)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\] \.dash-demo-tabs button\.active/);
  assert.match(globals, /html\[data-theme="dark"\] \.dash-demo \.dash-side-item\.active \.dash-pill\s*\{(?=[^}]*background:\s*color-mix\(in srgb, currentColor 10%, transparent\))(?=[^}]*color:\s*inherit)[^}]*\}/s);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.dash-demo-content,[\s\S]*?transition:\s*none/s);
});
