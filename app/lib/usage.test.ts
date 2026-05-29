import assert from "node:assert/strict";
import test from "node:test";

import type { SupabaseClient } from "@supabase/supabase-js";

import { FREE_ENTITLEMENT, type AccountEntitlement } from "./entitlements";
import {
  accountUsageSummary,
  currentUsagePeriod,
  loadAccountUsage,
  monthlyRunAllowanceLabel,
  monthlyRunAllowanceSentence,
  usageProgressPercent,
} from "./usage";

const freeEntitlement: AccountEntitlement = FREE_ENTITLEMENT;

const premiumEntitlement: AccountEntitlement = {
  ...FREE_ENTITLEMENT,
  plan: "premium",
  billingStatus: "active",
  exportFormats: { pdf: true, docx: true, txt: true },
  monthlyRunLimit: null,
};

test("calculates the current UTC monthly usage window", () => {
  const period = currentUsagePeriod(new Date("2026-05-21T12:34:56.000Z"));

  assert.equal(period.startIso, "2026-05-01T00:00:00.000Z");
  assert.equal(period.endIso, "2026-06-01T00:00:00.000Z");
});

test("loads monthly usage scoped to the signed-in user", async () => {
  const calls: Array<[string, string]> = [];
  const client = {
    from(table: string) {
      assert.equal(table, "tailor_runs");
      return {
        select(query: string, options: { count: string; head: boolean }) {
          assert.equal(query, "id");
          assert.deepEqual(options, { count: "exact", head: true });
          return {
            eq(column: string, value: string) {
              calls.push([column, value]);
              assert.equal(column, "user_id");
              assert.equal(value, "user-123");
              return {
                gte(nextColumn: string, nextValue: string) {
                  calls.push([nextColumn, nextValue]);
                  assert.equal(nextColumn, "created_at");
                  return {
                    async lt(finalColumn: string, finalValue: string) {
                      calls.push([finalColumn, finalValue]);
                      assert.equal(finalColumn, "created_at");
                      return { count: 3, error: null };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;

  const usage = await loadAccountUsage(client, "user-123", freeEntitlement);

  assert.equal(usage.monthlyRuns, 3);
  assert.equal(usage.monthlyRunLimit, 5);
  assert.equal(usage.remainingRuns, 2);
  assert.equal(usage.runLimited, false);
  assert.equal(calls[0][0], "user_id");
});

test("treats premium usage as unlimited while still counting runs", async () => {
  const client = {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                gte() {
                  return {
                    async lt() {
                      return { count: 12, error: null };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;

  const usage = await loadAccountUsage(client, "user-123", premiumEntitlement);

  assert.equal(usage.monthlyRuns, 12);
  assert.equal(usage.monthlyRunLimit, null);
  assert.equal(usage.remainingRuns, null);
  assert.equal(usage.runLimited, false);
});

test("formats monthly allowance copy from entitlement limits", () => {
  assert.equal(monthlyRunAllowanceLabel(1), "1 run each month");
  assert.equal(monthlyRunAllowanceLabel(5), "5 runs each month");
  assert.equal(monthlyRunAllowanceLabel(null), "Unlimited runs");

  assert.equal(
    monthlyRunAllowanceSentence(1),
    "Free includes 1 completed tailoring run each month. Upgrade when you need more room.",
  );
  assert.equal(
    monthlyRunAllowanceSentence(null),
    "Premium does not count completed runs against a monthly cap.",
  );
});

test("calculates usage progress without invalid widths", () => {
  assert.equal(usageProgressPercent({ monthlyRuns: 3, monthlyRunLimit: 5, runLimited: false }), 60);
  assert.equal(usageProgressPercent({ monthlyRuns: 10, monthlyRunLimit: 5, runLimited: true }), 100);
  assert.equal(usageProgressPercent({ monthlyRuns: 0, monthlyRunLimit: 0, runLimited: true }), 100);
  assert.equal(usageProgressPercent({ monthlyRuns: 0, monthlyRunLimit: null, runLimited: false }), 100);
});

test("summarizes pending usage without showing a false free limit", () => {
  assert.deepEqual(
    accountUsageSummary({ usage: null, entitlement: premiumEntitlement }),
    {
      monthlyRuns: 0,
      monthlyRunLimit: null,
      pending: true,
      label: "Premium runs are unlimited",
    },
  );

  assert.deepEqual(
    accountUsageSummary({ usage: null, entitlement: freeEntitlement }),
    {
      monthlyRuns: 0,
      monthlyRunLimit: 5,
      pending: true,
      label: "Usage refresh pending",
    },
  );
});

test("summarizes usage limit errors even when the backend omits run counts", () => {
  assert.deepEqual(
    accountUsageSummary({ usage: null, entitlement: freeEntitlement, limitError: true, errorMonthlyLimit: 5 }),
    {
      monthlyRuns: 5,
      monthlyRunLimit: 5,
      pending: false,
      label: "5/5 runs used",
    },
  );
});
