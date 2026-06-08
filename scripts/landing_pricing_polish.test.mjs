import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globals = readFileSync("app/globals.css", "utf8");

test("landing pricing polish adds premium card depth and section rails", () => {
  assert.match(globals, /\/\* Landing pricing polish: calmer plan status, premium depth, and billing clarity\. \*\//);
  assert.match(globals, /\.pricing-grid\.two\s*\{(?=[^}]*--landing-pricing-rail:\s*linear-gradient\(90deg,\s*var\(--brand\),\s*var\(--accent\),\s*var\(--sky\)\))(?=[^}]*align-items:\s*stretch)[^}]*\}/s);
  assert.match(globals, /\.pricing-grid\.two\s+\.price-card,\s*\.pricing-clarity-grid a\s*\{(?=[^}]*position:\s*relative)(?=[^}]*isolation:\s*isolate)[^}]*\}/s);
  assert.match(globals, /\.pricing-grid\.two\s+\.price-card\s*\{(?=[^}]*background-size:\s*32px 32px,\s*auto,\s*auto)(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /\.pricing-grid\.two\s+\.price-card::after\s*\{(?=[^}]*height:\s*3px)(?=[^}]*background:\s*var\(--landing-pricing-rail\))[^}]*\}/s);
  assert.match(globals, /\.pricing-grid\.two\s+\.price-card\.featured\s*\{(?=[^}]*linear-gradient\(160deg,\s*#10142d,\s*#0b1028\s*56%,\s*#1f1c2a\))(?=[^}]*box-shadow:)[^}]*\}/s);
});

test("landing pricing current-plan status is calmer than the old coupon-style badge", () => {
  assert.match(globals, /\.price-status\.current\s*\{(?=[^}]*linear-gradient\(180deg,\s*color-mix\(in srgb,\s*var\(--surface\)\s*82%,\s*var\(--accent-soft\)\))(?=[^}]*color:\s*color-mix\(in srgb,\s*var\(--ink-0\)\s*72%,\s*var\(--brand-dark\)\))[^}]*\}/s);
  assert.match(globals, /\.price-card\.featured\s+\.price-status\.current\s*\{(?=[^}]*border-color:\s*rgba\(245,\s*214,\s*154,\s*0\.34\))(?=[^}]*color:\s*#f5d69a)(?=[^}]*text-shadow:\s*none)[^}]*\}/s);
  assert.match(globals, /\.price-card\.featured\s+\.price-status\.current::before\s*\{(?=[^}]*background:\s*#f5d69a)(?=[^}]*rgba\(245,\s*214,\s*154,\s*0\.12\))[^}]*\}/s);
});

test("landing pricing clarity cards and motion states stay polished safely", () => {
  assert.match(globals, /\.pricing-clarity-grid a\s*\{(?=[^}]*border-color:\s*color-mix\(in srgb,\s*var\(--brand\)\s*18%,\s*var\(--line\)\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /\.pricing-clarity-grid a::after\s*\{(?=[^}]*width:\s*3px)(?=[^}]*background:\s*var\(--landing-pricing-rail\))(?=[^}]*transition:\s*opacity 170ms ease)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.pricing-grid\.two\s*\{(?=[^}]*--landing-pricing-rail:)(?=[^}]*--landing-pricing-wash:)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.price-card\.featured\s+\.price-status\.current\s*\{(?=[^}]*border-color:\s*rgba\(245,\s*214,\s*154,\s*0\.36\))(?=[^}]*color:\s*#f5d69a)[^}]*\}/s);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*no-preference\)\s*\{[\s\S]*?\.pricing-grid\.two\s+\.price-card\s*\{[\s\S]*?animation:\s*landing-pricing-card-in/s);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.pricing-grid\.two\s+\.price-card,[\s\S]*?\.pricing-clarity-grid a::after\s*\{[\s\S]*?animation:\s*none;[\s\S]*?transition:\s*none;[\s\S]*?\}/s);
});
