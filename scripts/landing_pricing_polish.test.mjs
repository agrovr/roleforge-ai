import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globals = readFileSync("app/globals.css", "utf8");

test("landing pricing keeps clear plan contrast without card grid lines", () => {
  assert.match(globals, /\/\* Landing pricing refinement: clear plans without decorative rails or grid lines\. \*\//);
  assert.match(globals, /\.pricing-grid\.two\s*\{(?=[^}]*align-items:\s*stretch)[^}]*\}/s);
  assert.match(globals, /\.pricing-grid\.two\s+\.price-card,\s*\.pricing-clarity-grid a\s*\{(?=[^}]*position:\s*relative)(?=[^}]*isolation:\s*isolate)[^}]*\}/s);
  assert.match(globals, /\.pricing-grid\.two\s+\.price-card\s*\{(?=[^}]*background:\s*var\(--surface\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /\.pricing-grid\.two\s+\.price-card::after\s*\{[^}]*content:\s*none/s);
  assert.match(globals, /\.pricing-grid\.two\s+\.price-card\.featured\s*\{(?=[^}]*background:\s*linear-gradient\(160deg,\s*#11162f,\s*#0d1228\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /\.price-list\s*\{(?=[^}]*padding:\s*0)(?=[^}]*border-top:\s*0)[^}]*\}/s);
  assert.doesNotMatch(globals, /--landing-pricing-rail|--landing-pricing-wash/);
});

test("landing pricing current-plan status is calmer than the old coupon-style badge", () => {
  assert.match(globals, /\.price-status\.current\s*\{(?=[^}]*linear-gradient\(180deg,\s*color-mix\(in srgb,\s*var\(--surface\)\s*82%,\s*var\(--accent-soft\)\))(?=[^}]*color:\s*color-mix\(in srgb,\s*var\(--ink-0\)\s*72%,\s*var\(--brand-dark\)\))[^}]*\}/s);
  assert.match(globals, /\.price-card\.featured\s+\.price-status\.current\s*\{(?=[^}]*border-color:\s*rgba\(245,\s*214,\s*154,\s*0\.34\))(?=[^}]*color:\s*#f5d69a)(?=[^}]*text-shadow:\s*none)[^}]*\}/s);
  assert.match(globals, /\.price-card\.featured\s+\.price-status\.current::before\s*\{(?=[^}]*background:\s*#f5d69a)(?=[^}]*rgba\(245,\s*214,\s*154,\s*0\.12\))[^}]*\}/s);
});

test("landing pricing clarity and motion states stay restrained safely", () => {
  assert.match(globals, /\.pricing-clarity-grid a\s*\{(?=[^}]*border-color:\s*var\(--line\))(?=[^}]*background:\s*var\(--surface\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /\.pricing-clarity-grid a::after\s*\{[^}]*content:\s*none/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.pricing-grid\.two\s+\.price-card,\s*html\[data-theme="dark"\]\s+\.pricing-clarity-grid a\s*\{(?=[^}]*background:\s*rgba\(16,\s*22,\s*37,\s*0\.86\))[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.price-card\.featured\s+\.price-status\.current\s*\{(?=[^}]*border-color:\s*rgba\(245,\s*214,\s*154,\s*0\.36\))(?=[^}]*color:\s*#f5d69a)[^}]*\}/s);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*no-preference\)\s*\{[\s\S]*?\.pricing-grid\.two\s+\.price-card\s*\{[\s\S]*?animation:\s*landing-pricing-card-in/s);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.pricing-grid\.two\s+\.price-card,[\s\S]*?\.pricing-clarity-grid a::after\s*\{[\s\S]*?animation:\s*none;[\s\S]*?transition:\s*none;[\s\S]*?\}/s);
});
