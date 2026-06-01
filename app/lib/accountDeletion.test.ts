import assert from "node:assert/strict";
import test from "node:test";

import { accountDeletionBlockedByBilling, validateAccountDeletionConfirmation } from "./accountDeletion";

test("requires an exact account deletion confirmation phrase", () => {
  assert.equal(validateAccountDeletionConfirmation("DELETE"), true);
  assert.equal(validateAccountDeletionConfirmation(" delete "), false);
  assert.equal(validateAccountDeletionConfirmation("DELETE NOW"), false);
  assert.equal(validateAccountDeletionConfirmation(null), false);
});

test("blocks account deletion while a Stripe subscription can still bill", () => {
  assert.equal(
    accountDeletionBlockedByBilling({ billing_status: "active", stripe_subscription_id: "sub_live" }),
    "billing-active",
  );
  assert.equal(
    accountDeletionBlockedByBilling({ billing_status: "past_due", stripe_subscription_id: "sub_live" }),
    "billing-active",
  );
  assert.equal(
    accountDeletionBlockedByBilling({ billing_status: "canceled", stripe_subscription_id: "sub_live" }),
    "none",
  );
  assert.equal(
    accountDeletionBlockedByBilling({ billing_status: "active", stripe_subscription_id: null }),
    "none",
  );
});
