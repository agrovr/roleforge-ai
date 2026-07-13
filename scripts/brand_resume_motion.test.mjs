import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globals = readFileSync("app/globals.css", "utf8");

test("shared brand mark has a crafted hover and glint treatment", () => {
  assert.match(globals, /\.brand::after\s*\{/);
  assert.match(globals, /\.brand:hover \.brand-mark,\s*\.brand:focus-visible \.brand-mark\s*\{/);
  assert.match(globals, /\.brand-mark-sheet::after\s*\{/);
  assert.match(globals, /@keyframes\s+rf-brand-glint/);
  assert.match(globals, /\.brand:hover \.brand-mark-sheet::after/);
  assert.doesNotMatch(globals, /\.brand-mark-sheet::after\s*\{[^}]*animation:[^}]*infinite/s);
});

test("resume preview artwork has paper texture and controlled motion", () => {
  assert.match(globals, /\.r-doc::before\s*\{/);
  assert.match(globals, /\.r-doc::after\s*\{/);
  assert.match(globals, /\.hero-stage:hover \.resume-card \.r-doc::after/);
  assert.match(globals, /@keyframes\s+rf-resume-paper-glint/);
  assert.doesNotMatch(globals, /\.hero-stage:not\(:hover\) \.resume-card-front\s*\{[\s\S]*?animation:/);
});

test("resume highlight motion is interaction-led and respects reduced-motion settings", () => {
  assert.match(globals, /\.r-hl\s*\{[^}]*background-image:\s*linear-gradient/s);
  assert.match(globals, /\.r-hl-good\s*\{[^}]*background-image:\s*linear-gradient/s);
  assert.match(globals, /@keyframes\s+rf-highlight-scan/);
  assert.match(globals, /:hover :where\(\.r-hl, \.r-hl-good\)/);
  assert.doesNotMatch(globals, /\.r-hl(?:-good)?\s*\{[^}]*animation:[^}]*infinite/s);
  assert.match(globals, /prefers-reduced-motion:\s*reduce[\s\S]*\.r-hl,[\s\S]*\.r-hl-good[\s\S]*animation:\s*none/);
});
