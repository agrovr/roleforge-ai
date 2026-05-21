import assert from "node:assert/strict";
import test from "node:test";

import { downloadStatusFromHead } from "./downloadStatus";

test("marks successful download checks as ready", () => {
  assert.deepEqual(downloadStatusFromHead("pdf", 200), {
    state: "ready",
    message: "PDF download is ready",
  });
});

test("explains premium-gated restored downloads", () => {
  assert.deepEqual(downloadStatusFromHead("docx", 402), {
    state: "expired",
    message: "DOCX download requires an active Premium plan. Switch to PDF or reopen Premium to use this file.",
  });
});

test("keeps expired or missing downloads distinct from premium gates", () => {
  assert.deepEqual(downloadStatusFromHead("txt", 404), {
    state: "expired",
    message: "This TXT link expired. Run the export again to create a fresh file.",
  });
});
