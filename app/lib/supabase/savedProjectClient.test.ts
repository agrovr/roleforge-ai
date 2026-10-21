import assert from "node:assert/strict";
import test from "node:test";
import { loadSavedRuns } from "./savedProjectClient";

test("Studio keeps recent runs when a saved-project link has a malformed run ID", async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    calls.push(String(input));
    return String(input).includes("runId=")
      ? Response.json({ error: "Invalid run ID" }, { status: 400 })
      : Response.json({ runs: [{ id: "recent" }] });
  };
  try {
    for (const invalidId of ["-".repeat(36), "a".repeat(36), "0000000-00000-4000-8000-000000000099"]) {
      assert.deepEqual((await loadSavedRuns(invalidId)).map((run) => run.id), ["recent"]);
    }
    assert.deepEqual(calls, Array(3).fill("/api/saved-runs"));
  } finally { globalThis.fetch = originalFetch; }
});

test("Studio fetches the requested owned run when it is outside the recent page", async () => {
  const originalFetch = globalThis.fetch;
  const requestedRunId = "00000000-0000-4000-8000-000000000099";
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input); calls.push(url);
    return Response.json({ runs: url.includes("runId=") ? [{ id: "older", accountRunId: requestedRunId }] : [{ id: "recent" }] });
  };
  try {
    const runs = await loadSavedRuns(requestedRunId);
    assert.deepEqual(runs.map((run) => run.id), ["recent", "older"]);
    assert.deepEqual(calls, ["/api/saved-runs", `/api/saved-runs?runId=${requestedRunId}`]);
  } finally { globalThis.fetch = originalFetch; }
});

test("Studio surfaces a failed older-run lookup instead of silently claiming it loaded", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => String(input).includes("runId=")
    ? Response.json({ error: "Sign in again" }, { status: 401 })
    : Response.json({ runs: [] });
  try { await assert.rejects(loadSavedRuns("00000000-0000-4000-8000-000000000099"), /Sign in again/); }
  finally { globalThis.fetch = originalFetch; }
});
