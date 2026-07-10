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

test("FAQ uses a compact divided disclosure list without card chrome", () => {
  assert.match(globals, /\/\* Landing FAQ refinement: a divided disclosure list without card chrome\. \*\//);
  assert.match(globals, /\.faq-grid\s*\{(?=[^}]*grid-template-columns:\s*1fr)(?=[^}]*gap:\s*0)(?=[^}]*width:\s*min\(100%,\s*960px\))(?=[^}]*border-block-start:\s*1px solid)[^}]*\}/s);
  assert.match(globals, /\.faq-item\s*\{(?=[^}]*padding:\s*0)(?=[^}]*border:\s*0)(?=[^}]*border-radius:\s*0)(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)(?=[^}]*transition:\s*none)[^}]*\}/s);
  assert.match(globals, /\.faq-item \+ \.faq-item\s*\{[^}]*border-block-start:\s*1px solid[^}]*\}/s);
  assert.match(globals, /\.faq-q\s*\{(?=[^}]*grid-template-columns:\s*48px minmax\(0,\s*1fr\) 28px)(?=[^}]*min-height:\s*72px)(?=[^}]*padding:\s*14px 2px)[^}]*\}/s);
  assert.match(globals, /\.faq-q::before\s*\{(?=[^}]*border:\s*0)(?=[^}]*border-radius:\s*0)(?=[^}]*background:\s*transparent)(?=[^}]*font-size:\s*0\.7rem)[^}]*\}/s);
  assert.match(globals, /\.faq-toggle\s*\{(?=[^}]*border:\s*0)(?=[^}]*border-radius:\s*0)(?=[^}]*background:\s*transparent)[^}]*\}/s);
  assert.match(globals, /\.faq-a\s*\{(?=[^}]*border-top:\s*0)(?=[^}]*transition:\s*max-height 260ms ease,\s*margin-top 260ms ease)[^}]*\}/s);
  assert.match(globals, /\.faq-toggle\s+span:nth-child\(2\)\s*\{(?=[^}]*transform:\s*rotate\(90deg\))[^}]*\}/s);
  assert.match(globals, /\.faq-item\.open\s+\.faq-toggle\s+span:nth-child\(2\),\s*\.faq-item\[open\]\s+\.faq-toggle\s+span:nth-child\(2\)\s*\{(?=[^}]*opacity:\s*0)[^}]*\}/s);
});

test("FAQ polish covers dark mode reduced motion and rendered smoke", () => {
  assert.match(globals, /html\[data-theme="dark"\]\s+\.faq-q::before\s*\{(?=[^}]*border:\s*0)(?=[^}]*background:\s*transparent)(?=[^}]*color:\s*#f0bb69)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.faq-item:nth-child\(n\),[\s\S]*?html\[data-theme="dark"\]\s+\.faq-item:nth-child\(n\)\[open\]\s*\{(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.faq-q\s*\{(?=[^}]*grid-template-columns:\s*36px minmax\(0,\s*1fr\) 24px)(?=[^}]*min-height:\s*66px)[^}]*\}/s);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.faq-item,[\s\S]*?\.faq-toggle,[\s\S]*?\.faq-toggle span,[\s\S]*?\{[^}]*transition:\s*none/s);
  assert.match(smokeLayout, /"\.faq-grid"/);
  assert.match(smokeLayout, /"\.faq-question-text"/);
  assert.match(smokeLayout, /"\.faq-item\.open \.faq-a"/);
});
