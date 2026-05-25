import assert from "node:assert/strict";
import test from "node:test";

import { RESUME_TEMPLATES, getResumeTemplate, isResumeTemplateSlug, resumeTemplateEntryHref, resumeTemplateStudioHref } from "./resumeTemplates";

test("keeps template slugs unique", () => {
  const slugs = RESUME_TEMPLATES.map((template) => template.slug);
  assert.equal(new Set(slugs).size, slugs.length);
});

test("validates and falls back to the default template", () => {
  assert.equal(isResumeTemplateSlug("modern"), true);
  assert.equal(isResumeTemplateSlug("unknown"), false);
  assert.equal(getResumeTemplate("modern").name, "Modern");
  assert.equal(getResumeTemplate("unknown").name, "Classic");
});

test("builds studio template deep links", () => {
  assert.equal(resumeTemplateStudioHref("engineer"), "/app?template=engineer");
  assert.equal(resumeTemplateStudioHref("missing"), "/app?template=classic");
});

test("preserves template choices through login", () => {
  assert.equal(resumeTemplateEntryHref("modern", true), "/app?template=modern");
  assert.equal(resumeTemplateEntryHref("modern", false), "/login?next=%2Fapp%3Ftemplate%3Dmodern");
});
