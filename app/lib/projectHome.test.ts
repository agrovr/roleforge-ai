import assert from "node:assert/strict";
import test from "node:test";
import { latestProjects, matchesProjectFilter, projectResumeText } from "./projectHome";
import type { SavedHistoryItem } from "./supabase/savedProjects";

const run = (id: string, projectId: string, createdAt: string, applicationStatus: SavedHistoryItem["applicationStatus"] = "tailored"): SavedHistoryItem => ({ id, projectId, createdAt, applicationStatus, filename: "Resume.pdf", mode: "balanced", score: 80, downloadUrl: "#", roleHint: "Engineer" });

test("project home groups versions and keeps newest version regardless of pagination order", () => {
  const newer = run("new", "project", "2026-10-01");
  assert.deepEqual(latestProjects([run("old", "project", "2026-09-01"), newer, newer]), [newer]);
});
test("project filters retain legacy stages and distinguish application follow-up from archived", () => {
  for (const status of ["active", "draft", "generated", "tailored", "exported"] as const) assert.equal(matchesProjectFilter(run(status, status, "2026-10-01", status), "Active"), true);
  assert.equal(matchesProjectFilter(run("a", "a", "2026-10-01", "archived"), "Active"), false);
  assert.equal(matchesProjectFilter(run("a", "a", "2026-10-01", "exported"), "Ready"), true);
});
test("project excerpt only uses actual saved resume text", () => {
  const item = run("a", "a", "2026-10-01");
  assert.equal(projectResumeText(item), "");
  assert.equal(projectResumeText({ ...item, snapshot: { result: { tailored_text: "  Actual resume  " } } }), "Actual resume");
  assert.equal(projectResumeText({ ...item, snapshot: { result: { tailored_text: { unsafe: true } } } }), "");
});
