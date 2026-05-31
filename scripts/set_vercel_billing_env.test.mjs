import assert from "node:assert/strict";
import test from "node:test";

import { validateBillingEnvValue } from "./set_vercel_billing_env.mjs";

test("accepts only live Stripe secret keys for production billing", () => {
  assert.equal(validateBillingEnvValue("STRIPE_SECRET_KEY", "sk_live_example"), true);
  assert.throws(
    () => validateBillingEnvValue("STRIPE_SECRET_KEY", "sk_test_example"),
    /does not look like a live Stripe secret key/,
  );
});

test("accepts expected Stripe price and webhook identifiers", () => {
  assert.equal(validateBillingEnvValue("STRIPE_PREMIUM_MONTHLY_PRICE_ID", "price_monthly"), true);
  assert.equal(validateBillingEnvValue("STRIPE_PREMIUM_YEARLY_PRICE_ID", "price_yearly"), true);
  assert.equal(validateBillingEnvValue("STRIPE_WEBHOOK_SECRET", "whsec_live"), true);
});

test("rejects unsupported or empty billing env values", () => {
  assert.throws(() => validateBillingEnvValue("NEXT_PUBLIC_SITE_URL", "https://roleforgeai.vercel.app"), /Unsupported/);
  assert.throws(() => validateBillingEnvValue("STRIPE_WEBHOOK_SECRET", ""), /No value/);
});
