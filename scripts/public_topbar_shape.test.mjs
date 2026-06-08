import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globals = readFileSync("app/globals.css", "utf8");

test("public legal topbar uses separate floating islands instead of one long tray", () => {
  assert.match(globals, /\.legal-topbar\s*\{(?=[^}]*width:\s*min\(1180px,\s*calc\(100% - clamp\(28px,\s*6vw,\s*118px\)\)\))(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)(?=[^}]*overflow:\s*visible)[^}]*\}/s);
  assert.match(globals, /\.legal-topbar::before\s*\{(?=[^}]*content:\s*none)[^}]*\}/s);
  assert.match(globals, /\.legal-topbar\s+\.brand,\s*\.legal-topbar\s+\.settings-page-actions\s*\{(?=[^}]*backdrop-filter:\s*blur\(18px\) saturate\(1\.06\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /\.legal-topbar\s+\.brand\s*\{(?=[^}]*min-height:\s*58px)(?=[^}]*border-radius:\s*21px)[^}]*\}/s);
  assert.match(globals, /\.legal-topbar\s+\.settings-page-actions\s*\{(?=[^}]*min-height:\s*58px)(?=[^}]*border-radius:\s*999px)[^}]*\}/s);
});

test("public legal topbar keeps dark mode and mobile actions shaped safely", () => {
  assert.match(globals, /html\[data-theme="dark"\]\s+\.legal-topbar\s*\{(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.legal-topbar\s+\.brand,\s*html\[data-theme="dark"\]\s+\.legal-topbar\s+\.settings-page-actions\s*\{(?=[^}]*radial-gradient\(circle at 100% 0%)(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.legal-topbar\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*1fr)(?=[^}]*width:\s*100%)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.legal-topbar\s+\.settings-page-actions\s*\{(?=[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\))(?=[^}]*border-radius:\s*20px)[^}]*\}/s);
});
