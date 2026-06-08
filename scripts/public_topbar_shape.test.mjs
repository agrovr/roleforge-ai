import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globals = readFileSync("app/globals.css", "utf8");

test("public legal topbar uses a rounded floating tray instead of a hard rectangle", () => {
  assert.match(globals, /\.legal-topbar\s*\{(?=[^}]*width:\s*min\(1180px,\s*calc\(100% - clamp\(20px,\s*3vw,\s*44px\)\)\))(?=[^}]*padding:\s*9px 10px 9px 12px)(?=[^}]*border-radius:\s*clamp\(22px,\s*2\.4vw,\s*34px\))(?=[^}]*backdrop-filter:\s*blur\(20px\) saturate\(1\.08\))(?=[^}]*overflow:\s*visible)[^}]*\}/s);
  assert.match(globals, /\.legal-topbar::before\s*\{(?=[^}]*inset:\s*1px)(?=[^}]*border-radius:\s*calc\(clamp\(22px,\s*2\.4vw,\s*34px\) - 1px\))[^}]*\}/s);
});

test("public legal topbar keeps dark mode and mobile actions shaped safely", () => {
  assert.match(globals, /html\[data-theme="dark"\]\s+\.legal-topbar\s*\{(?=[^}]*radial-gradient\(circle at 100% 0%)(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.legal-topbar::before\s*\{/);
  assert.match(globals, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.legal-topbar\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*1fr)[^}]*\}/s);
});
