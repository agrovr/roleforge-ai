import assert from "node:assert/strict";
import test from "node:test";

import { normalizeWorkflowDownloadUrl, workflowDownloadUrl } from "./downloadUrls";

test("builds account-protected workflow download URLs", () => {
  assert.equal(
    workflowDownloadUrl("run 1_tailored resume.pdf"),
    "/api/workflow/download/run%201_tailored%20resume.pdf",
  );
});

test("normalizes backend and proxy download links to the account-protected route", () => {
  assert.equal(
    normalizeWorkflowDownloadUrl("https://roleforge-api.example.run.app/download/run-1_tailored_resume.pdf"),
    "/api/workflow/download/run-1_tailored_resume.pdf",
  );
  assert.equal(
    normalizeWorkflowDownloadUrl("https://roleforgeai.vercel.app/api/workflow/download/run-2_tailored_resume.pdf?download=1"),
    "/api/workflow/download/run-2_tailored_resume.pdf",
  );
  assert.equal(
    normalizeWorkflowDownloadUrl("/download/run-3_tailored_resume.pdf#preview"),
    "/api/workflow/download/run-3_tailored_resume.pdf",
  );
});

test("leaves non-download URLs unchanged", () => {
  assert.equal(normalizeWorkflowDownloadUrl("https://example.com/export/run-1.pdf"), "https://example.com/export/run-1.pdf");
  assert.equal(normalizeWorkflowDownloadUrl("#"), "#");
});
