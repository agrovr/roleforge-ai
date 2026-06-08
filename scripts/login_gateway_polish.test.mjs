import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globals = readFileSync("app/globals.css", "utf8");
const loginPage = readFileSync("app/login/page.tsx", "utf8");

test("login gateway keeps real auth actions while using a polished shell", () => {
  assert.match(loginPage, /href=\{`\/auth\/oauth\?provider=google&next=/);
  assert.match(loginPage, /action="\/auth\/signin"/);
  assert.match(globals, /\.login-shell\s*\{(?=[^}]*position:\s*relative)(?=[^}]*isolation:\s*isolate)(?=[^}]*background-size:\s*38px 38px,\s*38px 38px)[^}]*\}/s);
  assert.match(globals, /\.login-shell::before,\s*\.login-shell::after\s*\{/);
});

test("login gateway topbar and sign-in card use refined product surfaces", () => {
  assert.match(globals, /\.login-nav\s*\{(?=[^}]*width:\s*min\(1180px,\s*calc\(100% - clamp\(0px,\s*2vw,\s*28px\)\)\))(?=[^}]*border-radius:\s*clamp\(22px,\s*2\.2vw,\s*30px\))(?=[^}]*backdrop-filter:\s*blur\(20px\) saturate\(1\.08\))[^}]*\}/s);
  assert.match(globals, /\.login-card\s*\{(?=[^}]*position:\s*relative)(?=[^}]*overflow:\s*hidden)[^}]*\}/s);
  assert.match(globals, /\.login-card::before,\s*\.login-card::after\s*\{/);
  assert.match(globals, /\.login-card > \*\s*\{(?=[^}]*z-index:\s*1)[^}]*\}/s);
});

test("login protected preview has restrained motion with dark and reduced-motion support", () => {
  assert.match(globals, /\.login-studio-preview::after\s*\{(?=[^}]*linear-gradient\(90deg,\s*var\(--good\),\s*var\(--brand\),\s*var\(--accent\)\))[^}]*\}/s);
  assert.match(globals, /\.login-preview-sheet div::before\s*\{/);
  assert.match(globals, /@keyframes\s+login-preview-meter/);
  assert.match(globals, /prefers-reduced-motion:\s*reduce[\s\S]*\.login-studio-preview::after[\s\S]*animation:\s*none/);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.login-nav\s*\{/);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.login-card::after\s*\{/);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.login-preview-sheet div::before\s*\{/);
});
