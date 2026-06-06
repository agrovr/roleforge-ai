import assert from "node:assert/strict";
import test from "node:test";

import {
  parseArgs,
  resolveSupportRequestId,
  updateSupportRequestStatus,
} from "./update_support_request_status.mjs";

const FIRST_ID = "4adcd15a-769a-4c2f-939f-09df6e70a225";
const SECOND_ID = "7bdcd15a-769a-4c2f-939f-09df6e70a225";

function fakeResolveClient(rows = [], error = null) {
  const calls = [];
  const builder = {
    select(value) {
      calls.push({ method: "select", value });
      return builder;
    },
    order(column, options) {
      calls.push({ method: "order", column, options });
      return builder;
    },
    async limit(value) {
      calls.push({ method: "limit", value });
      return { data: rows, error };
    },
  };
  return {
    calls,
    client: {
      from(table) {
        calls.push({ method: "from", table });
        return builder;
      },
    },
  };
}

function fakeUpdateClient(updatedRow = { id: FIRST_ID, status: "reviewing", updated_at: "2026-06-06T12:00:00.000Z" }) {
  const calls = [];
  const builder = {
    update(value) {
      calls.push({ method: "update", value });
      return builder;
    },
    eq(column, value) {
      calls.push({ method: "eq", column, value });
      return builder;
    },
    select(value) {
      calls.push({ method: "select", value });
      return builder;
    },
    async single() {
      calls.push({ method: "single" });
      return { data: updatedRow, error: null };
    },
  };
  return {
    calls,
    client: {
      from(table) {
        calls.push({ method: "from", table });
        return builder;
      },
    },
  };
}

test("parses support status update options safely", () => {
  assert.deepEqual(parseArgs(["--reference", "RF-70A225", "--status=reviewing", "--dry-run", "--json"]), {
    id: "",
    reference: "RF-70A225",
    status: "reviewing",
    dryRun: true,
    json: true,
    showId: false,
    searchLimit: 500,
  });
  assert.equal(parseArgs(["--id", FIRST_ID, "--status", "closed", "--show-id"]).id, FIRST_ID);
  assert.throws(() => parseArgs(["--reference", "RF-70A225"]), /--status is required/);
  assert.throws(() => parseArgs(["--reference", "RF-70A225", "--id", FIRST_ID, "--status", "open"]), /exactly one/);
  assert.throws(() => parseArgs(["--reference", "RF-70A225", "--status", "pending"]), /--status must be/);
  assert.throws(() => parseArgs(["--id", "not-a-uuid", "--status", "open"]), /full support request UUID/);
});

test("resolves support request references from recent rows", async () => {
  const { client, calls } = fakeResolveClient([{ id: FIRST_ID }]);
  const id = await resolveSupportRequestId(client, { reference: "RF-70A225", searchLimit: 25 });

  assert.equal(id, FIRST_ID);
  assert.deepEqual(calls, [
    { method: "from", table: "support_requests" },
    { method: "select", value: "id" },
    { method: "order", column: "created_at", options: { ascending: false } },
    { method: "limit", value: 25 },
  ]);
});

test("fails closed when a support reference is missing or ambiguous", async () => {
  const missing = fakeResolveClient([{ id: FIRST_ID }]);
  await assert.rejects(() => resolveSupportRequestId(missing.client, { reference: "RF-NOMATCH" }), /No support request found/);

  const ambiguous = fakeResolveClient([{ id: FIRST_ID }, { id: SECOND_ID }]);
  await assert.rejects(() => resolveSupportRequestId(ambiguous.client, { reference: "RF-70A225" }), /matched multiple/);
});

test("dry-run status updates do not mutate support requests", async () => {
  const { client, calls } = fakeResolveClient([{ id: FIRST_ID }]);
  const result = await updateSupportRequestStatus({
    client,
    reference: "RF-70A225",
    status: "reviewing",
    dryRun: true,
    showId: true,
  });

  assert.deepEqual(result, {
    reference: "RF-70A225",
    status: "reviewing",
    dryRun: true,
    id: FIRST_ID,
  });
  assert.equal(calls.some((call) => call.method === "update"), false);
});

test("updates only status and updated_at for the resolved support request", async () => {
  const { client, calls } = fakeUpdateClient();
  const result = await updateSupportRequestStatus({
    client,
    id: FIRST_ID,
    status: "reviewing",
    now: () => "2026-06-06T12:00:00.000Z",
  });

  assert.deepEqual(calls, [
    { method: "from", table: "support_requests" },
    { method: "update", value: { status: "reviewing", updated_at: "2026-06-06T12:00:00.000Z" } },
    { method: "eq", column: "id", value: FIRST_ID },
    { method: "select", value: "id, status, category, created_at, updated_at" },
    { method: "single" },
  ]);
  assert.deepEqual(result, {
    reference: "RF-70A225",
    status: "reviewing",
    dryRun: false,
    updatedAt: "2026-06-06T12:00:00.000Z",
  });
});
