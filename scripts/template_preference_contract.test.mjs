import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const studioPage = readFileSync("app/app/page.tsx", "utf8");
const settingsPage = readFileSync("app/settings/page.tsx", "utf8");
const templatesPage = readFileSync("app/templates/page.tsx", "utf8");
const templateLibrary = readFileSync("app/templates/TemplateLibrary.tsx", "utf8");

test("the template library keeps a valid Settings cookie ahead of stale browser storage", () => {
  assert.match(templatesPage, /const initialTemplateSlug = isResumeTemplateSlug\(templateCookie\) \? templateCookie : null/);
  assert.match(templateLibrary, /initialTemplateSlug\?: ResumeTemplateSlug \| null/);
  assert.match(templateLibrary, /resolveResumeTemplatePreference\(\{ cookie: initialTemplateSlug, stored \}\)/);
  assert.match(templateLibrary, /rememberTemplate\(resolved\)/);
  assert.match(templateLibrary, /setSelectedSlug\(resolved\)/);
  assert.doesNotMatch(templateLibrary, /setSelectedSlug\(stored\)/);
});

test("generic Studio entry resolves query then cookie then storage and synchronizes the result", () => {
  assert.match(studioPage, /const requestedTemplate = params\.get\("template"\)/);
  assert.match(studioPage, /const cookieTemplate = readResumeTemplateCookie\(document\.cookie\)/);
  assert.match(studioPage, /resolveResumeTemplatePreference\(\{\s*requested: requestedTemplate,\s*cookie: cookieTemplate,\s*stored: storedTemplate,\s*\}\)/s);
  assert.match(studioPage, /saveResumeTemplatePreference\(nextTemplate\)/);
});

test("Settings writes the same cookie consumed by Templates and Studio", () => {
  assert.match(settingsPage, /cookieStore\.set\(RESUME_TEMPLATE_COOKIE,\s*template/);
  assert.match(templatesPage, /cookies\(\)\)\.get\(RESUME_TEMPLATE_COOKIE\)/);
  assert.match(studioPage, /readResumeTemplateCookie\(document\.cookie\)/);
});
