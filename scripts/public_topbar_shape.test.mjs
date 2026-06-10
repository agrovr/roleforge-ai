import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const templatesPage = readFileSync("app/templates/page.tsx", "utf8");
const globals = readFileSync("app/globals.css", "utf8");

test("public legal topbar uses a slim structured navigation dock", () => {
  assert.match(globals, /\/\* Public masthead refinement: compact dock shape/);
  assert.match(globals, /\.legal-topbar,\s*\.public-page-topbar\s*\{(?=[^}]*width:\s*min\(1160px,\s*calc\(100%\s*-\s*clamp\(20px,\s*5vw,\s*96px\)\)\))(?=[^}]*min-height:\s*72px)(?=[^}]*padding:\s*9px\s+10px\s+9px\s+12px)(?=[^}]*border-radius:\s*20px)(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /\.legal-topbar::before,\s*\.public-page-topbar::before\s*\{(?=[^}]*width:\s*clamp\(96px,\s*18vw,\s*220px\))(?=[^}]*height:\s*2px)(?=[^}]*mask-image:\s*none)(?=[^}]*opacity:\s*0\.56)[^}]*\}/s);
  assert.match(globals, /\.legal-topbar::after,\s*\.public-page-topbar::after\s*\{(?=[^}]*inset:\s*12px clamp\(116px,\s*14vw,\s*190px\) 12px clamp\(168px,\s*22vw,\s*300px\))(?=[^}]*border-radius:\s*14px)(?=[^}]*opacity:\s*0\.44)[^}]*\}/s);
  assert.match(globals, /\.legal-topbar\s+\.brand,\s*\.public-page-topbar\s+\.brand\s*\{(?=[^}]*min-height:\s*52px)(?=[^}]*border-radius:\s*16px)[^}]*\}/s);
  assert.match(globals, /\.legal-topbar\s+\.settings-page-actions,\s*\.public-page-topbar\s+\.settings-page-actions\s*\{(?=[^}]*min-height:\s*52px)(?=[^}]*padding:\s*5px)(?=[^}]*border-radius:\s*16px)[^}]*\}/s);
  assert.match(globals, /\.legal-topbar\s+\.settings-page-actions\s+\.btn,[\s\S]*?\.public-page-topbar\s+\.settings-page-actions\s+\.public-topbar-avatar\s*\{(?=[^}]*min-height:\s*42px)(?=[^}]*border-radius:\s*12px)[^}]*\}/s);
});

test("public legal topbar keeps dark mode and mobile actions shaped safely", () => {
  assert.match(globals, /html\[data-theme="dark"\]\s+\.legal-topbar,\s*html\[data-theme="dark"\]\s+\.public-page-topbar\s*\{(?=[^}]*border-color:\s*rgba\(255,\s*247,\s*233,\s*0\.14\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.legal-topbar::before,\s*html\[data-theme="dark"\]\s+\.public-page-topbar::before\s*\{(?=[^}]*#f3c16d)(?=[^}]*#8fdac8)(?=[^}]*opacity:\s*0\.66)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.legal-topbar::after,\s*html\[data-theme="dark"\]\s+\.public-page-topbar::after\s*\{(?=[^}]*rgba\(255,\s*247,\s*233,\s*0\.11\))(?=[^}]*opacity:\s*0\.5)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.legal-topbar\s+\.settings-page-actions,\s*html\[data-theme="dark"\]\s+\.public-page-topbar\s+\.settings-page-actions\s*\{(?=[^}]*border-color:\s*rgba\(255,\s*247,\s*233,\s*0\.14\))(?=[^}]*linear-gradient\(180deg,\s*rgba\(255,\s*247,\s*233,\s*0\.062\),\s*rgba\(255,\s*247,\s*233,\s*0\.034\)\))[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.legal-topbar\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*1fr)(?=[^}]*padding:\s*8px)(?=[^}]*border-radius:\s*18px)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.legal-topbar\s+\.settings-page-actions\s*\{(?=[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\))(?=[^}]*border-top:\s*1px solid)(?=[^}]*border-radius:\s*14px)[^}]*\}/s);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.legal-topbar\s+\.brand,[\s\S]*?\.public-page-topbar\s+\.brand\s*\{[\s\S]*?transition:\s*none;[\s\S]*?\}/s);
});

test("templates page uses the polished public topbar shell", () => {
  assert.match(templatesPage, /className="settings-page-topbar public-page-topbar templates-topbar"/);
});

test("public topbar has a contained rounded shape with grouped actions", () => {
  assert.match(globals, /\.legal-topbar,\s*\.public-page-topbar\s*\{(?=[^}]*width:\s*min\(1160px,\s*calc\(100%\s*-\s*clamp\(20px,\s*5vw,\s*96px\)\)\))(?=[^}]*border-radius:\s*20px)[^}]*\}/s);
  assert.match(globals, /\.public-page-topbar\s+\.brand\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*min-height:\s*48px)[^}]*\}/s);
  assert.match(globals, /\.legal-topbar\s+\.brand,\s*\.public-page-topbar\s+\.brand\s*\{(?=[^}]*min-height:\s*52px)(?=[^}]*border-radius:\s*16px)[^}]*\}/s);
  assert.match(globals, /\.legal-topbar\s+\.settings-page-actions,\s*\.public-page-topbar\s+\.settings-page-actions\s*\{(?=[^}]*min-height:\s*52px)(?=[^}]*border-radius:\s*16px)[^}]*\}/s);
});

test("public topbar has dark and narrow viewport polish", () => {
  assert.match(globals, /html\[data-theme="dark"\]\s+\.public-page-topbar\s*\{(?=[^}]*border-color:\s*rgba\(255,\s*247,\s*233,\s*0\.13\))(?=[^}]*radial-gradient\(circle at 0% 0%,\s*rgba\(222,\s*162,\s*79,\s*0\.14\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.public-page-topbar::before\s*\{(?=[^}]*content:\s*"";)(?=[^}]*rgba\(222,\s*162,\s*79,\s*0\.22\))[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.public-page-topbar\s+\.settings-page-actions\s*\{(?=[^}]*border-color:\s*rgba\(255,\s*247,\s*233,\s*0\.13\))(?=[^}]*background:\s*rgba\(255,\s*247,\s*233,\s*0\.045\))[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.public-page-topbar\s*\{(?=[^}]*width:\s*min\(100%,\s*760px\))(?=[^}]*border-radius:\s*22px)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.public-page-topbar\s*\{(?=[^}]*width:\s*100%)(?=[^}]*border-radius:\s*22px)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.public-page-topbar\s+\.settings-page-actions\s*\{(?=[^}]*width:\s*100%)(?=[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto\s+auto)[^}]*\}/s);
});
