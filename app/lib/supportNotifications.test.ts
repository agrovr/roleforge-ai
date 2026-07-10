import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSupportReplyIdempotencyKey,
  buildSupportRequestNotificationPayload,
  normalizeSupportWebhookUrl,
  notifySupportRequestCreated,
  sendSupportReplyEmail,
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

test("skips support notifications when no destination is configured", async () => {
  const result = await notifySupportRequestCreated({
    saved,
    input,
    user: { email: "person@example.com" },
    env: {},
    fetcher: async () => ({ ok: true, status: 204 }),
  });

  assert.deepEqual(result, { status: "skipped", reason: "missing-destination" });
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

test("sends support notifications to Resend email when configured", async () => {
  const calls: Array<{ input: string | URL; init?: { method?: string; headers?: Record<string, string>; body?: string } }> = [];
  const result = await notifySupportRequestCreated({
    saved,
    input,
    user: { email: "person@example.com" },
    env: {
      RESEND_API_KEY: "re_secret_value",
      ROLEFORGE_SUPPORT_EMAIL_FROM: "RoleForge Support <support@roleforgeai.com>",
      ROLEFORGE_SUPPORT_EMAIL_TO: "owner@example.com",
    },
    fetcher: async (requestUrl, init) => {
      calls.push({ input: requestUrl, init });
      return { ok: true, status: 202 };
    },
  });

  assert.deepEqual(result, { status: "sent" });
  assert.equal(calls[0]?.input, "https://api.resend.com/emails");
  assert.equal(calls[0]?.init?.method, "POST");
  assert.equal(calls[0]?.init?.headers?.authorization, "Bearer re_secret_value");
  const body = JSON.parse(calls[0]?.init?.body ?? "{}");
  assert.equal(body.from, "RoleForge Support <support@roleforgeai.com>");
  assert.deepEqual(body.to, ["owner@example.com"]);
  assert.deepEqual(body.reply_to, ["person@example.com"]);
  assert.match(body.subject, /\[RoleForge Support\] RF-70A225 Billing: Premium sync/);
  assert.match(body.text, /Open the support inbox from \/admin\/support/);
  assert.match(body.text, /Mark the request reviewing or closed from the web inbox/);
});

test("skips partially configured support email notifications", async () => {
  const result = await notifySupportRequestCreated({
    saved,
    input,
    user: { email: "person@example.com" },
    env: {
      RESEND_API_KEY: "re_secret_value",
      ROLEFORGE_SUPPORT_EMAIL_TO: "owner@example.com",
    },
    fetcher: async () => ({ ok: true, status: 202 }),
  });

  assert.deepEqual(result, { status: "skipped", reason: "invalid-email" });
});

test("sends customer replies from the RoleForge support sender without exposing admin email", async () => {
  const calls: Array<{ input: string | URL; init?: { method?: string; headers?: Record<string, string>; body?: string } }> = [];
  const result = await sendSupportReplyEmail({
    to: "person@example.com",
    subject: "Premium sync",
    message: "Hi,\n\nPremium access is now active on your account.",
    reference: "RF-70A225",
    env: {
      RESEND_API_KEY: "re_secret_value",
      ROLEFORGE_SUPPORT_EMAIL_FROM: "RoleForge Support <support@roleforgeai.com>",
      ROLEFORGE_SUPPORT_EMAIL_TO: "private-admin@gmail.com",
    },
    fetcher: async (requestUrl, init) => {
      calls.push({ input: requestUrl, init });
      return { ok: true, status: 202 };
    },
  });

  assert.deepEqual(result, { status: "sent" });
  assert.equal(calls[0]?.input, "https://api.resend.com/emails");
  const body = JSON.parse(calls[0]?.init?.body ?? "{}");
  assert.equal(body.from, "RoleForge Support <support@roleforgeai.com>");
  assert.deepEqual(body.to, ["person@example.com"]);
  assert.equal(body.reply_to, undefined);
  assert.doesNotMatch(calls[0]?.init?.body ?? "", /private-admin@gmail\.com/);
  assert.match(body.subject, /Re: Premium sync \(RF-70A225\)/);
  assert.match(body.text, /Request: RF-70A225/);
});

test("uses stable Resend idempotency keys for the same support reply", async () => {
  const base = {
    requestId: saved.id,
    requestVersion: "2026-06-06T05:30:00.000Z",
    message: "Hi, Premium access is now active on your account.",
    nextStatus: "reviewing" as const,
  };
  const key = buildSupportReplyIdempotencyKey(base);

  assert.equal(key, buildSupportReplyIdempotencyKey(base));
  assert.notEqual(key, buildSupportReplyIdempotencyKey({ ...base, message: `${base.message} Thanks.` }));
  assert.match(key, new RegExp(`^support-reply/${saved.id}/[a-f0-9]{32}$`));
  assert.doesNotMatch(key, /Premium access/);

  const calls: Array<{ init?: { headers?: Record<string, string> } }> = [];
  const result = await sendSupportReplyEmail({
    to: "person@example.com",
    subject: "Premium sync",
    message: base.message,
    reference: "RF-70A225",
    idempotencyKey: key,
    env: {
      RESEND_API_KEY: "re_secret_value",
      ROLEFORGE_SUPPORT_EMAIL_FROM: "RoleForge Support <support@roleforgeai.com>",
    },
    fetcher: async (_requestUrl, init) => {
      calls.push({ init });
      return { ok: true, status: 202 };
    },
  });

  assert.deepEqual(result, { status: "sent" });
  assert.equal(calls[0]?.init?.headers?.["Idempotency-Key"], key);
});

test("skips customer replies without a verified support sender", async () => {
  const result = await sendSupportReplyEmail({
    to: "person@example.com",
    subject: "Premium sync",
    message: "Hi, quick reply.",
    reference: "RF-70A225",
    env: {
      RESEND_API_KEY: "re_secret_value",
      ROLEFORGE_SUPPORT_EMAIL_TO: "private-admin@gmail.com",
    },
    fetcher: async () => ({ ok: true, status: 202 }),
  });

  assert.deepEqual(result, { status: "skipped", reason: "invalid-email" });
});

test("reports customer reply send failures without throwing", async () => {
  const result = await sendSupportReplyEmail({
    to: "person@example.com",
    subject: "Premium sync",
    message: "Hi, quick reply.",
    reference: "RF-70A225",
    env: {
      RESEND_API_KEY: "re_secret_value",
      ROLEFORGE_SUPPORT_EMAIL_FROM: "RoleForge Support <support@roleforgeai.com>",
    },
    fetcher: async () => ({ ok: false, status: 403, text: async () => "sender is not verified" }),
  });

  assert.deepEqual(result, {
    status: "failed",
    statusCode: 403,
    bodyPreview: "sender is not verified",
  });
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
