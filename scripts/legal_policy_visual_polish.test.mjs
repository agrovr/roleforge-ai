import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const legalPage = readFileSync("app/components/LegalPage.tsx", "utf8");
const globals = readFileSync("app/globals.css", "utf8");

test("shared legal page keeps a legitimate policy footer", () => {
  assert.match(legalPage, /aria-label="Policy footer"/);
  assert.match(legalPage, /&copy; \{currentYear\} RoleForge AI\. All rights reserved\./);
  assert.match(legalPage, /function sectionId\(title: string\)/);
  assert.match(legalPage, /className="legal-index"/);
  assert.match(legalPage, /Document map/);
  assert.match(legalPage, /href=\{`#\$\{section\.id\}`\}/);
  assert.match(legalPage, /id=\{sectionId\(section\.title\)\}/);

  for (const href of ["/status", "/support", "/updates", "/help", "/privacy", "/terms"]) {
    assert.match(legalPage, new RegExp(`href="${href.replace("/", "\\/")}"`));
  }
});

test("legal policy cards use numbered document sections with visual rails", () => {
  assert.match(globals, /\.legal-index\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*minmax\(190px,\s*0\.28fr\)\s+minmax\(0,\s*1fr\))(?=[^}]*background-size:\s*24px 24px,\s*auto,\s*auto)[^}]*\}/s);
  assert.match(globals, /\.legal-index::before\s*\{(?=[^}]*width:\s*3px)(?=[^}]*linear-gradient\(180deg,\s*var\(--accent\),\s*var\(--brand\),\s*var\(--sky\)\))[^}]*\}/s);
  assert.match(globals, /\.legal-index\s+ol\s*\{(?=[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\))[^}]*\}/s);
  assert.match(globals, /\.legal-index\s+a\s*\{(?=[^}]*grid-template-columns:\s*auto\s+minmax\(0,\s*1fr\))(?=[^}]*transition:\s*border-color 170ms ease,\s*background 170ms ease,\s*box-shadow 170ms ease,\s*transform 170ms ease)[^}]*\}/s);
  assert.match(globals, /\.legal-grid\s*\{(?=[^}]*counter-reset:\s*legal-section)[^}]*\}/s);
  assert.match(globals, /\.legal-card\s*\{(?=[^}]*overflow:\s*hidden)(?=[^}]*scroll-margin-block-start:\s*92px)(?=[^}]*counter-increment:\s*legal-section)(?=[^}]*transition:\s*border-color 180ms ease,\s*box-shadow 180ms ease,\s*transform 180ms ease)[^}]*\}/s);
  assert.match(globals, /\.legal-card::after\s*\{(?=[^}]*height:\s*3px)(?=[^}]*linear-gradient\(90deg,\s*var\(--brand\),\s*var\(--accent\),\s*var\(--sky\)\))(?=[^}]*z-index:\s*0)[^}]*\}/s);
  assert.match(globals, /\.legal-card\s*>\s*\*\s*\{(?=[^}]*position:\s*relative)(?=[^}]*z-index:\s*1)[^}]*\}/s);
  assert.match(globals, /\.legal-card\s+h2::before\s*\{(?=[^}]*content:\s*counter\(legal-section,\s*decimal-leading-zero\))(?=[^}]*border-radius:\s*10px)(?=[^}]*letter-spacing:\s*0)[^}]*\}/s);
});

test("legal summary and footer have policy-center structure across themes", () => {
  assert.match(globals, /\.legal-summary-strip,\s*\.updates-overview\s*\{(?=[^}]*position:\s*relative)(?=[^}]*background-size:\s*auto,\s*20px 20px,\s*auto,\s*auto)[^}]*\}/s);
  assert.match(globals, /\.legal-summary-strip::after\s*\{(?=[^}]*inset-block-end:\s*0)(?=[^}]*height:\s*1px)[^}]*\}/s);
  assert.match(globals, /\.legal-footer-card\s*\{(?=[^}]*overflow:\s*hidden)(?=[^}]*border-color:\s*color-mix\(in srgb,\s*var\(--accent\) 18%,\s*var\(--line\)\))(?=[^}]*isolation:\s*isolate)[^}]*\}/s);
  assert.match(globals, /\.legal-footer-card::before\s*\{(?=[^}]*inset-block-start:\s*0)(?=[^}]*height:\s*1px)[^}]*\}/s);
  assert.match(globals, /\.legal-footer-actions\s+\.btn\s*\{(?=[^}]*border-radius:\s*12px)(?=[^}]*white-space:\s*normal)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s);

  assert.match(globals, /html\[data-theme="dark"\]\s+\.legal-summary-strip,\s*html\[data-theme="dark"\]\s+\.legal-index,\s*html\[data-theme="dark"\]\s+\.legal-card,\s*html\[data-theme="dark"\]\s+\.legal-footer-card\s*\{(?=[^}]*rgba\(255,\s*247,\s*233,\s*0\.16\))[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.legal-index\s+a\s*\{(?=[^}]*border-color:\s*rgba\(255,\s*247,\s*233,\s*0\.13\))[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.legal-card\s+h2::before\s*\{(?=[^}]*rgba\(221,\s*160,\s*74,\s*0\.24\))(?=[^}]*color:\s*var\(--brand-dark\))[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.legal-summary-strip,[\s\S]*?\.legal-index,[\s\S]*?\.updates-timeline\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(globals, /@media\s*\(max-width:\s*620px\)\s*\{[\s\S]*?\.legal-index\s+ol\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(globals, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.legal-index\s+ol\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.legal-index\s+a:hover,[\s\S]*?\.legal-footer-card:focus-within,[\s\S]*?\{[^}]*transform:\s*none/s);
});
