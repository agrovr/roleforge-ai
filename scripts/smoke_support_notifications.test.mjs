import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSupportNotificationSmokePayload,
  normalizeSupportWebhookUrl,
  parseArgs,
  sendSupportNotificationSmoke,
} from "./smoke_support_notifications.mjs";

test("normalizes support notification smoke webhook urls", () => {
  assert.equal(normalizeSupportWebhookUrl("https://hooks.example.com/roleforge"), "https://hooks.example.com/roleforge");
  assert.equal(normalizeSupportWebhookUrl("http://hooks.example.com/roleforge"), "");
  assert.equal(normalizeSupportWebhookUrl("javascript:alert(1)"), "");
});

test("builds a clearly marked support notification smoke payload", () => {
  assert.deepEqual(
    buildSupportNotificationSmokePayload({ createdAt: "2026-06-06T12:00:00.000Z" }),
    {
      event: "support_request.test",
      reference: "RF-SMOKE",
      requestId: "support-notification-smoke",
      createdAt: "2026-06-06T12:00:00.000Z",
      category: "other",
      categoryLabel: "Other",
      subject: "RoleForge support notification smoke",
      message: "This is an operator smoke test for the support notification webhook. It is not a customer support request.",
      contextUrl: "/support#request",
      account: {
        email: null,
      },
    },
  );
});

test("parses support notification smoke options", () => {
  assert.deepEqual(parseArgs(["--url", "https://hooks.example.com/roleforge", "--secret=hidden", "--dry-run", "--json"]), {
    url: "https://hooks.example.com/roleforge",
    secret: "hidden",
    dryRun: true,
    json: true,
  });
  assert.throws(() => parseArgs(["--url"]), /--url requires a value/);
  assert.throws(() => parseArgs(["--unknown"]), /Unknown argument/);
});

test("sends support notification smoke payload with optional secret header", async () => {
  const calls = [];
  const result = await sendSupportNotificationSmoke({
    url: "https://hooks.example.com/roleforge",
    secret: "secret-value",
    payload: buildSupportNotificationSmokePayload({ createdAt: "2026-06-06T12:00:00.000Z" }),
    fetcher: async (url, init) => {
      calls.push({ url, init });
      return { ok: true, status: 204 };
    },
  });

  assert.deepEqual(result, { ok: true, status: 204, reference: "RF-SMOKE" });
  assert.equal(calls[0]?.url, "https://hooks.example.com/roleforge");
  assert.equal(calls[0]?.init?.method, "POST");
  assert.equal(calls[0]?.init?.headers?.["content-type"], "application/json");
  assert.equal(calls[0]?.init?.headers?.["x-roleforge-support-secret"], "secret-value");
  assert.match(calls[0]?.init?.body ?? "", /"event":"support_request\.test"/);
});

test("reports support notification smoke failures without exposing secrets", async () => {
  const result = await sendSupportNotificationSmoke({
    url: "https://hooks.example.com/roleforge",
    secret: "secret-value",
    fetcher: async () => ({ ok: false, status: 500, text: async () => "destination failed loudly" }),
  });

  assert.deepEqual(result, {
    ok: false,
    status: 500,
    reference: "RF-SMOKE",
    bodyPreview: "destination failed loudly",
  });
});
