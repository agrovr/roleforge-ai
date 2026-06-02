import assert from "node:assert/strict";
import test from "node:test";

import { parseSupportRequestInput, saveSupportRequest, supportCategoryLabel } from "./supportRequests";

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

test("labels support request categories for the form", () => {
  assert.equal(supportCategoryLabel("saved-projects"), "Saved projects");
  assert.equal(supportCategoryLabel("billing"), "Billing");
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
