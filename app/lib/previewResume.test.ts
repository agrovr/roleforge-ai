import assert from "node:assert/strict";
import test from "node:test";

import { buildPlainResumeLines, buildResumeEntries, isSourcePreviewSample, parseResumeText } from "./previewResume";

const tailoredDraft = [
  "# Tailored Resume",
  "Jordan Lee | Product Manager | jordan@example.com | linkedin.com/in/jordan",
  "",
  "**Professional Summary**",
  "Product-minded operator focused on roadmaps and launch decisions.",
  "",
  "**Experience**",
  "Product Manager | Example Co | Jan 2022 - Present",
  "- Owned cross-functional roadmap delivery for customer-facing workflows.",
  "- Clarified launch scope with analytics and stakeholder reviews.",
  "",
  "Skills: Roadmapping, Analytics, Prioritization",
].join("\n");

test("parses Markdown-flavored tailored resumes into named sections", () => {
  const parsed = parseResumeText(tailoredDraft);

  assert.ok(parsed);
  assert.equal(parsed.name, "Jordan Lee");
  assert.equal(parsed.role, "Product Manager");
  assert.match(parsed.contact, /jordan@example\.com/);
  assert.deepEqual(
    parsed.sections.map((section) => section.title),
    ["Professional summary", "Experience", "Skills"],
  );
  assert.deepEqual(parsed.sections.at(-1)?.lines, ["Roadmapping, Analytics, Prioritization"]);
});

test("builds structured entries for experience sections without flattening bullets", () => {
  const parsed = parseResumeText(tailoredDraft);
  const experience = parsed?.sections.find((section) => section.title === "Experience");

  assert.ok(experience);
  const [entry] = buildResumeEntries(experience.lines);

  assert.equal(entry.title, "Product Manager");
  assert.equal(entry.meta, "Example Co");
  assert.equal(entry.date, "Jan 2022 · Present");
  assert.deepEqual(entry.bullets, [
    "Owned cross-functional roadmap delivery for customer-facing workflows.",
    "Clarified launch scope with analytics and stakeholder reviews.",
  ]);
});

test("keeps original and tailored plain preview lines distinct", () => {
  const original = [
    "Jordan Lee",
    "Project Coordinator",
    "SUMMARY",
    "Supported internal planning cadences.",
  ].join("\n");
  const tailored = [
    "Jordan Lee",
    "Product Manager",
    "SUMMARY",
    "Owned customer-facing roadmap decisions.",
  ].join("\n");

  const originalLines = buildPlainResumeLines(original);
  const tailoredLines = buildPlainResumeLines(tailored);

  assert.notDeepEqual(originalLines, tailoredLines);
  assert.equal(originalLines[1].text, "Project Coordinator");
  assert.equal(tailoredLines[1].text, "Product Manager");
});

test("normalizes inline headings and bullet markers for plain preview", () => {
  const lines = buildPlainResumeLines(["Skills: React, TypeScript", "\u2022 Built dashboards", "EXPERIENCE"].join("\n"));

  assert.deepEqual(lines, [
    { text: "Skills", kind: "heading" },
    { text: "React, TypeScript", kind: "body" },
    { text: "Built dashboards", kind: "bullet" },
    { text: "Experience", kind: "heading" },
  ]);
});

test("caps plain preview lines so long restored runs cannot overgrow the card", () => {
  const lines = Array.from({ length: 120 }, (_, index) => `Line ${index + 1}`).join("\n");

  assert.equal(buildPlainResumeLines(lines).length, 90);
});

test("caps plain preview after inline headings expand into content lines", () => {
  const lines = Array.from({ length: 70 }, (_, index) => `Skills: Tool ${index + 1}`).join("\n");

  assert.equal(buildPlainResumeLines(lines).length, 90);
});

test("detects when original source preview is only a sample", () => {
  assert.equal(isSourcePreviewSample("Avery Stone", 40000), true);
  assert.equal(isSourcePreviewSample("Avery Stone", "Avery Stone".length), false);
  assert.equal(isSourcePreviewSample("", 40000), false);
  assert.equal(isSourcePreviewSample("Avery Stone"), false);
});

test("uses explicit source preview truncation when provided", () => {
  assert.equal(isSourcePreviewSample("Avery Stone", "Avery Stone".length, true), true);
  assert.equal(isSourcePreviewSample("Avery Stone", 40000, false), false);
});
