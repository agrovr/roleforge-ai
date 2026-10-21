import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const landingPage = readFileSync("app/page.tsx", "utf8");
const stylesheet = [
  readFileSync("app/globals.css", "utf8"),
  readFileSync("app/landing.css", "utf8"),
].join("\n");
const mobileGuardStart = stylesheet.indexOf("/* Final mobile landing guardrail:");
const mobileGuardEnd = stylesheet.indexOf("/* End final mobile landing guardrail. */", mobileGuardStart);
assert.notEqual(mobileGuardStart, -1, "final mobile landing guardrail is missing");
assert.notEqual(mobileGuardEnd, -1, "final mobile landing guardrail boundary is missing");
const mobileGuard = stylesheet.slice(mobileGuardStart, mobileGuardEnd);

test("landing hero explains the four real workflow steps without outcome claims", () => {
  assert.match(landingPage, /aria-label="The RoleForge workflow"/);
  for (const copy of ["DOCX, PDF, or TXT", "Job text or public URL", "Fit, gaps, formatting", "Clean PDF draft"]) assert.ok(landingPage.includes(copy));
  assert.match(landingPage, /You review every change/);
});

test("landing hero capability rhythm is deterministic across desktop and phones", () => {
  assert.match(stylesheet, /\.hero-meta\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\))(?=[^}]*gap:\s*clamp\(16px,\s*2vw,\s*28px\))[^}]*\}/s);
  assert.match(stylesheet, /\.hero-meta-item\s*\{[^}]*min-width:\s*0[^}]*\}/s);
  assert.match(mobileGuard, /@media\s*\(max-width:\s*520px\)\s*\{/);
  assert.match(mobileGuard, /\.hero-meta\s*\{(?=[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\))(?=[^}]*gap:\s*24px\s+18px)[^}]*\}/s);
  assert.match(mobileGuard, /\.hero-meta-item:last-child\s*\{(?=[^}]*grid-column:\s*1\s*\/\s*-1)(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*max-content\s+minmax\(0,\s*1fr\))(?=[^}]*align-items:\s*end)[^}]*\}/s);
  assert.match(mobileGuard, /\.hero-meta-item:last-child \.l\s*\{(?=[^}]*margin-top:\s*0)(?=[^}]*padding-bottom:\s*2px)[^}]*\}/s);
});
