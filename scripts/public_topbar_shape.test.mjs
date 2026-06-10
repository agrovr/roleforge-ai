import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const templatesPage = readFileSync("app/templates/page.tsx", "utf8");
const globals = readFileSync("app/globals.css", "utf8");

test("public legal topbar uses a slim structured navigation dock", () => {
  assert.match(globals, /\.legal-topbar\s*\{(?=[^}]*position:\s*relative)(?=[^}]*width:\s*min\(1120px,\s*100%\))(?=[^}]*padding:\s*8px\s+8px\s+8px\s+12px)(?=[^}]*border:\s*1px solid)(?=[^}]*border-radius:\s*30px)(?=[^}]*backdrop-filter:\s*blur\(18px\) saturate\(1\.08\))(?=[^}]*overflow:\s*visible)[^}]*\}/s);
  assert.match(globals, /\.legal-topbar::before\s*\{(?=[^}]*content:\s*"";)(?=[^}]*mask-image:\s*linear-gradient\(180deg,\s*black 0 1px,\s*transparent 1px\))(?=[^}]*pointer-events:\s*none)[^}]*\}/s);
  assert.match(globals, /\.legal-topbar::after\s*\{(?=[^}]*inset:\s*12px clamp\(136px,\s*18vw,\s*240px\) 12px clamp\(168px,\s*24vw,\s*340px\))(?=[^}]*content:\s*"";)(?=[^}]*pointer-events:\s*none)[^}]*\}/s);
  assert.match(globals, /\.legal-topbar\s+\.brand\s*\{(?=[^}]*min-height:\s*48px)(?=[^}]*border:\s*0)(?=[^}]*border-radius:\s*22px)(?=[^}]*background:\s*transparent)(?=[^}]*transition:\s*border-color 170ms ease,\s*background 170ms ease,\s*transform 170ms ease,\s*box-shadow 170ms ease)[^}]*\}/s);
  assert.match(globals, /\.legal-topbar\s+\.settings-page-actions\s*\{(?=[^}]*min-height:\s*48px)(?=[^}]*padding:\s*4px)(?=[^}]*border:\s*1px solid)(?=[^}]*border-radius:\s*999px)(?=[^}]*background:\s*color-mix\(in srgb,\s*var\(--surface\)\s*66%,\s*transparent\))[^}]*\}/s);
  assert.match(globals, /\.legal-topbar\s+\.settings-page-actions\s+\.btn,[\s\S]*?\.legal-topbar\s+\.settings-page-actions\s+\.public-topbar-avatar\s*\{(?=[^}]*min-height:\s*42px)(?=[^}]*border-radius:\s*999px)[^}]*\}/s);
});

test("public legal topbar keeps dark mode and mobile actions shaped safely", () => {
  assert.match(globals, /html\[data-theme="dark"\]\s+\.legal-topbar\s*\{(?=[^}]*border-color:\s*rgba\(255,\s*247,\s*233,\s*0\.13\))(?=[^}]*radial-gradient\(circle at 0% 0%,\s*rgba\(222,\s*162,\s*79,\s*0\.14\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.legal-topbar::before\s*\{(?=[^}]*content:\s*"";)(?=[^}]*rgba\(222,\s*162,\s*79,\s*0\.22\))[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.legal-topbar::after\s*\{(?=[^}]*content:\s*"";)(?=[^}]*rgba\(255,\s*247,\s*233,\s*0\.14\))[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.legal-topbar\s+\.settings-page-actions\s*\{(?=[^}]*border-color:\s*rgba\(255,\s*247,\s*233,\s*0\.13\))(?=[^}]*background:\s*rgba\(255,\s*247,\s*233,\s*0\.045\))[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.legal-topbar\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*1fr)(?=[^}]*padding:\s*8px)(?=[^}]*border-radius:\s*18px)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.legal-topbar\s+\.settings-page-actions\s*\{(?=[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\))(?=[^}]*border-top:\s*1px solid)(?=[^}]*border-radius:\s*14px)[^}]*\}/s);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.legal-topbar\s+\.brand,[\s\S]*?\.public-page-topbar\s+\.brand\s*\{[\s\S]*?transition:\s*none;[\s\S]*?\}/s);
});

