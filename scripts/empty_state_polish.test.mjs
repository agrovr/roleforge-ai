import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appPage = readFileSync("app/app/page.tsx", "utf8");
const globals = readFileSync("app/globals.css", "utf8");
const sitePolish = readFileSync("app/components/SitePolish.tsx", "utf8");

test("studio empty states remain real workflow surfaces", () => {
  assert.match(appPage, /<div className="empty-state">[\s\S]*?Suggestions are waiting/);
  assert.match(appPage, /<div className="empty-state">[\s\S]*?\{historyEmptyTitle\}/);
  assert.match(sitePolish, /"\.empty-state"/);
});

test("empty states have a polished marker rail and tactile state", () => {
  assert.match(globals, /\.empty-state\s*\{(?=[^}]*position:\s*relative)(?=[^}]*display:\s*grid)(?=[^}]*min-block-size:\s*148px)(?=[^}]*padding:\s*18px 18px 18px 76px)(?=[^}]*transition:\s*border-color 170ms ease,\s*box-shadow 170ms ease,\s*transform 170ms ease)[^}]*\}/s);
  assert.match(globals, /\.empty-state::before\s*\{(?=[^}]*width:\s*40px)(?=[^}]*conic-gradient\(from 140deg)(?=[^}]*content:\s*"";)[^}]*\}/s);
  assert.match(globals, /\.empty-state::after\s*\{(?=[^}]*height:\s*3px)(?=[^}]*linear-gradient\(90deg,\s*var\(--brand\),\s*var\(--accent\),\s*var\(--sky\)\))(?=[^}]*transform:\s*scaleX\(0\.72\))[^}]*\}/s);
  assert.match(globals, /\.empty-state:hover,\s*\.empty-state:focus-within\s*\{(?=[^}]*border-color:)(?=[^}]*transform:\s*translateY\(-1px\))[^}]*\}/s);
  assert.match(globals, /\.empty-state\s*>\s*\*\s*\{(?=[^}]*position:\s*relative)(?=[^}]*z-index:\s*1)[^}]*\}/s);
});

test("empty states are dark-mode mobile and reduced-motion safe", () => {
  assert.match(globals, /html\[data-theme="dark"\]\s+\.empty-state\s*\{(?=[^}]*rgba\(18,\s*24,\s*40,\s*0\.86\))(?=[^}]*background-size:\s*22px 22px,\s*auto,\s*auto,\s*auto)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.empty-state::before\s*\{(?=[^}]*#f3c16d)(?=[^}]*conic-gradient\(from 140deg)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.empty-state\s*\{(?=[^}]*min-block-size:\s*0)(?=[^}]*padding:\s*16px)[^}]*\}[\s\S]*?\.empty-state::before\s*\{(?=[^}]*position:\s*relative)(?=[^}]*width:\s*34px)[^}]*\}/s);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.empty-state,\s*\.empty-state::after\s*\{[^}]*transition:\s*none;[^}]*\}\s*\.empty-state:hover,\s*\.empty-state:focus-within\s*\{[^}]*transform:\s*none/s);
});
