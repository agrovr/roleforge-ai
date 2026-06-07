import assert from "node:assert/strict";
import test from "node:test";

import {
  listSupportRequests,
  maskSupportEmail,
  parseArgs,
  summarizeSupportInbox,
  summarizeSupportRequest,
  supportRequestReference,
} from "./list_support_requests.mjs";

function fakeSupportClient(rows = []) {
  const calls = [];
  const builder = {
    select(value) {
      calls.push({ method: "select", value });
      return builder;
    },
    eq(column, value) {
      calls.push({ method: "eq", column, value });
      return builder;
    },
    order(column, options) {
      calls.push({ method: "order", column, options });
      return builder;
    },
    async limit(value) {
      calls.push({ method: "limit", value });
      return { data: rows, error: null };
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

test("builds customer-safe support request references", () => {
  assert.equal(supportRequestReference("4adcd15a-769a-4c2f-939f-09df6e70a225"), "RF-70A225");
  assert.equal(supportRequestReference("abc"), "RF-000ABC");
});

test("masks support request emails by default", () => {
  assert.equal(maskSupportEmail("person@example.com"), "p***n@e***.com");
  assert.equal(maskSupportEmail("ab@example.com"), "a***@e***.com");
  assert.equal(maskSupportEmail("person@example.com", { showEmail: true }), "person@example.com");
  assert.equal(maskSupportEmail(""), "missing");
});

test("summarizes support request rows for operator review", () => {
  assert.deepEqual(
    summarizeSupportRequest({
      id: "4adcd15a-769a-4c2f-939f-09df6e70a225",
      created_at: "2026-06-06T12:00:00.000Z",
      status: "open",
      category: "billing",
      email: "person@example.com",
      subject: "Premium sync",
      context_url: "/settings#billing",
      message: "Checkout completed but Settings still shows Free.",
    }),
    {
      reference: "RF-70A225",
      createdAt: "2026-06-06T12:00:00.000Z",
      status: "open",
      category: "billing",
      email: "p***n@e***.com",
      subject: "Premium sync",
      contextUrl: "/settings#billing",
      messagePreview: "Checkout completed but Settings still shows Free.",
    },
  );
});

test("parses support inbox options safely", () => {
  assert.deepEqual(parseArgs(["--status", "all", "--limit=50", "--category", "privacy", "--json", "--summary", "--show-email"]), {
    limit: 50,
    status: "all",
    category: "privacy",
    json: true,
    summary: true,
    showEmail: true,
    supabaseCli: true,
  });
  assert.equal(parseArgs(["--no-supabase-cli"]).supabaseCli, false);
  assert.throws(() => parseArgs(["--limit", "0"]), /--limit must be an integer/);
  assert.throws(() => parseArgs(["--status", "pending"]), /--status must be/);
  assert.throws(() => parseArgs(["--category", "sales"]), /--category must be/);
});

test("summarizes support inbox counts without ticket content", () => {
  assert.deepEqual(
    summarizeSupportInbox([
      { createdAt: "2026-06-06T10:00:00.000Z", status: "open", category: "billing", subject: "Hidden" },
      { createdAt: "2026-06-06T12:00:00.000Z", status: "reviewing", category: "privacy", messagePreview: "Hidden" },
      { createdAt: "2026-06-06T11:00:00.000Z", status: "open", category: "billing", email: "hidden@example.com" },
    ]),
    {
      count: 3,
      newestCreatedAt: "2026-06-06T12:00:00.000Z",
      byStatus: { open: 2, reviewing: 1 },
      byCategory: { billing: 2, privacy: 1 },
    },
  );
});

test("loads recent support requests with status and category filters", async () => {
  const { client, calls } = fakeSupportClient([
    {
      id: "4adcd15a-769a-4c2f-939f-09df6e70a225",
      created_at: "2026-06-06T12:00:00.000Z",
      status: "reviewing",
      category: "privacy",
      email: "person@example.com",
      subject: "Data export",
      context_url: "/settings#data-privacy",
      message: "I need help understanding my account export.",
    },
  ]);

  const requests = await listSupportRequests({
    client,
    limit: 10,
    status: "reviewing",
    category: "privacy",
    showEmail: true,
  });

  assert.deepEqual(calls, [
    { method: "from", table: "support_requests" },
    { method: "select", value: "id, email, category, subject, message, context_url, status, created_at" },
    { method: "eq", column: "status", value: "reviewing" },
    { method: "eq", column: "category", value: "privacy" },
    { method: "order", column: "created_at", options: { ascending: false } },
    { method: "limit", value: 10 },
  ]);
  assert.equal(requests[0]?.email, "person@example.com");
  assert.equal(requests[0]?.reference, "RF-70A225");
});
