import assert from "node:assert/strict";
import test from "node:test";
import { allStudioStyles } from "./style_sources.mjs";

const globals = allStudioStyles;
const sectionStart = globals.indexOf("/* Account menu finish:");
assert.notEqual(sectionStart, -1, "account menu finish section is missing");
const section = globals.slice(sectionStart);

test("shared account popover has a layered cockpit surface", () => {
  assert.match(section, /\.studio-account-popover\s*\{(?=[^}]*isolation:\s*isolate)(?=[^}]*overflow-x:\s*hidden)(?=[^}]*scrollbar-color:)(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(section, /\.studio-account-popover::after\s*\{(?=[^}]*position:\s*absolute)(?=[^}]*border:\s*1px solid)(?=[^}]*pointer-events:\s*none)[^}]*\}/s);
  assert.match(section, /\.studio-account-popover\s+>\s+\*\s*\{(?=[^}]*position:\s*relative)(?=[^}]*z-index:\s*1)[^}]*\}/s);
  assert.match(section, /\.studio-account-popover-head\s*\{(?=[^}]*padding-bottom:\s*8px)(?=[^}]*border-bottom:\s*1px solid)[^}]*\}/s);
  assert.match(section, /\.studio-account-popover-head\s+span::before\s*\{(?=[^}]*width:\s*7px)(?=[^}]*box-shadow:\s*0 0 0 5px)[^}]*\}/s);
});

test("account identity and action cards get rails and tactile depth", () => {
  assert.match(section, /\.studio-account-identity\s*\{(?=[^}]*padding:\s*10px)(?=[^}]*border-radius:\s*14px)(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(section, /\.studio-account-avatar::after\s*\{(?=[^}]*width:\s*12px)(?=[^}]*background:\s*var\(--good\))[^}]*\}/s);
  assert.match(section, /\.studio-account-insights\s+a,\s*\.studio-account-next-actions\s+a,\s*\.studio-account-next-step,[\s\S]*?\.studio-account-utilities\s+a\s*\{(?=[^}]*position:\s*relative)(?=[^}]*overflow:\s*hidden)[^}]*\}/s);
  assert.match(section, /\.studio-account-insights\s+a::before,\s*\.studio-account-next-actions\s+a::before,\s*\.studio-account-next-step::before,[\s\S]*?\.studio-account-utilities\s+a::before\s*\{(?=[^}]*width:\s*3px)(?=[^}]*linear-gradient\(180deg,\s*var\(--brand\),\s*var\(--accent\)\))[^}]*\}/s);
  assert.match(section, /\.studio-account-next-step\.good::before,\s*\.studio-account-sync\.synced::before\s*\{(?=[^}]*linear-gradient\(180deg,\s*var\(--good\),\s*var\(--accent\)\))[^}]*\}/s);
});

test("account menu finish covers public width dark mode and reduced motion", () => {
  assert.match(section, /\.public-account-popover\s*\{(?=[^}]*width:\s*min\(440px,\s*calc\(100vw\s*-\s*30px\)\))[^}]*\}/s);
  assert.match(section, /html\[data-theme="dark"\]\s+\.studio-account-popover\s*\{(?=[^}]*rgba\(255,\s*247,\s*233,\s*0\.18\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(section, /html\[data-theme="dark"\]\s+\.studio-account-identity\s*\{(?=[^}]*rgba\(255,\s*247,\s*233,\s*0\.14\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(section, /html\[data-theme="dark"\]\s+\.studio-account-insights\s+a::before,[\s\S]*?html\[data-theme="dark"\]\s+\.studio-account-utilities\s+a::before\s*\{(?=[^}]*#efb863)(?=[^}]*#8fdac8)[^}]*\}/s);
  assert.match(section, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.studio-account-popover::after\s*\{(?=[^}]*inset:\s*7px)(?=[^}]*border-radius:\s*11px)[^}]*\}/s);
  assert.match(section, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.studio-account-insights\s+a,[\s\S]*?\.studio-account-submit\s*\{(?=[^}]*transition:\s*none)[^}]*\}/s);
});
