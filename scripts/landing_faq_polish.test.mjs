import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const accordion = readFileSync("app/components/FaqAccordion.tsx", "utf8");
const globals = readFileSync("app/globals.css", "utf8");
const smokeLayout = readFileSync("scripts/smoke_layout.mjs", "utf8");

test("FAQ accordion exposes polished disclosure markup", () => {
  assert.match(accordion, /type FaqItem = readonly \[topic: string, question: string, answer: string\]/);
  assert.match(accordion, /className="faq-question-copy"/);
  assert.match(accordion, /className="faq-topic"/);
  assert.match(accordion, /className="faq-question-text"/);
  assert.match(accordion, /className="faq-toggle"[\s\S]*?<span \/>[\s\S]*?<span \/>/);
  assert.match(accordion, /aria-controls=\{answerId\}/);
  assert.match(accordion, /aria-expanded=\{isOpen\}/);
  assert.match(accordion, /aria-labelledby=\{questionId\}[\s\S]*?role="region"/);
});

test("FAQ uses a compact disclosure ledger with localized feedback", () => {
  assert.match(globals, /\/\* Landing FAQ refinement: a calm disclosure ledger with responsive feedback\. \*\//);
  assert.match(globals, /\.faq-grid\s*\{(?=[^}]*grid-template-columns:\s*1fr)(?=[^}]*gap:\s*0)(?=[^}]*width:\s*min\(100%,\s*960px\))(?=[^}]*border-block-start:\s*1px solid)[^}]*\}/s);
  assert.match(globals, /\.faq-item\s*\{(?=[^}]*padding:\s*0)(?=[^}]*border:\s*0)(?=[^}]*border-radius:\s*14px)(?=[^}]*background:\s*transparent)(?=[^}]*transition:\s*background 220ms)[^}]*\}/s);
  assert.match(globals, /\.faq-item \+ \.faq-item\s*\{[^}]*border-block-start:\s*1px solid[^}]*\}/s);
  assert.match(globals, /\.faq-q\s*\{(?=[^}]*grid-template-columns:\s*48px minmax\(0,\s*1fr\) 28px)(?=[^}]*min-height:\s*72px)(?=[^}]*padding:\s*14px 2px)[^}]*\}/s);
  assert.match(globals, /\.faq-q::before\s*\{(?=[^}]*border:\s*0)(?=[^}]*border-radius:\s*0)(?=[^}]*background:\s*transparent)(?=[^}]*font-size:\s*0\.7rem)[^}]*\}/s);
  assert.match(globals, /\.faq-question-copy\s*\{(?=[^}]*display:\s*grid)(?=[^}]*min-width:\s*0)(?=[^}]*gap:\s*3px)[^}]*\}/s);
  assert.match(globals, /\.faq-topic\s*\{(?=[^}]*font-family:\s*var\(--font-mono\))(?=[^}]*font-size:\s*0\.63rem)(?=[^}]*letter-spacing:\s*0\.12em)(?=[^}]*text-transform:\s*uppercase)[^}]*\}/s);
  assert.match(globals, /\.faq-toggle\s*\{(?=[^}]*border:\s*1px solid)(?=[^}]*border-radius:\s*9px)(?=[^}]*background:)[^}]*\}/s);
  assert.match(globals, /\.faq-a\s*\{(?=[^}]*opacity:\s*0)(?=[^}]*transform:\s*translateY\(-6px\))(?=[^}]*transition:[^}]*opacity 200ms ease)[^}]*\}/s);
  assert.match(globals, /\.faq-item\.open \.faq-a,\s*\.faq-item\[open\] \.faq-a\s*\{(?=[^}]*opacity:\s*1)(?=[^}]*transform:\s*translateY\(0\))[^}]*\}/s);
  assert.match(globals, /\.faq-toggle\s+span:nth-child\(2\)\s*\{(?=[^}]*transform:\s*rotate\(90deg\))[^}]*\}/s);
  assert.match(globals, /\.faq-item\.open\s+\.faq-toggle\s+span:nth-child\(2\),\s*\.faq-item\[open\]\s+\.faq-toggle\s+span:nth-child\(2\)\s*\{(?=[^}]*opacity:\s*0)[^}]*\}/s);
});

test("FAQ polish covers dark mode reduced motion and rendered smoke", () => {
  assert.match(globals, /html\[data-theme="dark"\]\s+\.faq-q::before\s*\{(?=[^}]*border:\s*0)(?=[^}]*background:\s*transparent)(?=[^}]*color:\s*#f0bb69)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.faq-topic\s*\{[^}]*color:\s*#d8a65e[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.faq-item:nth-child\(n\)\s*\{(?=[^}]*background:\s*transparent)(?=[^}]*box-shadow:\s*none)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.faq-item:nth-child\(n\):hover,[\s\S]*?html\[data-theme="dark"\]\s+\.faq-item:nth-child\(n\)\[open\]\s*\{(?=[^}]*background:\s*rgba\(255,\s*247,\s*233,\s*0\.035\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.faq-q\s*\{(?=[^}]*grid-template-columns:\s*36px minmax\(0,\s*1fr\) 24px)(?=[^}]*min-height:\s*66px)[^}]*\}/s);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.faq-item,[\s\S]*?\.faq-toggle,[\s\S]*?\.faq-toggle span,[\s\S]*?\{[^}]*transition:\s*none/s);
  assert.match(smokeLayout, /"\.faq-grid"/);
  assert.match(smokeLayout, /"\.faq-question-text"/);
  assert.match(smokeLayout, /"\.faq-item\.open \.faq-a"/);
});
