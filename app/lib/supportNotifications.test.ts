import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSupportRequestNotificationPayload,
  normalizeSupportWebhookUrl,
  notifySupportRequestCreated,
} from "./supportNotifications";

const saved = {
  id: "4adcd15a-769a-4c2f-939f-09df6e70a225",
  createdAt: "2026-06-06T05:00:00.000Z",
};

const input = {
  category: "billing" as const,
  subject: "Premium sync",
  message: "Checkout completed but Settings still shows Free.",
  contextUrl: "/settings#billing",
};

test("normalizes support notification webhook urls safely", () => {
  assert.equal(normalizeSupportWebhookUrl("https://hooks.example.com/roleforge"), "https://hooks.example.com/roleforge");
  assert.equal(normalizeSupportWebhookUrl(" http://hooks.example.com/roleforge "), null);
  assert.equal(normalizeSupportWebhookUrl("javascript:alert(1)"), null);
  assert.equal(normalizeSupportWebhookUrl(""), null);
});

test("builds a traceable support request notification payload", () => {
  assert.deepEqual(
    buildSupportRequestNotificationPayload({
      saved,
      input,
      user: { email: "person@example.com" },
    }),
    {
      event: "support_request.created",
      reference: "RF-70A225",
      requestId: "4adcd15a-769a-4c2f-939f-09df6e70a225",
      createdAt: "2026-06-06T05:00:00.000Z",
      category: "billing",
      categoryLabel: "Billing",
      subject: "Premium sync",
      message: "Checkout completed but Settings still shows Free.",
      contextUrl: "/settings#billing",
      account: {
        email: "person@example.com",
      },
    },
  );
});

test("skips support notifications when no webhook is configured", async () => {
  const result = await notifySupportRequestCreated({
    saved,
    input,
    user: { email: "person@example.com" },
    env: {},
    fetcher: async () => ({ ok: true, status: 204 }),
  });

  assert.deepEqual(result, { status: "skipped", reason: "missing-webhook" });
});

test("posts support notifications with an optional secret header", async () => {
  const calls: Array<{ input: string | URL; init?: { method?: string; headers?: Record<string, string>; body?: string } }> = [];
  const result = await notifySupportRequestCreated({
    saved,
    input,
    user: { email: "person@example.com" },
    env: {
      ROLEFORGE_SUPPORT_WEBHOOK_URL: "https://hooks.example.com/roleforge",
      ROLEFORGE_SUPPORT_WEBHOOK_SECRET: "secret-value",
    },
    fetcher: async (requestUrl, init) => {
      calls.push({ input: requestUrl, init });
      return { ok: true, status: 204 };
    },
  });

  assert.deepEqual(result, { status: "sent" });
  assert.equal(calls[0]?.input, "https://hooks.example.com/roleforge");
  assert.equal(calls[0]?.init?.method, "POST");
  assert.equal(calls[0]?.init?.headers?.["content-type"], "application/json");
  assert.equal(calls[0]?.init?.headers?.["x-roleforge-support-secret"], "secret-value");
  assert.match(calls[0]?.init?.body ?? "", /"event":"support_request\.created"/);
  assert.match(calls[0]?.init?.body ?? "", /"reference":"RF-70A225"/);
});

test("reports support notification failures without throwing", async () => {
  const result = await notifySupportRequestCreated({
    saved,
    input,
    user: { email: "person@example.com" },
    env: { ROLEFORGE_SUPPORT_WEBHOOK_URL: "https://hooks.example.com/roleforge" },
    fetcher: async () => ({ ok: false, status: 500, text: async () => "Webhook destination failed with a noisy response" }),
  });

  assert.deepEqual(result, {
    status: "failed",
    statusCode: 500,
    bodyPreview: "Webhook destination failed with a noisy response",
  });
});

test("reports support notification network errors without throwing", async () => {
  const result = await notifySupportRequestCreated({
    saved,
    input,
    user: { email: "person@example.com" },
    env: { ROLEFORGE_SUPPORT_WEBHOOK_URL: "https://hooks.example.com/roleforge" },
    fetcher: async () => {
      throw new Error("network unavailable");
    },
  });

  assert.deepEqual(result, {
    status: "failed",
    statusCode: 0,
    bodyPreview: "network unavailable",
  });
});
