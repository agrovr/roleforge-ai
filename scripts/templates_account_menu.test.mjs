import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const templatesPage = readFileSync("app/templates/page.tsx", "utf8");
const templateLibrary = readFileSync("app/templates/TemplateLibrary.tsx", "utf8");
const stylesheet = readFileSync("app/globals.css", "utf8");

test("templates page keeps signed-in account controls in the topbar", () => {
  assert.match(templatesPage, /AccountAvatar/);
  assert.match(templatesPage, /accountAvatarUrl\(user\)/);
  assert.match(templatesPage, /accountDisplayName\(user/);
  assert.match(templatesPage, /supportRequestHref/);
  assert.match(templatesPage, /templates-account-menu/);
  assert.match(templatesPage, /data-account-menu="true"/);
  assert.match(templatesPage, /aria-label="Open account menu"/);
  assert.match(templatesPage, /selectedTemplate\.name/);
  assert.match(templatesPage, /href=\{resumeTemplateStudioHref\(initialTemplateSlug\)\}/);
  assert.match(templatesPage, /href="\/settings#billing"/);
  assert.match(templatesPage, /href="\/settings#security"/);
  assert.match(templatesPage, /href="\/help"/);
  assert.match(templatesPage, /href="\/status"/);
  assert.match(templatesPage, /href="\/updates"/);
  assert.match(templatesPage, /href="\/support"/);
  assert.match(templatesPage, /billingSupportHref/);
  assert.match(templatesPage, /category:\s*"billing"/);
  assert.match(templatesPage, /subject:\s*"Billing or Premium access"/);
  assert.match(templatesPage, /href=\{billingSupportHref\}/);
  assert.match(templatesPage, /Recommended account actions/);
  assert.match(templatesPage, /templates-account-next-actions/);
  assert.match(templatesPage, /Use selected/);
  assert.match(templatesPage, /Save preference/);
  assert.match(templatesPage, /Export access/);
  assert.match(templatesPage, /href="\/api\/account\/export"/);
  assert.match(templatesPage, /Export account record/);
  assert.match(templatesPage, /href="\/settings#support"/);
  assert.match(templatesPage, /Support history/);
  assert.match(templatesPage, /Help center/);
  assert.match(templatesPage, /System status/);
  assert.match(templatesPage, /Product updates/);
  assert.match(templatesPage, /Billing support/);
  assert.match(templatesPage, /action="\/auth\/signout"/);
});

test("templates account menu has topbar-specific overflow positioning", () => {
  assert.match(stylesheet, /\.templates-account-menu\s*\{(?=[^}]*position:\s*relative)(?=[^}]*display:\s*inline-flex)[^}]*\}/s);
  assert.match(stylesheet, /\.templates-account-popover\s*\{(?=[^}]*right:\s*0)(?=[^}]*width:\s*min\(420px,\s*calc\(100vw\s*-\s*36px\)\))[^}]*\}/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.templates-account-menu\s*\{[^}]*width:\s*100%/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.templates-account-popover\s*\{[^}]*right:\s*auto/s);
});

test("templates page explains the selected template without cramped status pills", () => {
  assert.match(templateLibrary, /function layoutLabel\(variant:\s*ResumeTemplateVariant\)/);
  assert.match(templateLibrary, /function layoutDetail\(variant:\s*ResumeTemplateVariant\)/);
  assert.match(templateLibrary, /className="templates-fit-guide"/);
  assert.match(templateLibrary, /aria-label="Selected template guidance"/);
  assert.match(templateLibrary, /New PDF and premium DOCX exports use this direction; older saved exports stay unchanged\./);
  assert.match(stylesheet, /\.templates-fit-guide\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(min\(100%,\s*220px\),\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.templates-fit-guide\s+article\s*\{(?=[^}]*grid-template-columns:\s*38px\s+minmax\(0,\s*1fr\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.templates-fit-guide\s+strong,\s*\.templates-fit-guide\s+small\s*\{(?=[^}]*overflow-wrap:\s*anywhere)[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.templates-fit-guide article/);
  assert.match(stylesheet, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.templates-fit-guide,[\s\S]*?grid-template-columns:\s*1fr/s);
});
