import assert from "node:assert/strict";
import test from "node:test";

import { entitlementIsPremium, summarizeEntitlement } from "./check_premium_entitlement.mjs";

test("premium entitlement requires premium plan and active billing status", () => {
  assert.equal(entitlementIsPremium({ plan: "premium", billing_status: "active" }), true);
  assert.equal(entitlementIsPremium({ plan: "premium", billing_status: "trialing" }), true);
  assert.equal(entitlementIsPremium({ plan: "premium", billing_status: "canceled" }), false);
  assert.equal(entitlementIsPremium({ plan: "free", billing_status: "active" }), false);
});

test("entitlement summary avoids printing full Stripe ids", () => {
  const summary = summarizeEntitlement({
    plan: "premium",
    billing_status: "active",
    stripe_customer_id: "cus_live_customer",
    stripe_subscription_id: "sub_1234567890abcdef",
    current_period_end: "2026-06-30T00:00:00Z",
    cancel_at_period_end: false,
  });

  assert.equal(summary.premiumActive, true);
  assert.equal(summary.stripeCustomer, "present");
  assert.equal(summary.stripeSubscription, "sub_12...cdef");
});
