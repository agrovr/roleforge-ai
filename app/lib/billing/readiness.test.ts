import assert from "node:assert/strict";
import test from "node:test";

import { billingReadiness } from "./readiness";

test("enables checkout only when Stripe prices and service role are configured", () => {
  assert.deepEqual(
    billingReadiness(
      { secretKey: "sk_test", checkoutConfigured: true },
      { hasServiceRole: true, billingStatus: "none" },
    ),
    { checkoutReady: true, portalReady: false },
  );

  assert.equal(
    billingReadiness(
      { secretKey: "sk_test", checkoutConfigured: false },
      { hasServiceRole: true, billingStatus: "none" },
    ).checkoutReady,
    false,
  );

  assert.equal(
    billingReadiness(
      { secretKey: "sk_test", checkoutConfigured: true },
      { hasServiceRole: false, billingStatus: "none" },
    ).checkoutReady,
    false,
  );
});

test("keeps billing portal available for existing Stripe customers even if checkout prices are unavailable", () => {
  assert.deepEqual(
    billingReadiness(
      { secretKey: "sk_test", checkoutConfigured: false },
      { hasServiceRole: true, billingStatus: "canceled" },
    ),
    { checkoutReady: false, portalReady: true },
  );
});

test("disables billing portal when there is no subscription state to manage", () => {
  assert.equal(
    billingReadiness(
      { secretKey: "sk_test", checkoutConfigured: true },
      { hasServiceRole: true, billingStatus: "none" },
    ).portalReady,
    false,
  );
});
