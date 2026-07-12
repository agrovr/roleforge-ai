import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_MAX_JOB_DESCRIPTION_CHARS,
  DEFAULT_MAX_UPLOAD_BYTES,
  DEFAULT_UPLOAD_FORMATS,
  normalizeWorkflowCapabilities,
} from "./workflowCapabilities";

test("normalizes the live backend capabilities shape", () => {
  const capabilities = normalizeWorkflowCapabilities({
    max_job_description_chars: 24000,
    max_upload_bytes: 12 * 1024 * 1024,
    upload_formats: [
      { format: "docx", label: "DOCX", enabled: true },
      { format: "pdf", label: "PDF", enabled: true },
      { format: "txt", label: "TXT", enabled: true },
    ],
    export_formats: [
      { format: "pdf", label: "PDF", enabled: true, plan: "free" },
      { format: "docx", label: "DOCX", enabled: false, plan: "premium", reason: "Premium" },
      { format: "txt", label: "TXT", enabled: false, plan: "premium", reason: "Premium" },
    ],
    export_templates: [
      { template: "classic", label: "Essential" },
      { template: "modern", label: "Professional" },
      { template: "editorial", label: "Studio" },
      { template: "compact", label: "Compact" },
      { template: "executive", label: "Leadership" },
      { template: "engineer", label: "Technical" },
      { template: "student", label: "Early Career" },
      { template: "hybrid", label: "Career Pivot" },
      { template: "academic", label: "Academic" },
      { template: "impact", label: "Impact" },
    ],
  });

  assert.equal(capabilities.upload_formats.length, 3);
  assert.equal(capabilities.max_job_description_chars, 24000);
  assert.equal(capabilities.max_upload_bytes, 12 * 1024 * 1024);
  assert.equal(capabilities.export_formats.find((format) => format.format === "docx")?.plan, "premium");
  assert.equal(capabilities.export_templates.find((template) => template.template === "engineer")?.label, "Technical");
  assert.equal(capabilities.export_templates.find((template) => template.template === "student")?.label, "Early Career");
  assert.equal(capabilities.export_templates.length, 10);
});

test("filters unknown and duplicate capability entries", () => {
  const capabilities = normalizeWorkflowCapabilities({
    upload_formats: [
      { format: "pdf", label: "", enabled: true },
      { format: "pdf", label: "Duplicate", enabled: false },
      { format: "pages", label: "Pages", enabled: true },
    ],
    export_formats: [
      { format: "pdf", label: "", enabled: true, plan: "free" },
      { format: "zip", label: "ZIP", enabled: true },
      { format: "txt", label: "Text", enabled: true, plan: "premium" },
    ],
    export_templates: [
      { template: "classic", label: "" },
      { template: "classic", label: "Duplicate" },
      { template: "unknown", label: "Unknown" },
    ],
  });

  assert.deepEqual(capabilities.upload_formats, [{ format: "pdf", label: "PDF", enabled: true }]);
  assert.deepEqual(capabilities.export_formats, [
    { format: "pdf", label: "PDF", enabled: true, plan: "free", reason: undefined },
    { format: "txt", label: "Text", enabled: true, plan: "premium", reason: undefined },
  ]);
  assert.deepEqual(capabilities.export_templates, [{ template: "classic", label: "Essential" }]);
});

test("falls back to safe defaults when capabilities are missing", () => {
  const capabilities = normalizeWorkflowCapabilities(null);

  assert.deepEqual(capabilities.upload_formats, DEFAULT_UPLOAD_FORMATS);
  assert.equal(capabilities.max_job_description_chars, DEFAULT_MAX_JOB_DESCRIPTION_CHARS);
  assert.equal(capabilities.max_upload_bytes, DEFAULT_MAX_UPLOAD_BYTES);
  assert.equal(capabilities.export_formats.length, 0);
  assert.ok(capabilities.export_templates.some((template) => template.template === "classic"));
});

test("rejects invalid upload limits from a malformed capability response", () => {
  for (const maxUploadBytes of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, "8388608"]) {
    assert.equal(
      normalizeWorkflowCapabilities({ max_upload_bytes: maxUploadBytes }).max_upload_bytes,
      DEFAULT_MAX_UPLOAD_BYTES,
    );
  }
});

test("rejects invalid job description limits from a malformed capability response", () => {
  for (const maxJobDescriptionChars of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, "30000"]) {
    assert.equal(
      normalizeWorkflowCapabilities({ max_job_description_chars: maxJobDescriptionChars }).max_job_description_chars,
      DEFAULT_MAX_JOB_DESCRIPTION_CHARS,
    );
  }
});
