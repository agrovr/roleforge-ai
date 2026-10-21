import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { landingStylesForAssertions } from "./style_sources.mjs";

const landingPage = readFileSync("app/page.tsx", "utf8");
const globals = landingStylesForAssertions;
const sectionStart = globals.indexOf("/* Landing footer finish:");
assert.notEqual(sectionStart, -1, "landing footer polish section is missing");
const section = globals.slice(sectionStart);

test("shared footer keeps factual product and legal content", () => {
  const footer = readFileSync("app/components/SiteFooter.tsx", "utf8");
  assert.match(landingPage, /<SiteFooter \/>/);
  for (const copy of ["Protected studio", "Account exports", "Premium DOCX/TXT", "Payments by Stripe", "Google sign-in supported", "All rights reserved."]) assert.ok(footer.includes(copy), copy);
});

test("landing footer has a grounded surface and brand trust block without a line-field overlay", () => {
  assert.match(section, /\.footer\s*\{(?=[^}]*position:\s*relative)(?=[^}]*isolation:\s*isolate)(?=[^}]*overflow:\s*hidden)(?=[^}]*radial-gradient\(circle at 12% 0%)[^}]*\}/s);
  assert.match(section, /\.footer::before\s*\{(?=[^}]*height:\s*3px)(?=[^}]*linear-gradient\(90deg,\s*transparent,\s*var\(--brand\),\s*var\(--accent\),\s*var\(--sky\),\s*transparent\))(?=[^}]*pointer-events:\s*none)[^}]*\}/s);
  assert.doesNotMatch(section, /\.footer::after/);
  assert.match(section, /\.footer-inner,\s*\.footer-meta\s*\{(?=[^}]*position:\s*relative)(?=[^}]*z-index:\s*1)[^}]*\}/s);
  assert.match(section, /\.footer-brand-block\s*\{(?=[^}]*position:\s*relative)(?=[^}]*overflow:\s*hidden)(?=[^}]*padding:\s*18px)(?=[^}]*border-radius:\s*8px)(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(section, /\.footer-brand-block::before\s*\{(?=[^}]*height:\s*2px)(?=[^}]*linear-gradient\(90deg,\s*var\(--brand\),\s*var\(--accent\),\s*transparent\))[^}]*\}/s);
});

test("landing footer links chips and metadata have polished affordances", () => {
  assert.match(section, /\.footer-product-note span,\s*\.footer-trust-row span\s*\{(?=[^}]*box-shadow:\s*inset 0 1px 0)(?=[^}]*transition:\s*border-color 160ms ease,\s*background 160ms ease,\s*box-shadow 160ms ease,\s*transform 160ms ease)[^}]*\}/s);
  assert.match(section, /\.footer-product-note span:hover,[\s\S]*?\.footer-trust-row span:focus-within\s*\{(?=[^}]*border-color:\s*color-mix\(in srgb,\s*var\(--brand\) 32%,\s*var\(--line\)\))(?=[^}]*transform:\s*translateY\(-1px\))[^}]*\}/s);
  assert.match(section, /\.footer-col\s*\{(?=[^}]*position:\s*relative)(?=[^}]*padding-inline-start:\s*14px)[^}]*\}/s);
  assert.match(section, /\.footer-col::before\s*\{(?=[^}]*linear-gradient\(180deg,\s*color-mix\(in srgb,\s*var\(--brand\) 42%,\s*transparent\))(?=[^}]*content:\s*"";)[^}]*\}/s);
  assert.match(section, /\.footer-col h3::after\s*\{(?=[^}]*width:\s*28px)(?=[^}]*height:\s*2px)[^}]*\}/s);
  assert.match(section, /\.footer-col a::after,\s*\.footer-meta-links a::after\s*\{(?=[^}]*linear-gradient\(90deg,\s*var\(--brand\),\s*var\(--accent\)\))(?=[^}]*transform:\s*scaleX\(0\.72\))[^}]*\}/s);
  assert.match(section, /\.footer-meta\s*\{(?=[^}]*padding:\s*14px 16px)(?=[^}]*border-radius:\s*8px)(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(section, /\.footer-meta-links\s*\{(?=[^}]*padding:\s*4px)(?=[^}]*border-radius:\s*8px)[^}]*\}/s);
});

test("landing footer polish covers dark mode and reduced motion", () => {
  assert.match(section, /html\[data-theme="dark"\]\s+\.footer\s*\{(?=[^}]*radial-gradient\(circle at 12% 0%,\s*rgba\(222,\s*162,\s*79,\s*0\.12\))(?=[^}]*linear-gradient\(180deg,\s*#111625,\s*#0b0f1f\))[^}]*\}/s);
  assert.match(section, /html\[data-theme="dark"\]\s+\.footer::before\s*\{(?=[^}]*#f3c16d)(?=[^}]*#8fdac8)(?=[^}]*#b9c7ff)[^}]*\}/s);
  assert.match(section, /html\[data-theme="dark"\]\s+\.footer-brand-block,\s*html\[data-theme="dark"\]\s+\.footer-meta\s*\{(?=[^}]*border-color:\s*rgba\(255,\s*247,\s*233,\s*0\.13\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(section, /html\[data-theme="dark"\]\s+\.footer-meta-links\s*\{(?=[^}]*border-color:\s*rgba\(255,\s*247,\s*233,\s*0\.12\))(?=[^}]*background:\s*rgba\(255,\s*247,\s*233,\s*0\.04\))[^}]*\}/s);
  assert.match(section, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.footer-product-note span,[\s\S]*?\.footer-meta-links a::after\s*\{(?=[^}]*transition:\s*none)[^}]*\}/s);
  assert.match(section, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.footer-product-note span:hover,[\s\S]*?\.footer-col a:focus-visible\s*\{(?=[^}]*transform:\s*none)[^}]*\}/s);
});
