import assert from "node:assert/strict";
import test from "node:test";

import { parseCompletedRunSaveInput } from "./savedProjectInput";

const validSavedRun = {
  id: "history-1",
  createdAt: "2026-05-21T12:00:00.000Z",
  filename: "resume.pdf",
  mode: "balanced",
  score: 84,
  downloadUrl: "/api/workflow/download/history-1.pdf",
  downloadFormat: "pdf",
  roleHint: "https://jobs.example.com/role",
  payload: {
    studioSnapshot: { templateSlug: "engineer" },
  },
};

test("accepts complete saved project input", () => {
  const parsed = parseCompletedRunSaveInput(validSavedRun);

  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.input.id, "history-1");
    assert.equal(parsed.input.mode, "balanced");
  }
});

test("rejects saved project input with missing required fields", () => {
  const parsed = parseCompletedRunSaveInput({ ...validSavedRun, downloadUrl: "" });

  assert.deepEqual(parsed, { ok: false, error: "Saved project data is incomplete." });
});

test("rejects saved project input with invalid dates, modes, or scores", () => {
  assert.deepEqual(parseCompletedRunSaveInput({ ...validSavedRun, createdAt: "soon" }), {
    ok: false,
    error: "Saved project date is invalid.",
  });
  assert.deepEqual(parseCompletedRunSaveInput({ ...validSavedRun, mode: "wild" }), {
    ok: false,
    error: "Saved project mode is invalid.",
  });
  assert.deepEqual(parseCompletedRunSaveInput({ ...validSavedRun, score: 101 }), {
    ok: false,
    error: "Saved project score is invalid.",
  });
});
