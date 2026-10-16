import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadSavedRunsPage, updateSavedProjectStatus } from "./savedProjects";

test("archiving does not report success when the owned project no longer exists", async () => {
  const query = { update() { return this; }, eq() { return this; }, select() { return this; }, async maybeSingle() { return { data: null, error: null }; } };
  const client = { from() { return query; } } as unknown as SupabaseClient;
  await assert.rejects(updateSavedProjectStatus(client, "missing", "archived", "owner"), /no longer available/);
});

test("pagination advances over hidden usage rows with stable ordering and ownership", async () => {
  const calls: unknown[] = [];
  const query = {
    select() { return this; },
    eq(key: string, value: string) { calls.push([key, value]); return this; },
    order(key: string, value: unknown) { calls.push([key, value]); return this; },
    async range(from: number, to: number) { calls.push([from, to]); return { data: Array.from({ length: 13 }, (_, i) => ({ id: String(i), project_id: "p", payload: { serverRecorded: true } })), error: null }; },
  };
  const client = { from(table: string) { assert.equal(table, "tailor_runs"); return query; } } as unknown as SupabaseClient;
  assert.deepEqual(await loadSavedRunsPage(client, "owner", { offset: 24 }), { runs: [], nextOffset: 36 });
  assert.deepEqual(calls, [["user_id", "owner"], ["created_at", { ascending: false }], ["id", { ascending: false }], [24, 36]]);
  await assert.rejects(loadSavedRunsPage(client, "owner", { offset: -1 }), /Invalid/);
});

test("targeted older run lookup keeps user ownership and returns only that run", async () => {
  const calls: unknown[] = [];
  const query = { select() { return this; }, eq(key: string, value: string) { calls.push([key, value]); return this; }, order() { return this; }, async limit(n: number) { assert.equal(n, 1); return { data: [], error: null }; } };
  const client = { from() { return query; } } as unknown as SupabaseClient;
  assert.deepEqual(await loadSavedRunsPage(client, "owner", { offset: 0, runId: "older-run" }), { runs: [], nextOffset: null });
  assert.deepEqual(calls, [["user_id", "owner"], ["id", "older-run"]]);
});
