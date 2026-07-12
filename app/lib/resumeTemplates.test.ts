import assert from "node:assert/strict";
import test from "node:test";

import {
  RESUME_TEMPLATE_COOKIE,
  RESUME_TEMPLATES,
  getResumeTemplate,
  isResumeTemplateSlug,
  readResumeTemplateCookie,
  resolveResumeTemplatePreference,
  resumeTemplateCookieAssignment,
  resumeTemplateEntryHref,
  resumeTemplateStudioHref,
} from "./resumeTemplates";

test("keeps template slugs unique", () => {
  const slugs = RESUME_TEMPLATES.map((template) => template.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.equal(slugs.length, 10);
});

test("validates and falls back to the default template", () => {
  assert.equal(isResumeTemplateSlug("modern"), true);
  assert.equal(isResumeTemplateSlug("student"), true);
  assert.equal(isResumeTemplateSlug("academic"), true);
  assert.equal(isResumeTemplateSlug("unknown"), false);
  assert.equal(getResumeTemplate("modern").name, "Professional");
  assert.equal(getResumeTemplate("student").name, "Early Career");
  assert.equal(getResumeTemplate("unknown").name, "Essential");
});

test("builds studio template deep links", () => {
  assert.equal(resumeTemplateStudioHref("engineer"), "/app?template=engineer");
  assert.equal(resumeTemplateStudioHref("missing"), "/app?template=classic");
});

test("preserves template choices through login", () => {
  assert.equal(resumeTemplateEntryHref("modern", true), "/app?template=modern");
  assert.equal(resumeTemplateEntryHref("modern", false), "/login?next=%2Fapp%3Ftemplate%3Dmodern");
});

test("keeps the default and featured template set intentional", () => {
  assert.equal(RESUME_TEMPLATES[0].name, "Essential");
  assert.equal(RESUME_TEMPLATES[0].recommended, true);
  assert.deepEqual(
    RESUME_TEMPLATES.filter((template) => template.featured).map((template) => template.name),
    ["Essential", "Professional", "Technical", "Early Career"],
  );
});

test("covers specialist audiences without duplicating the featured gallery", () => {
  assert.deepEqual(
    RESUME_TEMPLATES.slice(-3).map((template) => template.name),
    ["Career Pivot", "Academic", "Impact"],
  );
});

test("resolves template preferences in query cookie storage order", () => {
  assert.equal(resolveResumeTemplatePreference({ requested: "engineer", cookie: "academic", stored: "impact" }), "engineer");
  assert.equal(resolveResumeTemplatePreference({ requested: "missing", cookie: "academic", stored: "impact" }), "academic");
  assert.equal(resolveResumeTemplatePreference({ requested: null, cookie: "missing", stored: "impact" }), "impact");
  assert.equal(resolveResumeTemplatePreference({ requested: "missing", cookie: "unknown", stored: "stale" }), "classic");

  for (const template of RESUME_TEMPLATES) {
    assert.equal(resolveResumeTemplatePreference({ cookie: template.slug }), template.slug);
  }
});

test("reads and writes the shared template cookie defensively", () => {
  assert.equal(readResumeTemplateCookie(`other=1; ${RESUME_TEMPLATE_COOKIE}=academic; theme=dark`), "academic");
  assert.equal(readResumeTemplateCookie(`${RESUME_TEMPLATE_COOKIE}=missing`), null);
  assert.equal(readResumeTemplateCookie(`${RESUME_TEMPLATE_COOKIE}=%E0%A4%A`), null);
  assert.equal(readResumeTemplateCookie(null), null);
  assert.equal(resumeTemplateCookieAssignment("impact"), `${RESUME_TEMPLATE_COOKIE}=impact; Path=/; Max-Age=31536000; SameSite=Lax`);
});
