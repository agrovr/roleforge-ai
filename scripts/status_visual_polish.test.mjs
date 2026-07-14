import assert from "node:assert/strict";
import test from "node:test";

import { stylesFor } from "./style_sources.mjs";

const stylesheet = stylesFor("public-pages.css", "status/status.css");

test("status page polish adds trust-oriented card texture and tone rails", () => {
  assert.match(stylesheet, /\/\*\s*Status surface finish: trust-oriented cards, clearer diagnostics, and calm health rails\.\s*\*\//);
  assert.match(stylesheet, /\.status-shell\s*\{(?=[^}]*--status-surface-grid:\s*linear-gradient\(90deg,\s*color-mix\(in srgb,\s*var\(--line\)\s*18%,\s*transparent\)\s*1px)(?=[^}]*--status-good-rail:\s*linear-gradient\(90deg,\s*var\(--good\),\s*var\(--accent\)\))(?=[^}]*--status-ready-rail:\s*linear-gradient\(90deg,\s*var\(--brand\),\s*var\(--sky\)\))(?=[^}]*--status-warn-rail:\s*linear-gradient\(90deg,\s*var\(--warn\),\s*var\(--coral\)\))[^}]*\}/s);
  assert.match(stylesheet, /\.status-card,\s*\.status-incident-card,\s*\.status-diagnostic-card,\s*\.status-action-card\s*\{(?=[^}]*border-color:\s*color-mix\(in srgb,\s*var\(--brand\)\s*14%,\s*var\(--line\)\))(?=[^}]*background-size:\s*30px 30px,\s*auto,\s*auto)(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(stylesheet, /\.status-card::after,\s*\.status-incident-card::after,\s*\.status-diagnostic-card::after,\s*\.status-action-card::after\s*\{(?=[^}]*inset-inline:\s*16px)(?=[^}]*height:\s*3px)(?=[^}]*background:\s*var\(--status-ready-rail\))(?=[^}]*opacity:\s*0\.58)[^}]*\}/s);
  assert.match(stylesheet, /\.status-card\.good::after,\s*\.status-incident-card\.good::after,\s*\.status-diagnostic-card\.good::after\s*\{(?=[^}]*background:\s*var\(--status-good-rail\))[^}]*\}/s);
  assert.match(stylesheet, /\.status-card\.warn::after,\s*\.status-incident-card\.warn::after,\s*\.status-diagnostic-card\.warn::after\s*\{(?=[^}]*background:\s*var\(--status-warn-rail\))[^}]*\}/s);
});

test("status page polish improves icons diagnostics and action hierarchy", () => {
  assert.match(stylesheet, /\.status-card\s*>\s*\*,\s*\.status-incident-card\s*>\s*\*,\s*\.status-diagnostic-card\s*>\s*\*,\s*\.status-action-card\s*>\s*\*\s*\{(?=[^}]*position:\s*relative)(?=[^}]*z-index:\s*1)[^}]*\}/s);
  assert.match(stylesheet, /\.status-card\s*\{(?=[^}]*transition:\s*border-color 160ms ease,\s*box-shadow 160ms ease,\s*transform 160ms ease)[^}]*\}/s);
  assert.match(stylesheet, /\.status-card:hover,\s*\.status-card:focus-within\s*\{(?=[^}]*border-color:\s*color-mix\(in srgb,\s*var\(--brand-dark\)\s*32%,\s*var\(--line\)\))(?=[^}]*transform:\s*translateY\(-1px\))[^}]*\}/s);
  assert.match(stylesheet, /\.status-card-icon,\s*\.status-incident-card\s*>\s*span,\s*\.status-action-card\s*>\s*span\s*\{(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(stylesheet, /\.status-diagnostics\s*\{(?=[^}]*gap:\s*16px)[^}]*\}/s);
  assert.match(stylesheet, /\.status-incident-card\s*\{(?=[^}]*border-radius:\s*16px)(?=[^}]*padding:\s*clamp\(16px,\s*2vw,\s*20px\))[^}]*\}/s);
  assert.match(stylesheet, /\.status-diagnostic-grid\s*\{(?=[^}]*gap:\s*12px)[^}]*\}/s);
  assert.match(stylesheet, /\.status-diagnostic-card\s*\{(?=[^}]*border-radius:\s*13px)(?=[^}]*padding:\s*14px)[^}]*\}/s);
  assert.match(stylesheet, /\.status-action-grid\s*\{(?=[^}]*gap:\s*14px)[^}]*\}/s);
  assert.match(stylesheet, /\.status-action-card\s*\{(?=[^}]*border-radius:\s*16px)[^}]*\}/s);
});

test("status page polish keeps dark mode and reduced motion safe", () => {
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.status-shell\s*\{(?=[^}]*--status-surface-grid:\s*linear-gradient\(90deg,\s*rgba\(255,\s*247,\s*233,\s*0\.042\)\s*1px)(?=[^}]*--status-good-rail:\s*linear-gradient\(90deg,\s*#a6efb8,\s*#89d1be\))(?=[^}]*--status-warn-rail:\s*linear-gradient\(90deg,\s*#f0c978,\s*#ff9a86\))[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.status-card,\s*html\[data-theme="dark"\]\s+\.status-incident-card,\s*html\[data-theme="dark"\]\s+\.status-diagnostic-card,\s*html\[data-theme="dark"\]\s+\.status-action-card\s*\{(?=[^}]*border-color:\s*rgba\(255,\s*247,\s*233,\s*0\.14\))(?=[^}]*rgba\(12,\s*17,\s*31,\s*0\.82\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.status-card\.good\s+\.status-card-icon,\s*html\[data-theme="dark"\]\s+\.status-incident-card\.good\s*>\s*span,\s*html\[data-theme="dark"\]\s+\.status-diagnostic-card\.good\s*\{(?=[^}]*rgba\(137,\s*209,\s*190,\s*0\.12\))[^}]*\}/s);
  assert.match(stylesheet, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.status-card,\s*\.status-action-card,\s*\.status-card::after,\s*\.status-action-card::after\s*\{[^}]*transition:\s*none/s);
  assert.match(stylesheet, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.status-card:hover,\s*\.status-card:focus-within\s*\{[^}]*transform:\s*none/s);
});
