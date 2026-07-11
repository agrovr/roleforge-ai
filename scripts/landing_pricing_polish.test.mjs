import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globals = readFileSync("app/globals.css", "utf8");

test("landing pricing keeps compact plan contrast without internal line texture", () => {
  assert.match(globals, /\/\* Landing pricing refinement: compact plans with quiet depth and clear status\. \*\//);
  assert.match(globals, /\.pricing-grid\.two\s*\{(?=[^}]*width:\s*min\(100%,\s*1040px\))(?=[^}]*align-items:\s*stretch)(?=[^}]*gap:\s*20px)[^}]*\}/s);
  assert.match(globals, /\.pricing-grid\.two\s+\.price-card,\s*\.pricing-clarity-grid a\s*\{(?=[^}]*position:\s*relative)(?=[^}]*isolation:\s*isolate)[^}]*\}/s);
  assert.match(globals, /\.pricing-grid\.two\s+\.price-card\s*\{(?=[^}]*height:\s*100%)(?=[^}]*min-height:\s*0)(?=[^}]*gap:\s*14px)(?=[^}]*padding:\s*26px 28px)(?=[^}]*border-radius:\s*18px)(?=[^}]*background:\s*var\(--surface\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /\.pricing-grid\.two\s+\.price-card::after\s*\{[^}]*content:\s*none/s);
  assert.match(globals, /\.pricing-grid\.two\s+\.price-card\.featured\s*\{(?=[^}]*background:\s*linear-gradient\(160deg,\s*#11162f,\s*#0d1228\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /\.pricing-grid\.two\s+\.price-card\s+\.btn\s*\{[^}]*margin-top:\s*8px[^}]*\}/s);
  assert.match(globals, /\.price-list\s*\{(?=[^}]*padding:\s*0)(?=[^}]*border-top:\s*0)[^}]*\}/s);
  assert.doesNotMatch(globals, /--landing-pricing-rail|--landing-pricing-wash/);
});

test("landing pricing plan status is a compact intentional badge", () => {
  assert.match(globals, /\.pricing-grid\.two\s+\.price-status\s*\{(?=[^}]*min-height:\s*30px)(?=[^}]*padding:\s*6px 10px)(?=[^}]*border:\s*1px solid)(?=[^}]*border-radius:\s*10px)(?=[^}]*background:)(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /\.pricing-grid\.two\s+\.price-card\.featured\s+\.price-status,[\s\S]*?\.pricing-grid\.two\s+\.price-card\.featured\s+\.price-status\.paused\s*\{(?=[^}]*border:\s*1px solid rgba\(245,\s*214,\s*154,\s*0\.3\))(?=[^}]*background:\s*rgba\(255,\s*247,\s*233,\s*0\.08\))(?=[^}]*box-shadow:)[^}]*\}/s);
});

test("landing pricing clarity stays visible without divider rails or automatic motion", () => {
  assert.match(globals, /\.pricing-clarity-grid\s*\{(?=[^}]*width:\s*min\(100%,\s*1040px\))(?=[^}]*gap:\s*clamp\(22px,\s*4vw,\s*40px\))(?=[^}]*padding-top:\s*0)(?=[^}]*border-top:\s*0)[^}]*\}/s);
  assert.match(globals, /\.pricing-clarity-grid a\s*\{(?=[^}]*padding:\s*0)(?=[^}]*border:\s*0)(?=[^}]*border-radius:\s*0)(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)[^}]*\}/s);
  assert.match(globals, /\.pricing-clarity-grid a \+ a\s*\{[^}]*border-inline-start:\s*0[^}]*\}/s);
  assert.match(globals, /\.pricing-clarity-grid a::after\s*\{[^}]*content:\s*none/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.pricing-grid\.two\s+\.price-card\s*\{(?=[^}]*background:\s*rgba\(16,\s*22,\s*37,\s*0\.86\))[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.pricing-clarity-grid a\s*\{(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.price-card\.featured\s+\.price-status\.current\s*\{(?=[^}]*border-color:\s*rgba\(245,\s*214,\s*154,\s*0\.32\))(?=[^}]*background:\s*rgba\(255,\s*247,\s*233,\s*0\.08\))(?=[^}]*color:\s*#f5d69a)(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.pricing-clarity-grid\s*\{(?=[^}]*grid-template-columns:\s*1fr)(?=[^}]*gap:\s*18px)[^}]*\}[\s\S]*?\.pricing-clarity-grid a \+ a\s*\{(?=[^}]*border-inline-start:\s*0)(?=[^}]*border-block-start:\s*0)[^}]*\}/s);
  assert.doesNotMatch(globals, /landing-pricing-card-in/);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.pricing-grid\.two\s+\.price-card,[\s\S]*?\.pricing-clarity-grid a::after\s*\{[\s\S]*?animation:\s*none;[\s\S]*?transition:\s*none;[\s\S]*?\}/s);
});
