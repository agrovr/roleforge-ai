import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const accordion = readFileSync("app/components/FaqAccordion.tsx", "utf8");
const globals = readFileSync("app/globals.css", "utf8");
const smokeLayout = readFileSync("scripts/smoke_layout.mjs", "utf8");

test("FAQ accordion exposes polished disclosure markup", () => {
  assert.match(accordion, /className="faq-question-text"/);
  assert.match(accordion, /className="faq-toggle"[\s\S]*?<span \/>[\s\S]*?<span \/>/);
  assert.match(accordion, /aria-controls=\{answerId\}/);
  assert.match(accordion, /aria-expanded=\{isOpen\}/);
});

test("FAQ cards use numbered rails and tactile disclosure controls", () => {
  assert.match(globals, /\.faq-grid\s*\{(?=[^}]*counter-reset:\s*faq-item)[^}]*\}/s);
  assert.match(globals, /\.faq-item\s*\{(?=[^}]*overflow:\s*hidden)(?=[^}]*counter-increment:\s*faq-item)(?=[^}]*transition:\s*border-color 180ms ease,\s*background 180ms ease,\s*box-shadow 180ms ease,\s*transform 180ms ease)[^}]*\}/s);
  assert.match(globals, /\.faq-item::before\s*\{(?=[^}]*width:\s*3px)(?=[^}]*background:\s*linear-gradient\(180deg,\s*var\(--brand\),\s*var\(--accent\)\))(?=[^}]*transform:\s*scaleY\(0\.62\))[^}]*\}/s);
  assert.match(globals, /\.faq-q\s*\{(?=[^}]*grid-template-columns:\s*auto minmax\(0,\s*1fr\) 30px)(?=[^}]*min-height:\s*44px)[^}]*\}/s);
  assert.match(globals, /\.faq-q::before\s*\{(?=[^}]*content:\s*counter\(faq-item,\s*decimal-leading-zero\))(?=[^}]*letter-spacing:\s*0)[^}]*\}/s);
  assert.match(globals, /\.faq-toggle\s+span:nth-child\(2\)\s*\{(?=[^}]*transform:\s*rotate\(90deg\))[^}]*\}/s);
  assert.match(globals, /\.faq-item\.open\s+\.faq-toggle\s+span:nth-child\(2\),\s*\.faq-item\[open\]\s+\.faq-toggle\s+span:nth-child\(2\)\s*\{(?=[^}]*opacity:\s*0)[^}]*\}/s);
});

test("FAQ polish covers dark mode reduced motion and rendered smoke", () => {
  assert.match(globals, /html\[data-theme="dark"\]\s+\.faq-q::before\s*\{(?=[^}]*rgba\(222,\s*162,\s*79,\s*0\.25\))(?=[^}]*color:\s*#f0bb69)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.faq-item::before\s*\{(?=[^}]*linear-gradient\(180deg,\s*var\(--brand\),\s*var\(--accent\)\))[^}]*\}/s);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.faq-item,[\s\S]*?\.faq-toggle,[\s\S]*?\.faq-toggle span,[\s\S]*?\{[^}]*transition:\s*none/s);
  assert.match(smokeLayout, /"\.faq-grid"/);
  assert.match(smokeLayout, /"\.faq-question-text"/);
  assert.match(smokeLayout, /"\.faq-item\.open \.faq-a"/);
});
