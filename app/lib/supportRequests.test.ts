import assert from "node:assert/strict";
import test from "node:test";

import {
  loadSupportRequests,
  parseSupportRequestPrefill,
  parseSupportRequestInput,
  saveSupportRequest,
  supportCategoryLabel,
  supportRequestHref,
  supportStatusLabel,
} from "./supportRequests";

test("parses valid support request input", () => {
  const result = parseSupportRequestInput({
    category: "billing",
    subject: " Premium access ",
    message: "Checkout completed but Premium access still looks unavailable in Settings.",
    contextUrl: "/settings#billing",
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.input.category, "billing");
    assert.equal(result.input.subject, "Premium access");
    assert.equal(result.input.contextUrl, "/settings#billing");
  }
});

test("rejects incomplete support request input", () => {
  assert.equal(parseSupportRequestInput({ category: "bad", subject: "Export", message: "This message is long enough." }).ok, false);
  assert.equal(parseSupportRequestInput({ category: "exports", subject: "A", message: "This message is long enough." }).ok, false);
  assert.equal(parseSupportRequestInput({ category: "exports", subject: "Export issue", message: "Too short" }).ok, false);
});

test("keeps support request context safe and bounded", () => {
  const external = parseSupportRequestInput({
    category: "workflow",
    subject: "Workflow request",
    message: "The workflow returned a request id and I need help reading it.",
    contextUrl: "https://roleforgeai.vercel.app/app#history",
  });
  assert.equal(external.ok, true);
  if (external.ok) assert.equal(external.input.contextUrl, "https://roleforgeai.vercel.app/app#history");

  const unsafe = parseSupportRequestInput({
    category: "workflow",
    subject: "Workflow request",
    message: "The workflow returned a request id and I need help reading it.",
    contextUrl: "javascript:alert(1)",
  });
  assert.equal(unsafe.ok, true);
  if (unsafe.ok) assert.equal(unsafe.input.contextUrl, null);
});

test("parses support request prefill without trusting unsafe input", () => {
  const prefill = parseSupportRequestPrefill({
    category: "billing",
    subject: " Premium access ",
    context: "/settings#billing",
  });

  assert.deepEqual(prefill, {
    category: "billing",
    subject: "Premium access",
    contextUrl: "/settings#billing",
    hasPrefill: true,
  });

  const unsafe = parseSupportRequestPrefill({
    category: "bad",
    subject: "No",
    context: "javascript:alert(1)",
  });

  assert.deepEqual(unsafe, {
    category: "workflow",
    subject: "",
    contextUrl: null,
    hasPrefill: false,
  });
});

test("builds compact support request hrefs for contextual links", () => {
  assert.equal(
    supportRequestHref({ category: "exports", subject: "DOCX export access", contextUrl: "/app" }),
    "/support?category=exports&subject=DOCX+export+access&context=%2Fapp#request",
  );
  assert.equal(supportRequestHref(), "/support");
});

test("labels support request categories for the form", () => {
  assert.equal(supportCategoryLabel("saved-projects"), "Saved projects");
  assert.equal(supportCategoryLabel("billing"), "Billing");
  assert.equal(supportStatusLabel("reviewing"), "Reviewing");
});

test("loads recent support requests with customer-facing status summaries", async () => {
  const calls: Array<{ table: string; query?: string; userId?: string; limit?: number }> = [];
  const fakeClient = {
    from(table: string) {
      calls.push({ table });
      return {
        select(query: string) {
          calls[calls.length - 1].query = query;
          return {
            eq(column: string, userId: string) {
              assert.equal(column, "user_id");
              calls[calls.length - 1].userId = userId;
              return {
                order(columnName: string, options: { ascending: boolean }) {
                  assert.equal(columnName, "created_at");
                  assert.deepEqual(options, { ascending: false });
                  return {
                    async limit(value: number) {
                      calls[calls.length - 1].limit = value;
                      return {
                        data: [
                          {
                            id: "support-1",
                            category: "billing",
                            subject: "Premium sync",
                            message: "Checkout completed and the billing panel still says free plan.",
                            context_url: "/settings#billing",
                            status: "reviewing",
                            created_at: "2026-06-02T18:00:00.000Z",
                          },
                        ],
                        error: null,
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  const requests = await loadSupportRequests(fakeClient as never, "user-123", { limit: 5 });

  assert.equal(calls[0]?.table, "support_requests");
  assert.equal(calls[0]?.query, "id, category, subject, message, context_url, status, created_at");
  assert.equal(calls[0]?.userId, "user-123");
  assert.equal(calls[0]?.limit, 5);
  assert.deepEqual(requests[0], {
    id: "support-1",
    category: "billing",
    categoryLabel: "Billing",
    subject: "Premium sync",
    messagePreview: "Checkout completed and the billing panel still says free plan.",
    contextUrl: "/settings#billing",
    status: "reviewing",
    statusLabel: "Reviewing",
    createdAt: "2026-06-02T18:00:00.000Z",
    createdLabel: "Jun 2, 2026",
  });
});

test("saves support requests without exposing protected account data", async () => {
  const calls: Array<{ table: string; payload: unknown }> = [];
  const fakeClient = {
    from(table: string) {
      return {
        insert(payload: unknown) {
          calls.push({ table, payload });
          return {
            select(query: string) {
              assert.equal(query, "id, created_at");
              return {
                async single() {
                  return { data: { id: "support-1", created_at: "2026-06-02T01:00:00.000Z" }, error: null };
                },
              };
            },
          };
        },
      };
    },
  };

  const result = await saveSupportRequest(
    fakeClient as never,
    {
      category: "account",
      subject: "Email update",
      message: "The email update did not show the confirmation state I expected.",
      contextUrl: "/settings#account-email",
    },
    { id: "user-123", email: "person@example.com" },
  );

  assert.deepEqual(result, { id: "support-1", createdAt: "2026-06-02T01:00:00.000Z" });
  assert.equal(calls[0]?.table, "support_requests");
  assert.deepEqual(calls[0]?.payload, {
    user_id: "user-123",
    email: "person@example.com",
    category: "account",
    subject: "Email update",
    message: "The email update did not show the confirmation state I expected.",
    context_url: "/settings#account-email",
  });
});
