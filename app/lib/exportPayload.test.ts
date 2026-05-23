import assert from "node:assert/strict";
import test from "node:test";

import { buildWorkflowExportPayload } from "./exportPayload";

test("builds the backend export payload with the selected template", () => {
  assert.deepEqual(buildWorkflowExportPayload("Tailored content", "pdf", "engineer"), {
    filename: "tailored_resume.pdf",
    title: "TAILORED RESUME",
    content: "Tailored content",
    format: "pdf",
    template: "engineer",
  });
});

test("keeps premium export formats in the filename and payload", () => {
  assert.deepEqual(buildWorkflowExportPayload("Tailored content", "docx", "modern"), {
    filename: "tailored_resume.docx",
    title: "TAILORED RESUME",
    content: "Tailored content",
    format: "docx",
    template: "modern",
  });
});

test("falls back to the classic template for stale stored values", () => {
  assert.equal(buildWorkflowExportPayload("Tailored content", "txt", "missing").template, "classic");
});
