import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { allStudioStyles } from "./style_sources.mjs";

const studioPage = readFileSync("app/app/page.tsx", "utf8");
const globals = allStudioStyles;

test("protected studio gate keeps real auth states and actions", () => {
  assert.match(studioPage, /function StudioAccountGate/);
  assert.match(studioPage, /state: "loading" \| "required"/);
  assert.match(studioPage, /Opening your workspace\./);
  assert.match(studioPage, /Sign in to open RoleForge AI\./);
  assert.match(studioPage, /href="\/login\?next=%2Fapp&account=signin-required"/);
  assert.match(studioPage, /className="studio-auth-preview-grid"/);
  assert.match(studioPage, /Session check/);
  assert.match(studioPage, /Saved projects/);
  assert.match(studioPage, /Export access/);
});

test("protected studio gate has a layered workspace preview surface", () => {
  assert.match(globals, /\.studio-auth-shell\s*\{(?=[^}]*background-size:\s*42px 42px,\s*42px 42px)[^}]*\}/s);
  assert.match(globals, /\.studio-auth-card\s*\{(?=[^}]*--studio-auth-rail:\s*linear-gradient\(180deg,\s*var\(--brand\),\s*var\(--accent\),\s*var\(--sky\)\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /\.studio-auth-card::after\s*\{(?=[^}]*background:\s*var\(--studio-auth-rail\))(?=[^}]*opacity:\s*0\.72)[^}]*\}/s);
  assert.match(globals, /\.studio-auth-preview\s*\{(?=[^}]*position:\s*relative)(?=[^}]*overflow:\s*hidden)(?=[^}]*border-radius:\s*18px)(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /\.studio-auth-preview::before\s*\{/);
  assert.match(globals, /\.studio-auth-preview::after\s*\{(?=[^}]*linear-gradient\(90deg,\s*var\(--good\),\s*var\(--brand\),\s*var\(--accent\)\))[^}]*\}/s);
  assert.match(globals, /\.studio-auth-preview-grid\s*\{(?=[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\))[^}]*\}/s);
  assert.match(globals, /\.studio-auth-preview-grid small\s*\{(?=[^}]*text-wrap:\s*balance)(?=[^}]*min-height:\s*46px)[^}]*\}/s);
});

test("protected studio gate covers dark mode reduced motion and phones", () => {
  assert.match(globals, /html\[data-theme="dark"\]\s+\.studio-auth-shell\s*\{/);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.studio-auth-card\s*\{(?=[^}]*--studio-auth-rail:\s*linear-gradient\(180deg,\s*#f3c16d,\s*#8fdac8,\s*#b9c7ff\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.studio-auth-preview\s*\{(?=[^}]*border-color:\s*rgba\(255,\s*247,\s*233,\s*0\.16\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.studio-auth-preview-grid small/);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.studio-auth-progress::before\s*\{(?=[^}]*animation:\s*none)(?=[^}]*transform:\s*translateX\(96%\))[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*520px\)\s*\{[\s\S]*?\.studio-auth-preview-grid\s*\{[^}]*grid-template-columns:\s*1fr[^}]*\}/s);
});