test("templates page uses the polished public topbar shell", () => {
  assert.match(templatesPage, /className="settings-page-topbar public-page-topbar templates-topbar"/);
});

test("public topbar has a contained rounded shape with grouped actions", () => {
  assert.match(globals, /\.public-page-topbar\s*\{(?=[^}]*width:\s*min\(1120px,\s*100%\))(?=[^}]*padding:\s*8px\s+8px\s+8px\s+12px)(?=[^}]*border:\s*1px solid)(?=[^}]*border-radius:\s*30px)(?=[^}]*backdrop-filter:\s*blur\(18px\) saturate\(1\.08\))(?=[^}]*overflow:\s*visible)[^}]*\}/s);
  assert.match(globals, /\.public-page-topbar::before\s*\{(?=[^}]*content:\s*"";)(?=[^}]*mask-image:\s*linear-gradient\(180deg,\s*black 0 1px,\s*transparent 1px\))(?=[^}]*pointer-events:\s*none)[^}]*\}/s);
  assert.match(globals, /\.public-page-topbar::after\s*\{(?=[^}]*inset:\s*12px clamp\(136px,\s*18vw,\s*240px\) 12px clamp\(168px,\s*24vw,\s*340px\))(?=[^}]*content:\s*"";)(?=[^}]*pointer-events:\s*none)[^}]*\}/s);
  assert.match(globals, /\.public-page-topbar\s+\.brand\s*\{(?=[^}]*border-radius:\s*22px)(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)(?=[^}]*transition:\s*border-color 170ms ease,\s*background 170ms ease,\s*transform 170ms ease,\s*box-shadow 170ms ease)[^}]*\}/s);
  assert.match(globals, /\.public-page-topbar\s+\.settings-page-actions\s*\{(?=[^}]*border:\s*1px solid)(?=[^}]*border-radius:\s*999px)(?=[^}]*background:\s*color-mix\(in srgb,\s*var\(--surface\)\s*66%,\s*transparent\))[^}]*\}/s);
  assert.match(globals, /\.public-page-topbar\s+\.settings-page-actions\s+\.btn,[\s\S]*?\.public-page-topbar\s+\.settings-page-actions\s+\.public-topbar-avatar\s*\{(?=[^}]*min-height:\s*42px)(?=[^}]*border-radius:\s*999px)[^}]*\}/s);
});

test("public topbar has dark and narrow viewport polish", () => {
  assert.match(globals, /html\[data-theme="dark"\]\s+\.public-page-topbar\s*\{(?=[^}]*border-color:\s*rgba\(255,\s*247,\s*233,\s*0\.13\))(?=[^}]*radial-gradient\(circle at 0% 0%,\s*rgba\(222,\s*162,\s*79,\s*0\.14\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.public-page-topbar::before\s*\{(?=[^}]*content:\s*"";)(?=[^}]*rgba\(222,\s*162,\s*79,\s*0\.22\))[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.public-page-topbar\s+\.settings-page-actions\s*\{(?=[^}]*border-color:\s*rgba\(255,\s*247,\s*233,\s*0\.13\))(?=[^}]*background:\s*rgba\(255,\s*247,\s*233,\s*0\.045\))[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.public-page-topbar\s*\{(?=[^}]*width:\s*min\(100%,\s*760px\))(?=[^}]*border-radius:\s*22px)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.public-page-topbar\s*\{(?=[^}]*width:\s*100%)(?=[^}]*border-radius:\s*22px)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.public-page-topbar\s+\.settings-page-actions\s*\{(?=[^}]*width:\s*100%)(?=[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto\s+auto)[^}]*\}/s);
});
