import assert from "node:assert/strict";
import test from "node:test";

import { formatUploadSize, validateResumeUpload } from "./resumeUpload";

const MB = 1024 * 1024;

test("accepts supported resume files at the advertised limit", () => {
  assert.deepEqual(
    validateResumeUpload({ name: "resume.PDF", size: 8 * MB }, { maxBytes: 8 * MB, allowedFormats: ["pdf"] }),
    { valid: true },
  );
});

test("explains the real sizes when a resume is too large", () => {
  assert.deepEqual(
    validateResumeUpload({ name: "resume.docx", size: 8.5 * MB }, { maxBytes: 8 * MB }),
    {
      valid: false,
      code: "upload_too_large",
      message: "resume.docx is 8.5 MB. Choose a resume no larger than 8 MB.",
    },
  );
});

test("rejects unsupported drag-and-drop formats before upload", () => {
  assert.deepEqual(
    validateResumeUpload({ name: "resume.pages", size: 32000 }, { allowedFormats: ["docx", "pdf", "txt"] }),
    {
      valid: false,
      code: "unsupported_file_type",
      message: "Choose a resume file in DOCX, PDF, or TXT format.",
    },
  );
});

test("formats sub-megabyte upload sizes without showing zero", () => {
  assert.equal(formatUploadSize(1), "1 byte");
  assert.equal(formatUploadSize(512), "512 bytes");
  assert.equal(formatUploadSize(512 * 1024), "512 KB");
});
