import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { stylesFor } from "./style_sources.mjs";

const notFoundPage = readFileSync("app/not-found.tsx", "utf8");
const globals = stylesFor("public-pages.css");
const smokeLayout = readFileSync("scripts/smoke_layout.mjs", "utf8");

test("not found page provides branded recovery without generic framework UI", () => {
  assert.match(notFoundPage, /className="legal-shell not-found-shell"/);
  assert.match(notFoundPage, /Route not found/);
  assert.match(notFoundPage, /This page slipped out of the stack\./);
  assert.match(notFoundPage, /href="\//);
  assert.match(notFoundPage, /href="\/app"/);
  assert.match(notFoundPage, /href:\s*"\/templates"/);
  assert.match(notFoundPage, /href:\s*"\/status"/);
  assert.match(notFoundPage, /href:\s*"\/support"/);
  assert.match(notFoundPage, /<ThemeToggle \/>/);
});

test("not found surface has detailed responsive visual treatment", () => {
  assert.match(globals, /\.not-found-hero\s*\{(?=[^}]*grid-template-columns:\s*minmax\(0,\s*0\.95fr\)\s+minmax\(min\(100%,\s*310px\),\s*0\.52fr\))(?=[^}]*animation:\s*public-page-rise)[^}]*\}/s);
  assert.match(globals, /\.not-found-docket\s*\{(?=[^}]*overflow:\s*hidden)(?=[^}]*background-size:\s*18px 18px,\s*auto,\s*auto)(?=[^}]*isolation:\s*isolate)[^}]*\}/s);
  assert.match(globals, /\.not-found-docket::before\s*\{(?=[^}]*height:\s*2px)(?=[^}]*animation:\s*not-found-scan 4\.8s ease-in-out infinite)[^}]*\}/s);
  assert.match(globals, /\.not-found-recovery\s*\{(?=[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\))[^}]*\}/s);
  assert.match(globals, /\.not-found-recovery-card\s*\{(?=[^}]*grid-template-columns:\s*42px minmax\(0,\s*1fr\) auto)(?=[^}]*transition:\s*border-color 180ms ease,\s*box-shadow 180ms ease,\s*transform 180ms ease)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.not-found-hero,[\s\S]*?\.not-found-recovery\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(globals, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.not-found-actions\s*\{[^}]*grid-template-columns:\s*1fr/s);
});

test("not found page supports dark mode reduced motion and rendered smoke", () => {
  assert.match(globals, /html\[data-theme="dark"\]\s+\.not-found-docket,\s*html\[data-theme="dark"\]\s+\.not-found-recovery-card\s*\{(?=[^}]*rgba\(255,\s*247,\s*233,\s*0\.16\))[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.not-found-recovery-icon\s*\{(?=[^}]*rgba\(127,\s*200,\s*184,\s*0\.22\))(?=[^}]*color:\s*var\(--accent\))[^}]*\}/s);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.not-found-docket::before\s*\{[^}]*animation:\s*none/s);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.not-found-recovery-card:focus-visible\s*\{[^}]*transform:\s*none/s);
  assert.match(smokeLayout, /name:\s*"not-found"/);
  assert.match(smokeLayout, /path:\s*"\/missing-layout-smoke"/);
});
