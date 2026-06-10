import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globals = readFileSync("app/globals.css", "utf8");

test("settings command rail has layered depth and active navigation states", () => {
  assert.match(globals, /\/\* Settings command rail: denser navigation with polished active states\. \*\//);
  assert.match(globals, /\.settings-page-nav\s*\{(?=[^}]*isolation:\s*isolate)(?=[^}]*border-radius:\s*22px)(?=[^}]*radial-gradient\(circle at 0% 0%)(?=[^}]*box-shadow:)(?=[^}]*overflow:\s*hidden)[^}]*\}/s);
  assert.match(globals, /\.settings-page-nav::before\s*\{(?=[^}]*height:\s*3px)(?=[^}]*linear-gradient\(90deg,\s*var\(--brand\),\s*var\(--accent\),\s*var\(--sky\)\))[^}]*\}/s);
  assert.match(globals, /\.settings-page-nav::after\s*\{(?=[^}]*repeating-linear-gradient\(135deg)(?=[^}]*pointer-events:\s*none)[^}]*\}/s);
  assert.match(globals, /\.settings-section-search,\s*\.settings-task-shortcuts,\s*\.settings-section-list,\s*\.settings-section-empty\s*\{(?=[^}]*position:\s*relative)(?=[^}]*z-index:\s*1)[^}]*\}/s);
  assert.match(globals, /\.settings-page-nav\s+a\.active\s*\{(?=[^}]*linear-gradient\(135deg,\s*#12172f 0%,\s*#191d38 58%,\s*#2a2230 100%\))(?=[^}]*color:\s*#fff7e9)[^}]*\}/s);
});

test("settings command rail links and search have tactile but safe motion", () => {
  assert.match(globals, /\.settings-section-search\s*>\s*div\s*\{(?=[^}]*border-radius:\s*14px)(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /\.settings-task-shortcuts\s+a,\s*\.settings-page-nav\s+a\s*\{(?=[^}]*position:\s*relative)(?=[^}]*isolation:\s*isolate)(?=[^}]*transition:)[^}]*\}/s);
  assert.match(globals, /\.settings-task-shortcuts\s+a::before,\s*\.settings-page-nav\s+a::before\s*\{(?=[^}]*width:\s*3px)(?=[^}]*linear-gradient\(180deg,\s*var\(--brand\),\s*var\(--accent\),\s*var\(--sky\)\))[^}]*\}/s);
  assert.match(globals, /\.settings-page-nav\s+a:hover\s+svg,[\s\S]*?\.settings-page-nav\s+a\.active\s+svg\s*\{(?=[^}]*transform:\s*translateX\(1px\))[^}]*\}/s);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.settings-task-shortcuts\s+a,[\s\S]*?\.settings-page-nav\s+a\s+svg\s*\{[\s\S]*?transition:\s*none;[\s\S]*?\}/s);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.settings-page-nav\s+a\.active\s+svg\s*\{[\s\S]*?transform:\s*none;[\s\S]*?\}/s);
});

test("settings command rail has matching dark-mode polish", () => {
  assert.match(globals, /html\[data-theme="dark"\]\s+\.settings-page-nav\s*\{(?=[^}]*radial-gradient\(circle at 0% 0%,\s*rgba\(222,\s*162,\s*79,\s*0\.13\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.settings-page-nav::after\s*\{(?=[^}]*rgba\(255,\s*247,\s*233,\s*0\.034\))(?=[^}]*opacity:\s*0\.46)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.settings-page-nav\s+a\.active,[\s\S]*?html\[data-theme="dark"\]\s+\.settings-page-nav\s+a:focus-visible\s*\{(?=[^}]*border-color:\s*rgba\(222,\s*162,\s*79,\s*0\.36\))(?=[^}]*color:\s*#fff7e9)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.settings-page-nav\s+a\.active\s*\{(?=[^}]*rgba\(222,\s*162,\s*79,\s*0\.55\))[^}]*\}/s);
});
