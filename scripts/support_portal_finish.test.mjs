import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { stylesFor } from "./style_sources.mjs";

const supportPage = readFileSync("app/support/page.tsx", "utf8");
const stylesheet = stylesFor("public-pages.css", "support/support.css");

test("support portal finish keeps the customer support workspace polished", () => {
  assert.match(supportPage, /support-request-card/);
  assert.match(supportPage, /support-packet-card/);
  assert.match(supportPage, /support-response-card/);
  assert.match(supportPage, /support-history/);
  assert.match(stylesheet, /\/\* Support portal finish: clearer request packet, form depth, and traceable history\. \*\//);
  assert.match(stylesheet, /\.support-shell\s*\{(?=[^}]*--support-portal-rail:\s*linear-gradient\(90deg)(?=[^}]*--support-portal-glint:\s*linear-gradient\(112deg)[^}]*\}/s);
  assert.match(stylesheet, /\.support-request-card,\s*\.support-packet-card,\s*\.support-response-card,\s*\.support-triage-card,\s*\.support-history\s*\{(?=[^}]*position:\s*relative)(?=[^}]*isolation:\s*isolate)[^}]*\}/s);
  assert.match(stylesheet, /\.support-request-head::after,\s*\.support-packet-head::after,\s*\.support-response-head::after,\s*\.support-history-head::after\s*\{(?=[^}]*background:\s*var\(--support-portal-rail\))(?=[^}]*opacity:\s*0\.62)[^}]*\}/s);
});

test("support portal finish adds traceable item and form states", () => {
  assert.match(stylesheet, /\.support-notice::before,\s*\.support-prefill-note::before\s*\{(?=[^}]*width:\s*3px)(?=[^}]*linear-gradient\(180deg,\s*var\(--warn\),\s*var\(--accent\)\))[^}]*\}/s);
  assert.match(stylesheet, /\.support-packet-item::before,\s*\.support-response-item::before,\s*\.support-triage-item::before,\s*\.support-history-item::before\s*\{(?=[^}]*background:\s*var\(--support-portal-glint\))(?=[^}]*transform:\s*translateX\(-58%\))[^}]*\}/s);
  assert.match(stylesheet, /\.support-form\s*\{(?=[^}]*padding:\s*14px)(?=[^}]*border-radius:\s*16px)(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(stylesheet, /\.support-form input:hover,\s*\.support-form select:hover,\s*\.support-form textarea:hover\s*\{(?=[^}]*border-color:)(?=[^}]*background:)[^}]*\}/s);
  assert.match(stylesheet, /\.support-reference-copy,\s*\.support-status-badge\s*\{(?=[^}]*min-height:\s*34px)(?=[^}]*box-shadow:)[^}]*\}/s);
});

test("support portal finish covers dark mode and reduced motion", () => {
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.support-shell\s*\{(?=[^}]*--support-portal-rail:)(?=[^}]*--support-portal-glint:)[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.support-request-card\s*\{(?=[^}]*radial-gradient\(circle at 92% 0%)(?=[^}]*linear-gradient\(180deg,\s*rgba\(17,\s*23,\s*41,\s*0\.9\),\s*rgba\(12,\s*17,\s*31,\s*0\.82\)\))[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.support-form\s*\{(?=[^}]*border-color:\s*rgba\(255,\s*247,\s*233,\s*0\.13\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(stylesheet, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.support-packet-item::before,[\s\S]*?\.support-form textarea\s*\{[\s\S]*?transition:\s*none;/s);
});
