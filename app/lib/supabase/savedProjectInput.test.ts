import assert from "node:assert/strict";
import test from "node:test";

import { parseCompletedRunSaveInput, parseSavedProjectId, parseSavedProjectRenameInput, parseSavedProjectStatusInput } from "./savedProjectInput";

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

test("rejects saved project input with unsafe download links", () => {
  for (const downloadUrl of [
    "https://downloads.example/resume.pdf",
    "/download/history-1.pdf",
    "/api/workflow/download/.env",
    "/api/workflow/download/history 1.pdf",
    "javascript:alert(1)",
  ]) {
    assert.deepEqual(parseCompletedRunSaveInput({ ...validSavedRun, downloadUrl }), {
      ok: false,
      error: "Saved project download link is invalid.",
    }, downloadUrl);
  }
});

test("rejects saved project input when the download format does not match the link", () => {
  assert.deepEqual(parseCompletedRunSaveInput({ ...validSavedRun, downloadFormat: "docx" }), {
    ok: false,
    error: "Saved project download format is invalid.",
  });
});

test("validates saved project ids for management routes", () => {
  assert.deepEqual(parseSavedProjectId("project-123"), { ok: true, projectId: "project-123" });
  assert.deepEqual(parseSavedProjectId(""), { ok: false, error: "Saved project link is invalid." });
  assert.deepEqual(parseSavedProjectId("x".repeat(121)), { ok: false, error: "Saved project link is invalid." });
});

test("normalizes and validates saved project rename input", () => {
  assert.deepEqual(parseSavedProjectRenameInput({ title: "  Senior   backend role  " }), {
    ok: true,
    title: "Senior backend role",
  });
  assert.deepEqual(parseSavedProjectRenameInput({ title: " " }), {
    ok: false,
    error: "Project name is required.",
  });
  assert.deepEqual(parseSavedProjectRenameInput({ title: "x".repeat(121) }), {
    ok: false,
    error: "Project name must be 120 characters or fewer.",
  });
});

test("normalizes and validates saved project status input", () => {
  assert.deepEqual(parseSavedProjectStatusInput({ status: "active" }), {
    ok: true,
    status: "active",
  });
  assert.deepEqual(parseSavedProjectStatusInput({ status: "applied" }), {
    ok: false,
    error: "Project stage is not available.",
  });
  assert.deepEqual(parseSavedProjectStatusInput(null), {
    ok: false,
    error: "Project stage is required.",
  });
});
