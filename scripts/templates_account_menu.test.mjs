import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const templatesPage = readFileSync("app/templates/page.tsx", "utf8");
const stylesheet = readFileSync("app/globals.css", "utf8");

test("templates page keeps signed-in account controls in the topbar", () => {
  assert.match(templatesPage, /AccountAvatar/);
  assert.match(templatesPage, /accountAvatarUrl\(user\)/);
  assert.match(templatesPage, /accountDisplayName\(user/);
  assert.match(templatesPage, /templates-account-menu/);
  assert.match(templatesPage, /aria-label="Open account menu"/);
  assert.match(templatesPage, /selectedTemplate\.name/);
  assert.match(templatesPage, /href=\{resumeTemplateStudioHref\(initialTemplateSlug\)\}/);
  assert.match(templatesPage, /href="\/settings#billing"/);
  assert.match(templatesPage, /href="\/settings#security"/);
  assert.match(templatesPage, /href="\/help"/);
  assert.match(templatesPage, /href="\/status"/);
  assert.match(templatesPage, /href="\/updates"/);
  assert.match(templatesPage, /href="\/api\/account\/export"/);
  assert.match(templatesPage, /Download summary/);
  assert.match(templatesPage, /Help center/);
  assert.match(templatesPage, /System status/);
  assert.match(templatesPage, /Product updates/);
  assert.match(templatesPage, /action="\/auth\/signout"/);
});

test("templates account menu has topbar-specific overflow positioning", () => {
  assert.match(stylesheet, /\.templates-account-menu\s*\{(?=[^}]*position:\s*relative)(?=[^}]*display:\s*inline-flex)[^}]*\}/s);
  assert.match(stylesheet, /\.templates-account-popover\s*\{(?=[^}]*right:\s*0)(?=[^}]*width:\s*min\(420px,\s*calc\(100vw\s*-\s*36px\)\))[^}]*\}/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.templates-account-menu\s*\{[^}]*width:\s*100%/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.templates-account-popover\s*\{[^}]*right:\s*auto/s);
});
