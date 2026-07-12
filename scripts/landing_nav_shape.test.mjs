import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globals = readFileSync("app/globals.css", "utf8");
const landing = readFileSync("app/page.tsx", "utf8");

test("landing nav uses a compact floating dock instead of a full-width box", () => {
  assert.match(globals, /\.nav\s*\{(?=[^}]*padding-block:\s*12px)(?=[^}]*border-bottom:\s*0)(?=[^}]*backdrop-filter:\s*saturate\(130%\)\s+blur\(8px\))[^}]*\}/s);
  assert.match(globals, /\.nav-inner\s*\{(?=[^}]*width:\s*min\(1120px,\s*calc\(100%\s*-\s*clamp\(32px,\s*8vw,\s*120px\)\)\))(?=[^}]*border:\s*1px solid)(?=[^}]*border-radius:\s*999px)(?=[^}]*backdrop-filter:\s*blur\(18px\)\s+saturate\(1\.08\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /\.nav-inner::before\s*\{[^}]*content:\s*none/s);
  assert.doesNotMatch(globals, /\.nav::after\s*\{/);
  assert.doesNotMatch(landing, /nav-divider/);
  assert.match(globals, /\.hero\s*\{(?=[^}]*margin:\s*clamp\(18px,\s*2\.2vw,\s*38px\)\s+auto\s+0)[^}]*\}/s);
});

test("landing nav dock has dark-mode and responsive shape polish", () => {
  assert.match(globals, /html\[data-theme="dark"\]\s+\.nav-inner\s*\{(?=[^}]*border-color:\s*rgba\(255,\s*247,\s*233,\s*0\.13\))(?=[^}]*box-shadow:)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.nav-inner\s*\{(?=[^}]*width:\s*min\(760px,\s*calc\(100%\s*-\s*24px\)\))(?=[^}]*border-radius:\s*22px)[^}]*\}[\s\S]*?\.nav-inner::before\s*\{[^}]*content:\s*none/s);
  assert.match(globals, /@media\s*\(max-width:\s*620px\)\s*\{[\s\S]*?\.nav-inner\s*\{(?=[^}]*width:\s*min\(100%\s*-\s*18px,\s*620px\))(?=[^}]*border-radius:\s*20px)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*355px\)\s*\{[\s\S]*?\.nav-inner\s*\{(?=[^}]*width:\s*calc\(100%\s*-\s*12px\))(?=[^}]*border-radius:\s*18px)[^}]*\}/s);
});

test("mobile landing dock stays opaque and clears anchored sections", () => {
  assert.match(globals, /#how,\s*#studio,\s*#features,\s*#pricing,\s*#faq\s*\{[^}]*scroll-margin-top:\s*0[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?html:root\s*\{[^}]*scroll-padding-top:\s*84px[^}]*\}/s);
  assert.doesNotMatch(globals, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?#how,[\s\S]*?scroll-margin-top:\s*112px/s);
  assert.match(globals, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.nav\s*\{(?=[^}]*background:\s*color-mix\(in srgb, var\(--bg\) 97%, var\(--surface\)\))(?=[^}]*backdrop-filter:\s*none)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.nav > \.nav-inner\s*\{(?=[^}]*background-color:\s*color-mix\(in srgb, var\(--surface\) 96%, var\(--surface-warm\)\))(?=[^}]*background-image:\s*none)(?=[^}]*backdrop-filter:\s*none)[^}]*\}/s);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.nav > \.nav-inner\s*\{[^}]*background-color:\s*color-mix\(in srgb, var\(--surface\) 94%, #11182a\)[^}]*\}/s);
});

test("mobile landing dock keeps the compact primary action until the narrowest phones", () => {
  assert.match(landing, /<span className="nav-cta-short">Build<\/span>/);
  assert.match(globals, /@media\s*\(max-width:\s*620px\)\s*\{[\s\S]*?\.nav-cta-full\s*\{[^}]*display:\s*none[^}]*\}[\s\S]*?\.nav-cta-short\s*\{[^}]*display:\s*inline[^}]*\}/s);
  assert.doesNotMatch(globals, /@media\s*\(max-width:\s*560px\)\s*\{\s*\.nav \.btn-brand\s*\{[^}]*display:\s*none/s);
  assert.match(globals, /@media\s*\(max-width:\s*355px\)\s*\{[\s\S]*?\.nav \.btn-brand\s*\{(?=[^}]*display:\s*none)(?=[^}]*min-height:\s*42px)[^}]*\}/s);
});
