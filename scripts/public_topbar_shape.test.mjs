import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const templatesPage = readFileSync("app/templates/page.tsx", "utf8");
const globals = readFileSync("app/globals.css", "utf8");

test("public legal topbar uses a rounded floating command dock", () => {
  assert.match(globals, /\/\* Public masthead refinement: rounded floating command dock/);
  assert.match(globals, /\.legal-topbar,\s*\.public-page-topbar\s*\{(?=[^}]*--public-topbar-accent:\s*linear-gradient)(?=[^}]*width:\s*min\(1180px,\s*calc\(100%\s*-\s*clamp\(32px,\s*7vw,\s*144px\)\)\))(?=[^}]*min-height:\s*78px)(?=[^}]*padding:\s*10px 12px)(?=[^}]*border-radius:\s*999px)(?=[^}]*overflow:\s*visible)[^}]*\}/s);
  assert.match(globals, /\.legal-topbar::before,\s*\.public-page-topbar::before\s*\{(?=[^}]*inset:\s*7px clamp\(30px,\s*6vw,\s*96px\) auto)(?=[^}]*height:\s*1px)(?=[^}]*background:\s*var\(--public-topbar-accent\))(?=[^}]*opacity:\s*0\.46)[^}]*\}/s);
  assert.match(globals, /\.legal-topbar::after,\s*\.public-page-topbar::after\s*\{(?=[^}]*inset:\s*11px)(?=[^}]*border:\s*1px solid)(?=[^}]*border-radius:\s*999px)(?=[^}]*opacity:\s*0\.58)[^}]*\}/s);
  assert.match(globals, /\.legal-topbar\s+\.brand,\s*\.public-page-topbar\s+\.brand\s*\{(?=[^}]*min-height:\s*58px)(?=[^}]*border-radius:\s*999px)(?=[^}]*background:)[^}]*\}/s);
  assert.match(globals, /\.legal-topbar\s+\.settings-page-actions,\s*\.public-page-topbar\s+\.settings-page-actions\s*\{(?=[^}]*min-height:\s*58px)(?=[^}]*padding:\s*7px)(?=[^}]*border-radius:\s*999px)(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /\.legal-topbar\s+\.settings-page-actions\s+\.btn,[\s\S]*?\.public-page-topbar\s+\.settings-page-actions\s+\.public-topbar-avatar\s*\{(?=[^}]*min-height:\s*44px)(?=[^}]*border-radius:\s*999px)[^}]*\}/s);
});

test("public legal topbar keeps dark mode and mobile actions shaped safely", () => {
  assert.match(globals, /html\[data-theme="dark"\]\s+\.legal-topbar,\s*html\[data-theme="dark"\]\s+\.public-page-topbar\s*\{(?=[^}]*border-color:\s*rgba\(255,\s*247,\s*233,\s*0\.13\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.legal-topbar::before,\s*html\[data-theme="dark"\]\s+\.public-page-topbar::before\s*\{(?=[^}]*#f3c16d)(?=[^}]*#8fdac8)(?=[^}]*rgba\(142,\s*183,\s*240,\s*0\.82\))(?=[^}]*opacity:\s*0\.58)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.legal-topbar::after,\s*html\[data-theme="dark"\]\s+\.public-page-topbar::after\s*\{(?=[^}]*border-color:\s*rgba\(255,\s*247,\s*233,\s*0\.09\))(?=[^}]*opacity:\s*0\.74)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.legal-topbar\s+\.settings-page-actions,\s*html\[data-theme="dark"\]\s+\.public-page-topbar\s+\.settings-page-actions\s*\{(?=[^}]*border-color:\s*rgba\(255,\s*247,\s*233,\s*0\.13\))(?=[^}]*linear-gradient\(180deg,\s*rgba\(255,\s*247,\s*233,\s*0\.07\),\s*rgba\(255,\s*247,\s*233,\s*0\.03\)\))[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.legal-topbar\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*1fr)(?=[^}]*padding:\s*8px)(?=[^}]*border-radius:\s*26px)(?=[^}]*overflow:\s*visible)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.legal-topbar\s+\.settings-page-actions\s*\{(?=[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\))(?=[^}]*border-top:\s*1px solid)(?=[^}]*border-radius:\s*20px)[^}]*\}/s);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.legal-topbar\s+\.brand,[\s\S]*?\.public-page-topbar\s+\.brand\s*\{[\s\S]*?transition:\s*none;[\s\S]*?\}/s);
});

test("templates page uses the polished public topbar shell", () => {
  assert.match(templatesPage, /className="settings-page-topbar public-page-topbar templates-topbar"/);
});

test("public topbar has a contained rounded shape with grouped actions", () => {
  assert.match(globals, /\.legal-topbar,\s*\.public-page-topbar\s*\{(?=[^}]*width:\s*min\(1180px,\s*calc\(100%\s*-\s*clamp\(32px,\s*7vw,\s*144px\)\)\))(?=[^}]*border-radius:\s*999px)[^}]*\}/s);
  assert.match(globals, /\.public-page-topbar\s+\.brand\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*min-height:\s*48px)[^}]*\}/s);
  assert.match(globals, /\.legal-topbar\s+\.brand,\s*\.public-page-topbar\s+\.brand\s*\{(?=[^}]*min-height:\s*58px)(?=[^}]*border-radius:\s*999px)[^}]*\}/s);
  assert.match(globals, /\.legal-topbar\s+\.settings-page-actions,\s*\.public-page-topbar\s+\.settings-page-actions\s*\{(?=[^}]*min-height:\s*58px)(?=[^}]*border-radius:\s*999px)[^}]*\}/s);
});

test("public topbar has dark and narrow viewport polish", () => {
  assert.match(globals, /html\[data-theme="dark"\]\s+\.public-page-topbar\s*\{(?=[^}]*border-color:\s*rgba\(255,\s*247,\s*233,\s*0\.13\))(?=[^}]*radial-gradient\(ellipse at 14% -24%,\s*rgba\(222,\s*162,\s*79,\s*0\.14\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.public-page-topbar::before\s*\{(?=[^}]*#f3c16d)(?=[^}]*rgba\(142,\s*183,\s*240,\s*0\.82\))[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.public-page-topbar\s+\.settings-page-actions\s*\{(?=[^}]*border-color:\s*rgba\(255,\s*247,\s*233,\s*0\.13\))(?=[^}]*background:\s*linear-gradient\(180deg,\s*rgba\(255,\s*247,\s*233,\s*0\.07\),\s*rgba\(255,\s*247,\s*233,\s*0\.03\)\))[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.public-page-topbar\s*\{(?=[^}]*width:\s*min\(100%,\s*760px\))(?=[^}]*border-radius:\s*30px)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.public-page-topbar\s*\{(?=[^}]*width:\s*100%)(?=[^}]*border-radius:\s*26px)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.public-page-topbar\s+\.settings-page-actions\s*\{(?=[^}]*width:\s*100%)(?=[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto\s+auto)[^}]*\}/s);
});
