import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globals = readFileSync("app/globals.css", "utf8");

test("landing pricing keeps compact plan contrast without forced card height", () => {
  assert.match(globals, /\/\* Landing pricing refinement: compact plans without decorative card stacks\. \*\//);
  assert.match(globals, /\.pricing-grid\.two\s*\{(?=[^}]*align-items:\s*start)[^}]*\}/s);
  assert.match(globals, /\.pricing-grid\.two\s+\.price-card,\s*\.pricing-clarity-grid a\s*\{(?=[^}]*position:\s*relative)(?=[^}]*isolation:\s*isolate)[^}]*\}/s);
  assert.match(globals, /\.pricing-grid\.two\s+\.price-card\s*\{(?=[^}]*min-height:\s*0)(?=[^}]*gap:\s*14px)(?=[^}]*padding:\s*26px 28px)(?=[^}]*border-radius:\s*18px)(?=[^}]*background:\s*var\(--surface\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /\.pricing-grid\.two\s+\.price-card::after\s*\{[^}]*content:\s*none/s);
  assert.match(globals, /\.pricing-grid\.two\s+\.price-card\.featured\s*\{(?=[^}]*background:\s*linear-gradient\(160deg,\s*#11162f,\s*#0d1228\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /\.pricing-grid\.two\s+\.price-card\s+\.btn\s*\{[^}]*margin-top:\s*8px[^}]*\}/s);
  assert.match(globals, /\.price-list\s*\{(?=[^}]*padding:\s*0)(?=[^}]*border-top:\s*0)[^}]*\}/s);
  assert.doesNotMatch(globals, /--landing-pricing-rail|--landing-pricing-wash/);
});

test("landing pricing current-plan status is calmer than the old coupon-style badge", () => {
  assert.match(globals, /\.price-status\.current\s*\{(?=[^}]*linear-gradient\(180deg,\s*color-mix\(in srgb,\s*var\(--surface\)\s*82%,\s*var\(--accent-soft\)\))(?=[^}]*color:\s*color-mix\(in srgb,\s*var\(--ink-0\)\s*72%,\s*var\(--brand-dark\)\))[^}]*\}/s);
  assert.match(globals, /\.price-card\.featured\s+\.price-status\.current\s*\{(?=[^}]*border-color:\s*rgba\(245,\s*214,\s*154,\s*0\.34\))(?=[^}]*color:\s*#f5d69a)(?=[^}]*text-shadow:\s*none)[^}]*\}/s);
  assert.match(globals, /\.price-card\.featured\s+\.price-status\.current::before\s*\{(?=[^}]*background:\s*#f5d69a)(?=[^}]*rgba\(245,\s*214,\s*154,\s*0\.12\))[^}]*\}/s);
});

test("landing pricing clarity and motion states stay restrained safely", () => {
  assert.match(globals, /\.pricing-clarity-grid\s*\{(?=[^}]*gap:\s*0)(?=[^}]*padding-top:\s*18px)(?=[^}]*border-top:\s*1px solid)[^}]*\}/s);
  assert.match(globals, /\.pricing-clarity-grid a\s*\{(?=[^}]*padding:\s*8px 22px)(?=[^}]*border:\s*0)(?=[^}]*border-radius:\s*0)(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)[^}]*\}/s);
  assert.match(globals, /\.pricing-clarity-grid a \+ a\s*\{[^}]*border-inline-start:\s*1px solid[^}]*\}/s);
  assert.match(globals, /\.pricing-clarity-grid a::after\s*\{[^}]*content:\s*none/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.pricing-grid\.two\s+\.price-card\s*\{(?=[^}]*background:\s*rgba\(16,\s*22,\s*37,\s*0\.86\))[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.pricing-clarity-grid a\s*\{(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.price-card\.featured\s+\.price-status\.current\s*\{(?=[^}]*border-color:\s*rgba\(245,\s*214,\s*154,\s*0\.36\))(?=[^}]*color:\s*#f5d69a)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.pricing-clarity-grid\s*\{[^}]*grid-template-columns:\s*1fr[^}]*\}[\s\S]*?\.pricing-clarity-grid a \+ a\s*\{(?=[^}]*border-inline-start:\s*0)(?=[^}]*border-block-start:\s*1px solid)[^}]*\}/s);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*no-preference\)\s*\{[\s\S]*?\.pricing-grid\.two\s+\.price-card\s*\{[\s\S]*?animation:\s*landing-pricing-card-in/s);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.pricing-grid\.two\s+\.price-card,[\s\S]*?\.pricing-clarity-grid a::after\s*\{[\s\S]*?animation:\s*none;[\s\S]*?transition:\s*none;[\s\S]*?\}/s);
});
