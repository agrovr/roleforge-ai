import assert from "node:assert/strict";
import test from "node:test";

import type Stripe from "stripe";

import { entitlementPatchFromSubscription, normalizeBillingStatus } from "./entitlements";

function subscriptionFixture(overrides: Partial<Stripe.Subscription> = {}) {
  const base = {
    id: "sub_test",
    status: "active",
    customer: "cus_test",
    metadata: {
      supabase_user_id: "user_test",
    },
    cancel_at_period_end: false,
    cancel_at: null,
    canceled_at: null,
    items: {
      data: [
        {
          current_period_end: 1781742907,
        },
      ],
    },
  };

  return { ...base, ...overrides } as unknown as Stripe.Subscription;
}

test("normalizes supported Stripe subscription statuses", () => {
  assert.equal(normalizeBillingStatus("active"), "active");
  assert.equal(normalizeBillingStatus("trialing"), "trialing");
  assert.equal(normalizeBillingStatus("past_due"), "past_due");
  assert.equal(normalizeBillingStatus("canceled"), "canceled");
  assert.equal(normalizeBillingStatus("incomplete"), "incomplete");
  assert.equal(normalizeBillingStatus("incomplete_expired"), "incomplete_expired");
  assert.equal(normalizeBillingStatus("unpaid"), "unpaid");
  assert.equal(normalizeBillingStatus("paused"), "paused");
  assert.equal(normalizeBillingStatus(null), "none");
});

test("keeps active subscriptions on premium", () => {
  const patch = entitlementPatchFromSubscription(subscriptionFixture());

  assert.equal(patch.plan, "premium");
  assert.equal(patch.billingStatus, "active");
  assert.equal(patch.cancelAtPeriodEnd, false);
  assert.equal(patch.currentPeriodEnd, "2026-06-18T00:35:07.000Z");
});

test("keeps cancel-at-period-end subscriptions premium until the period ends", () => {
  const patch = entitlementPatchFromSubscription(subscriptionFixture({
    cancel_at_period_end: true,
    cancel_at: 1781742907,
  }));

  assert.equal(patch.plan, "premium");
  assert.equal(patch.billingStatus, "active");
  assert.equal(patch.cancelAtPeriodEnd, true);
  assert.equal(patch.cancelAt, "2026-06-18T00:35:07.000Z");
});

test("downgrades final canceled subscriptions to free", () => {
  const patch = entitlementPatchFromSubscription(subscriptionFixture({
    status: "canceled",
    cancel_at_period_end: false,
    canceled_at: 1781742907,
  }));

  assert.equal(patch.plan, "free");
  assert.equal(patch.billingStatus, "canceled");
  assert.equal(patch.cancelAtPeriodEnd, false);
  assert.equal(patch.canceledAt, "2026-06-18T00:35:07.000Z");
});

test("does not treat past_due as premium access", () => {
  const patch = entitlementPatchFromSubscription(subscriptionFixture({
    status: "past_due",
  }));

  assert.equal(patch.plan, "free");
  assert.equal(patch.billingStatus, "past_due");
});
