import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globals = readFileSync("app/globals.css", "utf8");

test("public legal topbar uses a single composed floating capsule", () => {
  assert.match(globals, /\.legal-topbar\s*\{(?=[^}]*width:\s*min\(1280px,\s*100%\))(?=[^}]*min-height:\s*70px)(?=[^}]*border-radius:\s*28px)(?=[^}]*backdrop-filter:\s*blur\(18px\) saturate\(1\.08\))(?=[^}]*overflow:\s*clip)[^}]*\}/s);
  assert.match(globals, /\.legal-topbar::before\s*\{(?=[^}]*content:\s*"";)(?=[^}]*position:\s*absolute)(?=[^}]*inset-inline:\s*22px)(?=[^}]*height:\s*1px)[^}]*\}/s);
  assert.match(globals, /\.legal-topbar\s+\.brand,\s*\.legal-topbar\s+\.settings-page-actions\s*\{(?=[^}]*border:\s*0)(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)[^}]*\}/s);
  assert.match(globals, /\.legal-topbar\s+\.brand\s*\{(?=[^}]*min-height:\s*54px)(?=[^}]*border-radius:\s*22px)(?=[^}]*transition:\s*background 170ms ease,\s*transform 170ms ease)[^}]*\}/s);
  assert.match(globals, /\.legal-topbar\s+\.settings-page-actions\s*\{(?=[^}]*min-height:\s*54px)(?=[^}]*padding:\s*0)(?=[^}]*border-radius:\s*22px)[^}]*\}/s);
});

test("public legal topbar keeps dark mode and mobile actions shaped safely", () => {
  assert.match(globals, /html\[data-theme="dark"\]\s+\.legal-topbar\s*\{(?=[^}]*border-color:\s*rgba\(255,\s*247,\s*233,\s*0\.14\))(?=[^}]*linear-gradient\(135deg,\s*rgba\(25,\s*31,\s*52,\s*0\.86\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.legal-topbar::before\s*\{(?=[^}]*rgba\(255,\s*247,\s*233,\s*0\.34\))(?=[^}]*opacity:\s*0\.72)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.legal-topbar\s+\.brand,\s*html\[data-theme="dark"\]\s+\.legal-topbar\s+\.settings-page-actions\s*\{(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.legal-topbar\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*1fr)(?=[^}]*padding:\s*8px)(?=[^}]*border-radius:\s*26px)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.legal-topbar\s+\.settings-page-actions\s*\{(?=[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\))(?=[^}]*border-radius:\s*20px)[^}]*\}/s);
});
