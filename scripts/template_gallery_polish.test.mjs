import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globals = readFileSync("app/globals.css", "utf8");
const sectionStart = globals.indexOf("/* Template gallery polish:");
assert.notEqual(sectionStart, -1, "template gallery polish section is missing");
const section = globals.slice(sectionStart);

test("template gallery polish defines selected-direction rails and layered surfaces", () => {
  assert.match(section, /\.templates-page-shell\s*\{(?=[^}]*--template-gallery-rail:\s*linear-gradient\(180deg,\s*var\(--brand\),\s*var\(--accent\),\s*var\(--sky\)\))(?=[^}]*--template-gallery-wash:)[^}]*\}/s);
  assert.match(section, /\.templates-selection-status::after,\s*\.templates-fit-guide article::after,\s*\.templates-decision-guide::after,\s*\.templates-page-card::after\s*\{(?=[^}]*background:\s*var\(--template-gallery-rail\))(?=[^}]*opacity:\s*0\.54)[^}]*\}/s);
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
  assert.match(section, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.templates-page-card,[\s\S]*?\.template-thumb \.r-doc\s*\{[^}]*transition:\s*none;[\s\S]*?\.templates-page-card:hover \.template-thumb \.r-doc,[\s\S]*?\.templates-page-card:focus-within \.template-thumb \.r-doc\s*\{[^}]*transform:\s*none;[\s\S]*?\}/s);
});
