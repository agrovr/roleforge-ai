import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { allStudioStyles } from "./style_sources.mjs";

const studioPage = readFileSync("app/app/page.tsx", "utf8");
const targetLabel = readFileSync("app/lib/targetLabel.ts", "utf8");
const targetInput = readFileSync("app/lib/targetInput.ts", "utf8");
const stylesheet = allStudioStyles;

test("studio validates and normalizes public target URLs before declaring readiness", () => {
  assert.match(studioPage, /import \{ normalizePublicUrlInput, parseTargetUrl \}/);
  assert.match(studioPage, /import \{ activeTargetPayload, deriveTargetInputState, type TargetInputMode \}/);
  assert.match(studioPage, /const normalizedJobUrl = normalizePublicUrlInput\(jdUrl\)/);
  assert.match(studioPage, /const normalizedCompanyUrl = normalizePublicUrlInput\(companyUrl\)/);
  assert.match(studioPage, /const targetInput = deriveTargetInputState\(\{/);
  assert.match(studioPage, /const hasTarget = targetInput\.hasTarget/);
  assert.match(studioPage, /Object\.assign\(payload, activeTargetPayload\(\{ mode: inputMode, jdText, normalizedJobUrl \}\)\)/);
  assert.match(studioPage, /if \(normalizedCompanyUrl\) payload\.company_url = normalizedCompanyUrl/);
  assert.doesNotMatch(studioPage, /const hasTarget = Boolean\(normalizedJobUrl \|\| jdText\.trim\(\)\)/);
  assert.doesNotMatch(studioPage, /const hasTarget = Boolean\(jdUrl\.trim\(\)/);
  assert.doesNotMatch(studioPage, /const isHttp =/);
});

test("target URL normalization accepts common schemeless links and rejects non-public input", () => {
  assert.match(targetLabel, /export function normalizePublicUrlInput/);
  assert.match(targetLabel, /SCHEMELESS_PUBLIC_HOST/);
  assert.match(targetLabel, /if \(!\/\^https\?:\$\/\.test\(url\.protocol\) \|\| !url\.hostname\.includes\("\."\)\) return null/);
  assert.match(targetLabel, /export function isUrlTarget\(value: string\) \{\s*return Boolean\(normalizePublicUrlInput\(value\)\)/s);
});

test("studio URL fields expose inline accessible ready and error guidance", () => {
  assert.match(studioPage, /aria-invalid=\{jobUrlInvalid\}/);
  assert.match(studioPage, /aria-describedby="jdUrlHint"/);
  assert.match(studioPage, /id="jdUrlHint"/);
  assert.match(studioPage, /aria-invalid=\{companyUrlInvalid\}/);
  assert.match(studioPage, /aria-describedby="companyUrlHint"/);
  assert.match(studioPage, /id="companyUrlHint"/);
  assert.match(studioPage, /aria-invalid=\{targetInput\.descriptionTooLong\}/);
  assert.match(studioPage, /aria-describedby="jdTextHint"/);
  assert.match(studioPage, /id="jdTextHint"/);
  assert.match(studioPage, /targetInput\.countLabel/);
  assert.match(studioPage, /your text stays editable/);
  assert.match(studioPage, /URLs without https:\/\/ are accepted/);
  assert.match(targetInput, /Enter a public job URL such as jobs\.example\.com\/role before running Tailor/);
  assert.match(stylesheet, /\.rf-url-hint\s*\{(?=[^}]*overflow-wrap:\s*anywhere)[^}]*\}/s);
  assert.match(stylesheet, /\.rf-url-hint\.ready\s*\{/);
  assert.match(stylesheet, /\.rf-url-hint\.invalid\s*\{/);
  assert.match(stylesheet, /\.rf-target-text-hint\s*\{(?=[^}]*display:\s*flex)(?=[^}]*flex-wrap:\s*wrap)[^}]*\}/s);
  assert.match(stylesheet, /\.rf-target-editor textarea\[aria-invalid="true"\],\s*\.rf-target-editor input\[aria-invalid="true"\],\s*\.rf-company-field input\[aria-invalid="true"\]\s*\{/s);
});

test("studio segmented controls expose real pressed state without incomplete tab semantics", () => {
  assert.match(studioPage, /role="group" aria-label="Job description input mode"/);
  assert.match(studioPage, /aria-pressed=\{inputMode === "text"\}/);
  assert.match(studioPage, /aria-pressed=\{inputMode === "url"\}/);
  assert.match(studioPage, /role="group" aria-label="Tailoring mode"/);
  assert.match(studioPage, /aria-pressed=\{tailoringMode === "conservative"\}/);
  assert.match(studioPage, /aria-pressed=\{tailoringMode === "balanced"\}/);
  assert.match(studioPage, /aria-pressed=\{tailoringMode === "aggressive"\}/);
});
