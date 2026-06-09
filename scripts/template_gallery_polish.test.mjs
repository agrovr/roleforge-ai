import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globals = readFileSync("app/globals.css", "utf8");
const templatesPage = readFileSync("app/templates/page.tsx", "utf8");
const sectionStart = globals.indexOf("/* Template gallery polish:");
assert.notEqual(sectionStart, -1, "template gallery polish section is missing");
const section = globals.slice(sectionStart);

test("templates hero renders the selected template as a real preview", () => {
  assert.match(templatesPage, /import \{ ResumePreview \} from "\.\.\/components\/ResumePreview"/);
  assert.match(templatesPage, /className="templates-page-hero-copy"/);
  assert.match(templatesPage, /className="templates-hero-preview"/);
  assert.match(templatesPage, /aria-label=\{`\$\{selectedTemplate\.name\} template preview`\}/);
  assert.match(templatesPage, /<strong>\{selectedTemplate\.name\}<\/strong>/);
  assert.match(templatesPage, /className="template-thumb templates-hero-thumb"/);
  assert.match(templatesPage, /variant=\{selectedTemplate\.variant\}/);
  assert.match(templatesPage, /name=\{selectedTemplate\.previewName\}/);
  assert.match(templatesPage, /highlight/);
});

test("template gallery polish defines selected-direction rails and layered surfaces", () => {
  assert.match(section, /\.templates-page-shell\s*\{(?=[^}]*--template-gallery-rail:\s*linear-gradient\(180deg,\s*var\(--brand\),\s*var\(--accent\),\s*var\(--sky\)\))(?=[^}]*--template-gallery-wash:)[^}]*\}/s);
  assert.match(section, /\.templates-selection-status::after,\s*\.templates-hero-preview::after,\s*\.templates-fit-guide article::after,\s*\.templates-decision-guide::after,\s*\.templates-page-card::after\s*\{(?=[^}]*background:\s*var\(--template-gallery-rail\))(?=[^}]*opacity:\s*0\.54)[^}]*\}/s);
  assert.match(section, /\.templates-selection-status,\s*\.templates-fit-guide article,\s*\.templates-decision-guide,\s*\.templates-guide-card,\s*\.templates-page-card\s*\{(?=[^}]*radial-gradient\(circle at 100% 0%)(?=[^}]*box-shadow:)[^}]*\}/s);
});

test("template gallery cards and decision options get tactile selected states", () => {
  assert.match(section, /\.templates-guide-option::before\s*\{(?=[^}]*transition:\s*opacity 170ms ease)(?=[^}]*opacity:\s*0)[^}]*\}/s);
  assert.match(section, /\.templates-guide-option:hover::before,\s*\.templates-guide-option:focus-visible::before,\s*\.templates-guide-option\.selected::before\s*\{(?=[^}]*opacity:\s*1)[^}]*\}/s);
  assert.match(section, /\.templates-page-card\.selected\s*\{(?=[^}]*0 28px 64px -40px)(?=[^}]*0 0 0 4px)[^}]*\}/s);
  assert.match(section, /\.template-select-button\.selected\s*\{(?=[^}]*box-shadow:)[^}]*\}/s);
});

test("template gallery preview paper stack respects dark mode and reduced motion", () => {
  assert.match(section, /\.template-thumb::before\s*\{(?=[^}]*transform:\s*rotate\(-2\.5deg\) translateY\(4px\))(?=[^}]*opacity:\s*0\.7)[^}]*\}/s);
  assert.match(section, /\.template-thumb \.r-doc\s*\{(?=[^}]*transition:)(?=[^}]*transform-origin:\s*center top)[^}]*\}/s);
  assert.match(section, /\.templates-page-card:hover \.template-thumb \.r-doc,\s*\.templates-page-card:focus-within \.template-thumb \.r-doc\s*\{(?=[^}]*transform:\s*translateY\(-3px\) rotate\(0\.45deg\))[^}]*\}/s);
  assert.match(section, /html\[data-theme="dark"\]\s+\.templates-page-shell\s*\{(?=[^}]*--template-gallery-rail:\s*linear-gradient\(180deg,\s*#f3c16d,\s*#8fdac8,\s*#b9c7ff\))[^}]*\}/s);
  assert.match(section, /html\[data-theme="dark"\]\s+\.templates-page-card\.selected\s*\{(?=[^}]*border-color:\s*rgba\(243,\s*193,\s*109,\s*0\.56\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(section, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.templates-page-card,[\s\S]*?\.templates-hero-preview,[\s\S]*?\.template-thumb \.r-doc\s*\{[^}]*transition:\s*none;[\s\S]*?\.templates-page-card:hover \.template-thumb \.r-doc,[\s\S]*?\.templates-page-card:focus-within \.template-thumb \.r-doc,[\s\S]*?\.templates-hero-preview:hover,[\s\S]*?\.templates-hero-preview:focus-within\s*\{[^}]*transform:\s*none;[\s\S]*?\}/s);
});

test("templates hero preview has responsive depth without zoom overflow", () => {
  assert.match(section, /\.templates-page-hero::before\s*\{/);
  assert.match(section, /\.templates-page-hero::after\s*\{/);
  assert.match(section, /\.templates-hero-preview\s*\{(?=[^}]*border-radius:\s*22px)(?=[^}]*transition:\s*border-color 190ms ease,\s*box-shadow 190ms ease,\s*transform 220ms)[^}]*\}/s);
  assert.match(section, /\.templates-hero-thumb\s*\{(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(section, /\.templates-hero-thumb\s+\.r-doc\s*\{(?=[^}]*inline-size:\s*min\(100%,\s*220px\))(?=[^}]*margin-inline:\s*auto)[^}]*\}/s);
  assert.match(section, /\.templates-hero-preview:hover,\s*\.templates-hero-preview:focus-within\s*\{(?=[^}]*transform:\s*translateY\(-2px\))[^}]*\}/s);
  assert.match(section, /html\[data-theme="dark"\]\s+\.templates-hero-preview\s*\{(?=[^}]*border-color:\s*rgba\(255,\s*247,\s*233,\s*0\.15\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.templates-hero-preview\s*\{(?=[^}]*justify-self:\s*stretch)(?=[^}]*width:\s*min\(100%,\s*420px\))[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.templates-hero-thumb\s*\{[^}]*height:\s*260px[^}]*\}/s);
  assert.match(section, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.templates-hero-preview,[\s\S]*?transition:\s*none;[\s\S]*?\.templates-hero-preview:hover,[\s\S]*?\.templates-hero-preview:focus-within\s*\{[^}]*transform:\s*none;[\s\S]*?\}/s);
});
