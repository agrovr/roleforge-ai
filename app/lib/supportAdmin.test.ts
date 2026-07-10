import assert from "node:assert/strict";
import test from "node:test";

import {
  isSupportAdminUser,
  loadAdminSupportSummary,
  parseAdminSupportStatus,
  parseSupportAdminEmails,
  supportOperatorReadiness,
  updateAdminSupportRequestStatus,
} from "./supportAdmin";

test("parses support admin email allow lists safely", () => {
  assert.deepEqual(parseSupportAdminEmails("Owner@Example.com, support@example.com; bad"), [
    "owner@example.com",
    "support@example.com",
  ]);
  assert.deepEqual(parseSupportAdminEmails(""), []);
});

test("allows only configured support admin users", () => {
  const env = { ROLEFORGE_ADMIN_EMAILS: "owner@example.com, support@example.com" };
  assert.equal(isSupportAdminUser({ email: "Owner@Example.com" }, env), true);
  assert.equal(isSupportAdminUser({ email: "customer@example.com" }, env), false);
  assert.equal(isSupportAdminUser({ email: undefined }, env), false);
});

test("parses admin support statuses fail-closed", () => {
  assert.equal(parseAdminSupportStatus("open"), "open");
  assert.equal(parseAdminSupportStatus("reviewing"), "reviewing");
  assert.equal(parseAdminSupportStatus("closed"), "closed");
  assert.equal(parseAdminSupportStatus("deleted"), null);
});

test("summarizes support operator readiness without exposing secret values", () => {
  assert.deepEqual(supportOperatorReadiness({}), {
    adminAccessReady: false,
    customerReplyReady: false,
    emailAlertsReady: false,
    webhookReady: false,
    serviceRoleReady: false,
  });

  assert.deepEqual(
    supportOperatorReadiness({
      ROLEFORGE_ADMIN_EMAILS: "owner@example.com",
      RESEND_API_KEY: "re_do_not_print",
      ROLEFORGE_SUPPORT_EMAIL_TO: "RoleForge Ops <support@example.com>",
      ROLEFORGE_SUPPORT_EMAIL_FROM: "RoleForge Support <support@roleforgeai.com>",
      ROLEFORGE_SUPPORT_WEBHOOK_URL: "https://hooks.example.com/roleforge",
      SUPABASE_SERVICE_ROLE_KEY: "service_role_do_not_print",
    }),
    {
      adminAccessReady: true,
      customerReplyReady: true,
      emailAlertsReady: true,
      webhookReady: true,
      serviceRoleReady: true,
    },
  );
});

test("loads real support queue counts independently from the active list filter", async () => {
  const counts = { all: 14, open: 6, reviewing: 3, closed: 5 };

  class CountQuery implements PromiseLike<{ count: number; error: null }> {
    private status: keyof typeof counts = "all";

    eq(_column: string, value: keyof typeof counts) {
      this.status = value;
      return this;
    }

    then<TResult1 = { count: number; error: null }, TResult2 = never>(
      onfulfilled?: ((value: { count: number; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): PromiseLike<TResult1 | TResult2> {
      return Promise.resolve({ count: counts[this.status], error: null }).then(onfulfilled, onrejected);
    }
  }

  const client = {
    from(table: string) {
      assert.equal(table, "support_requests");
      return {
        select(columns: string, options: { count: string; head: boolean }) {
          assert.equal(columns, "id");
          assert.deepEqual(options, { count: "exact", head: true });
          return new CountQuery();
        },
      };
    },
  } as unknown as Parameters<typeof loadAdminSupportSummary>[0];

  assert.deepEqual(await loadAdminSupportSummary(client), counts);
});

test("updates support status only when the operator form is current", async () => {
  const calls: Array<{ method: string; column?: string; value?: unknown }> = [];
  const query = {
    eq(column: string, value: unknown) {
      calls.push({ method: "eq", column, value });
      return this;
    },
    select(value: string) {
      calls.push({ method: "select", value });
      return this;
    },
    async maybeSingle() {
      return { data: null, error: null };
    },
  };
  const client = {
    from(table: string) {
      assert.equal(table, "support_requests");
      return {
        update(value: unknown) {
          calls.push({ method: "update", value });
          return query;
        },
      };
    },
  } as unknown as Parameters<typeof updateAdminSupportRequestStatus>[0];

  const updated = await updateAdminSupportRequestStatus(client, savedId, "closed", {
    expectedUpdatedAt: "2026-06-06T05:30:00.000Z",
  });

  assert.equal(updated, null);
  assert.deepEqual(
    calls.filter((call) => call.method === "eq"),
    [
      { method: "eq", column: "id", value: savedId },
      { method: "eq", column: "updated_at", value: "2026-06-06T05:30:00.000Z" },
    ],
  );
});

const savedId = "4adcd15a-769a-4c2f-939f-09df6e70a225";
