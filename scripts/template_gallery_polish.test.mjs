import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { stylesFor } from "./style_sources.mjs";

const globals = stylesFor("templates/templates.css");
const templatesPage = readFileSync("app/templates/page.tsx", "utf8");
const templateLibrary = readFileSync("app/templates/TemplateLibrary.tsx", "utf8");
const sectionStart = globals.indexOf("/* Template gallery restraint:");
assert.notEqual(sectionStart, -1, "template gallery restraint section is missing");
const section = globals.slice(sectionStart);

test("templates hero renders the selected template as a real preview", () => {
  assert.match(templateLibrary, /import \{ ResumePreview \} from "\.\.\/components\/ResumePreview"/);
  assert.match(templateLibrary, /className="templates-page-hero-copy"/);
  assert.match(templateLibrary, /className="templates-hero-preview"/);
  assert.match(templateLibrary, /aria-label=\{`\$\{selectedTemplate\.name\} template preview`\}/);
  assert.match(templateLibrary, /<strong>\{selectedTemplate\.name\}<\/strong>/);
  assert.match(templateLibrary, /className="template-thumb templates-hero-thumb" key=\{selectedTemplate\.slug\}/);
  assert.match(templateLibrary, /variant=\{selectedTemplate\.variant\}/);
  assert.match(templateLibrary, /name=\{selectedTemplate\.previewName\}/);
  assert.match(templateLibrary, /highlight/);
  assert.doesNotMatch(templatesPage, /className="templates-hero-preview"/);
});

test("template gallery removes decorative rails and flattens guidance surfaces", () => {
  assert.match(section, /\.templates-page-hero::before,\s*\.templates-page-hero::after,\s*\.templates-hero-preview::after,[\s\S]*?\.templates-page-card::after\s*\{[^}]*content:\s*none;/s);
  assert.doesNotMatch(templateLibrary, /templates-selection-status/);
  assert.match(section, /\.templates-decision-guide\s*\{(?=[^}]*border-block:\s*1px solid var\(--line\))(?=[^}]*border-radius:\s*0)(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)[^}]*\}/s);
});

test("template choices keep clear selected states without nested card effects", () => {
  assert.match(section, /\.templates-guide-card\s*\{(?=[^}]*border:\s*0)(?=[^}]*border-radius:\s*0)(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)[^}]*\}/s);
  assert.match(section, /\.templates-guide-option\s*\{(?=[^}]*padding:\s*12px 10px)(?=[^}]*border-bottom:\s*1px solid var\(--line\))(?=[^}]*border-radius:\s*0)(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)(?=[^}]*transition:\s*color 160ms ease, background 160ms ease)[^}]*\}/s);
  assert.match(section, /\.templates-guide-option\.selected\s*\{(?=[^}]*background:\s*color-mix\(in srgb, var\(--success\) 12%, transparent\))(?=[^}]*box-shadow:\s*none)[^}]*\}/s);
  assert.doesNotMatch(section, /\.templates-guide-option\.selected\s*\{[^}]*padding(?:-inline)?:/s);
  assert.doesNotMatch(section, /transition:[^;]*padding/s);
  assert.match(section, /\.templates-page-card\.selected\s*\{(?=[^}]*border-color:)(?=[^}]*box-shadow:\s*inset 0 0 0 1px)[^}]*\}/s);
});

test("template preview cards stay calm in light, dark, and reduced-motion modes", () => {
  assert.match(section, /\.template-thumb::before\s*\{[^}]*content:\s*none;[^}]*\}/s);
  assert.match(section, /\.template-thumb \.r-doc\s*\{(?=[^}]*transform:\s*none)(?=[^}]*transition:\s*none)[^}]*\}/s);
  assert.match(section, /\.templates-page-card:hover \.template-thumb \.r-doc,\s*\.templates-page-card:focus-within \.template-thumb \.r-doc\s*\{(?=[^}]*transform:\s*none)[^}]*\}/s);
  assert.match(section, /html\[data-theme="dark"\]\s+\.templates-guide-option\.selected\s*\{(?=[^}]*background:\s*rgba\(142,\s*219,\s*166,\s*0\.09\))(?=[^}]*box-shadow:\s*none)[^}]*\}/s);
  assert.match(section, /html\[data-theme="dark"\]\s+\.templates-page-card\.selected\s*\{(?=[^}]*border-color:\s*rgba\(243,\s*193,\s*109,\s*0\.56\))(?=[^}]*box-shadow:\s*inset 0 0 0 1px)[^}]*\}/s);
  assert.match(section, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.templates-page-card,[\s\S]*?\.templates-guide-option\s*\{[^}]*transition:\s*none;[\s\S]*?\}/s);
});

test("templates hero preview stays responsive without decorative motion", () => {
  assert.match(section, /\.templates-hero-preview\s*\{(?=[^}]*border-radius:\s*18px)(?=[^}]*transition:\s*border-color 180ms ease)[^}]*\}/s);
  assert.match(section, /\.templates-hero-thumb\s*\{(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(section, /@keyframes\s+template-preview-enter\s*\{[\s\S]*?opacity:\s*0\.62[\s\S]*?transform:\s*translateY\(5px\) scale\(0\.992\)[\s\S]*?opacity:\s*1/s);
  assert.match(section, /\.templates-hero-thumb\s+\.r-doc\s*\{(?=[^}]*inline-size:\s*min\(100%,\s*220px\))(?=[^}]*margin-inline:\s*auto)[^}]*\}/s);
  assert.match(section, /\.templates-hero-preview:hover,\s*\.templates-hero-preview:focus-within\s*\{(?=[^}]*transform:\s*none)[^}]*\}/s);
  assert.match(section, /html\[data-theme="dark"\]\s+\.templates-page-hero,\s*html\[data-theme="dark"\]\s+\.templates-hero-preview,[\s\S]*?\.templates-page-card\s*\{(?=[^}]*border-color:\s*rgba\(255,\s*247,\s*233,\s*0\.15\))(?=[^}]*box-shadow:\s*none)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.templates-hero-preview\s*\{(?=[^}]*justify-self:\s*stretch)(?=[^}]*width:\s*min\(100%,\s*420px\))[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.templates-hero-thumb\s*\{[^}]*height:\s*260px[^}]*\}/s);
  assert.match(section, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.templates-fit-guide article \+ article\s*\{(?=[^}]*border-inline-start:\s*0)(?=[^}]*border-top:\s*1px solid var\(--line\))[^}]*\}/s);
});
