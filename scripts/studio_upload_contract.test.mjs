import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const studioPage = readFileSync("app/app/page.tsx", "utf8");
const capabilities = readFileSync("app/lib/workflowCapabilities.ts", "utf8");
const smoke = readFileSync("scripts/smoke_frontend.mjs", "utf8");

test("studio consumes the backend upload limit with a safe fallback", () => {
  assert.match(capabilities, /max_upload_bytes:\s*number/);
  assert.match(capabilities, /DEFAULT_MAX_UPLOAD_BYTES = 8 \* 1024 \* 1024/);
  assert.match(capabilities, /max_upload_bytes:\s*readPositiveInteger\(record\?\.max_upload_bytes, DEFAULT_MAX_UPLOAD_BYTES\)/);
  assert.match(studioPage, /const maxUploadBytes = capabilities\?\.max_upload_bytes \?\? DEFAULT_MAX_UPLOAD_BYTES/);
  assert.match(studioPage, /const uploadLimitLabel = formatUploadSize\(maxUploadBytes\)/);
});

test("picker and drag drop share validation before upload", () => {
  assert.match(studioPage, /function selectResumeFile\(nextFile: File \| null\)/);
  assert.match(studioPage, /const uploadValidation = validateResumeUpload\(nextFile/);
  assert.match(studioPage, /if \(droppedFile\) selectResumeFile\(droppedFile\)/);
  assert.match(studioPage, /selectResumeFile\(event\.currentTarget\.files\?\.\[0\] \?\? null\)/);
  assert.match(studioPage, /const uploadValidation = validateResumeUpload\(file,[\s\S]*?if \(!uploadValidation\.valid\)[\s\S]*?return \(\) => controller\.abort\(\)/);
});

test("an upload failure blocks Tailor until the file is replaced", () => {
  assert.match(studioPage, /const uploadFailed = previewUploadState === "error"/);
  assert.match(studioPage, /uploadFailed,\s*\n\s*restoredWithoutFile/);
  assert.match(studioPage, /previewUploadState === "error"[\s\S]*?Replace the resume file before running Tailor/);
  assert.match(studioPage, /label:\s*"Replace resume"/);
  assert.match(studioPage, /aria-invalid=\{uploadFailed\}/);
});

test("production smoke requires a valid advertised upload limit", () => {
  assert.match(smoke, /Number\.isSafeInteger\(payload\.max_upload_bytes\) && payload\.max_upload_bytes > 0/);
});
