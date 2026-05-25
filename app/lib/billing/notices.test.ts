import assert from "node:assert/strict";
import test from "node:test";

import { billingNotice } from "./notices";

test("formats checkout success based on synced premium state", () => {
  assert.deepEqual(billingNotice("checkout-success", { premiumActive: true }), {
    tone: "success",
    text: "Checkout is complete. Premium access is active for this account.",
  });

  assert.deepEqual(billingNotice("checkout-success", { premiumActive: false }), {
    tone: "success",
    text: "Checkout is complete. Premium access will appear here as soon as the subscription syncs.",
  });
});

test("formats billing fallback notices without raw provider language", () => {
  assert.deepEqual(billingNotice("temporarily-unavailable"), {
    tone: "neutral",
    text: "Billing is taking a moment to connect. Try again shortly.",
  });
  assert.equal(billingNotice("temporarily-unavailable", { premiumActive: true }), null);
  assert.deepEqual(billingNotice("already-premium"), {
    tone: "neutral",
    text: "Premium is already active for this account. Use Manage billing for plan changes.",
  });
  assert.equal(billingNotice("unknown"), null);
});
