import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const templatesPage = readFileSync("app/templates/page.tsx", "utf8");
const globals = readFileSync("app/globals.css", "utf8");

test("public legal topbar uses a slim structured navigation dock", () => {
  assert.match(globals, /\.legal-topbar\s*\{(?=[^}]*width:\s*min\(1220px,\s*100%\))(?=[^}]*min-height:\s*62px)(?=[^}]*border-radius:\s*18px)(?=[^}]*backdrop-filter:\s*blur\(16px\) saturate\(1\.05\))(?=[^}]*overflow:\s*clip)[^}]*\}/s);
  assert.match(globals, /\.legal-topbar::before\s*\{(?=[^}]*content:\s*"";)(?=[^}]*position:\s*absolute)(?=[^}]*inset-inline:\s*22px)(?=[^}]*height:\s*1px)[^}]*\}/s);
  assert.match(globals, /\.legal-topbar::after\s*\{(?=[^}]*content:\s*"";)(?=[^}]*position:\s*absolute)(?=[^}]*inset-block-end:\s*0)(?=[^}]*height:\s*1px)[^}]*\}/s);
  assert.match(globals, /\.legal-topbar\s+\.brand,\s*\.legal-topbar\s+\.settings-page-actions\s*\{(?=[^}]*border:\s*0)(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)[^}]*\}/s);
  assert.match(globals, /\.legal-topbar\s+\.brand\s*\{(?=[^}]*min-height:\s*48px)(?=[^}]*border-radius:\s*14px)(?=[^}]*transition:\s*background 170ms ease,\s*transform 170ms ease)[^}]*\}/s);
  assert.match(globals, /\.legal-topbar\s+\.settings-page-actions\s*\{(?=[^}]*min-height:\s*48px)(?=[^}]*padding-left:\s*12px)(?=[^}]*border-left:\s*1px solid)(?=[^}]*border-radius:\s*14px)[^}]*\}/s);
  assert.match(globals, /\.legal-topbar\s+\.settings-page-actions\s+\.btn,[\s\S]*?\.legal-topbar\s+\.settings-page-actions\s+\.public-topbar-avatar\s*\{(?=[^}]*min-height:\s*42px)(?=[^}]*border-radius:\s*14px)[^}]*\}/s);
});

test("public legal topbar keeps dark mode and mobile actions shaped safely", () => {
  assert.match(globals, /html\[data-theme="dark"\]\s+\.legal-topbar\s*\{(?=[^}]*border-color:\s*rgba\(255,\s*247,\s*233,\s*0\.16\))(?=[^}]*linear-gradient\(180deg,\s*rgba\(22,\s*27,\s*46,\s*0\.88\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.legal-topbar::before\s*\{(?=[^}]*rgba\(255,\s*247,\s*233,\s*0\.34\))(?=[^}]*opacity:\s*0\.72)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.legal-topbar::after\s*\{(?=[^}]*rgba\(221,\s*160,\s*74,\s*0\.22\))(?=[^}]*opacity:\s*0\.58)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.legal-topbar\s+\.brand,\s*html\[data-theme="dark"\]\s+\.legal-topbar\s+\.settings-page-actions\s*\{(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.legal-topbar\s+\.settings-page-actions\s*\{(?=[^}]*border-left-color:\s*rgba\(255,\s*247,\s*233,\s*0\.13\))[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.legal-topbar\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*1fr)(?=[^}]*padding:\s*8px)(?=[^}]*border-radius:\s*18px)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.legal-topbar\s+\.settings-page-actions\s*\{(?=[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\))(?=[^}]*border-top:\s*1px solid)(?=[^}]*border-radius:\s*14px)[^}]*\}/s);
});

test("templates page uses the polished public topbar shell", () => {
  assert.match(templatesPage, /className="settings-page-topbar public-page-topbar templates-topbar"/);
});

test("public topbar has a contained rounded shape with grouped actions", () => {
  assert.match(globals, /\.public-page-topbar\s*\{(?=[^}]*width:\s*min\(1200px,\s*100%\))(?=[^}]*border-radius:\s*24px)(?=[^}]*overflow:\s*clip)[^}]*\}/s);
  assert.match(globals, /\.public-page-topbar::before\s*\{/);
  assert.match(globals, /\.public-page-topbar::after\s*\{/);
  assert.match(globals, /\.public-page-topbar\s+\.settings-page-actions\s*\{(?=[^}]*border-radius:\s*18px)(?=[^}]*background:\s*color-mix)[^}]*\}/s);
  assert.match(globals, /\.public-page-topbar\s+\.settings-page-actions\s+\.btn,[\s\S]*?\.public-page-topbar\s+\.settings-page-actions\s+\.public-topbar-avatar\s*\{(?=[^}]*min-height:\s*44px)(?=[^}]*border-radius:\s*15px)[^}]*\}/s);
});

test("public topbar has dark and narrow viewport polish", () => {
  assert.match(globals, /html\[data-theme="dark"\]\s+\.public-page-topbar\s*\{/);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.public-page-topbar\s+\.settings-page-actions\s*\{/);
  assert.match(globals, /@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.public-page-topbar\s*\{(?=[^}]*width:\s*min\(100%,\s*760px\))(?=[^}]*border-radius:\s*22px)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.public-page-topbar\s*\{(?=[^}]*width:\s*100%)(?=[^}]*border-radius:\s*22px)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.public-page-topbar\s+\.settings-page-actions\s*\{(?=[^}]*width:\s*100%)(?=[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto\s+auto)[^}]*\}/s);
});
