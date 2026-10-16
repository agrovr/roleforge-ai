import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadAdminSupportQueue, type AdminSupportRequest } from "./supportAdmin";
import { searchSupportQueue, supportQueueCounts, visibleSupportSelection } from "./supportQueue";
import { applySupportBulk, validSupportBulkTargets } from "./supportBulk";

const version = "2026-10-03T12:00:00.000Z";
const ids = ["00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002", "00000000-0000-4000-8000-000000000003"];
const request: AdminSupportRequest = { id: ids[0], referenceLabel: "RF-UNIQUE", userId: "user", email: "customer@example.com", category: "billing", categoryLabel: "Billing and plans", subject: "Invoice question", message: "VAT discrepancy", contextUrl: null, status: "open", statusLabel: "Open", createdAt: version, createdLabel: "Oct 3", updatedAt: version };

test("queue search covers each supported field and counts only matching requests", () => {
  const rows = [request, { ...request, id: ids[1], status: "closed" as const, message: "Other issue", category: "account" as const, categoryLabel: "Account", subject: "Access", email: "another@example.org", referenceLabel: "RF-SECOND" }];
  for (const query of [" unique ", "INVOICE", "customer@", "VAT", "plans", "billing"]) assert.deepEqual(searchSupportQueue(rows, query), [request]);
  assert.deepEqual(supportQueueCounts(searchSupportQueue(rows, "VAT")), { all: 1, open: 1, reviewing: 0, closed: 0 });
  assert.deepEqual(searchSupportQueue(rows, "missing"), []);
  assert.equal(searchSupportQueue(rows, "  ").length, 2);
});

test("selection cannot retain hidden requests or restore them after clearing a filter", () => {
  const selected = visibleSupportSelection(ids, [request]);
  assert.deepEqual(selected, [ids[0]]);
  assert.deepEqual(visibleSupportSelection(selected, ids.map((id) => ({ ...request, id }))), [ids[0]]);
  assert.deepEqual(visibleSupportSelection(selected, []), []);
});

test("bulk targets reject empty, duplicate, malformed and oversized selections", () => {
  assert.equal(validSupportBulkTargets([{ id: ids[0], version }]), true);
  for (const value of [null, [], [{ id: "bad", version }], [{ id: ids[0], version: "bad" }], [{ id: ids[0], version }, { id: ids[0], version }], Array.from({ length: 41 }, (_, i) => ({ id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`, version }))]) assert.equal(validSupportBulkTargets(value), false);
});

test("bulk results distinguish saved, stale and uncertain updates without dropping later work", async () => {
  const visited: string[] = [];
  const result = await applySupportBulk(ids.map((id) => ({ id, version })), async (target) => {
    visited.push(target.id);
    assert.equal(target.version, version);
    if (target.id === ids[0]) return null;
    if (target.id === ids[1]) throw new Error("connection lost");
    return { id: target.id, status: "closed", updatedAt: version };
  });
  assert.deepEqual(visited, ids);
  assert.deepEqual(result.saved.map((row) => row.id), [ids[2]]);
  assert.match(result.failed[0].error, /Changed in another tab/);
  assert.match(result.failed[1].error, /Could not confirm/);
});

test("queue loads beyond the first database page and rejects incomplete reads", async () => {
  for (const fail of [false, true]) {
    const ranges: number[][] = [];
    const client = { from() { return { select() { return this; }, order() { return this; }, async range(start: number, end: number) {
      ranges.push([start, end]);
      if (start && fail) return { data: null, error: new Error("second page unavailable") };
      return { data: Array.from({ length: start ? 1 : 200 }, (_, index) => ({ id: String(start + index), subject: `Request ${start + index}`, status: "open", created_at: version })), error: null };
    } }; } } as unknown as SupabaseClient;
    if (fail) await assert.rejects(loadAdminSupportQueue(client), /second page unavailable/);
    else assert.equal((await loadAdminSupportQueue(client)).length, 201);
    assert.deepEqual(ranges, [[0, 199], [200, 399]]);
  }
});
