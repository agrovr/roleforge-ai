import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_UPLOAD_FORMATS, normalizeWorkflowCapabilities } from "./workflowCapabilities";

test("normalizes the live backend capabilities shape", () => {
  const capabilities = normalizeWorkflowCapabilities({
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
      { template: "classic", label: "Classic" },
      { template: "modern", label: "Modern" },
      { template: "editorial", label: "Editorial" },
      { template: "compact", label: "Compact" },
      { template: "executive", label: "Executive" },
      { template: "engineer", label: "Engineer" },
    ],
  });

  assert.equal(capabilities.upload_formats.length, 3);
  assert.equal(capabilities.export_formats.find((format) => format.format === "docx")?.plan, "premium");
  assert.equal(capabilities.export_templates.find((template) => template.template === "engineer")?.label, "Engineer");
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
  assert.deepEqual(capabilities.export_templates, [{ template: "classic", label: "Classic" }]);
});

test("falls back to safe defaults when capabilities are missing", () => {
  const capabilities = normalizeWorkflowCapabilities(null);

  assert.deepEqual(capabilities.upload_formats, DEFAULT_UPLOAD_FORMATS);
  assert.equal(capabilities.export_formats.length, 0);
  assert.ok(capabilities.export_templates.some((template) => template.template === "classic"));
});
