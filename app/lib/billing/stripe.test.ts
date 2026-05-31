import assert from "node:assert/strict";
import test from "node:test";

import { CHECKOUT_SESSION_ID_TEMPLATE, absoluteUrl, checkoutSuccessUrl, getStripeBillingConfig, productionRequiresLiveStripeKey, stripeKeyMode } from "./stripe";

test("builds absolute URLs from the configured request origin", () => {
  const request = new Request("https://roleforge.example/api/billing/checkout");

  assert.equal(absoluteUrl(request, "/settings#billing"), "https://roleforge.example/settings#billing");
});

test("keeps Stripe checkout session template unescaped in success URL", () => {
  const request = new Request("https://roleforge.example/api/billing/checkout");

  assert.equal(
    checkoutSuccessUrl(request),
    `https://roleforge.example/settings?billing=checkout-success&session_id=${CHECKOUT_SESSION_ID_TEMPLATE}`,
  );
});

test("detects Stripe secret key mode for production billing safety", () => {
  assert.equal(stripeKeyMode("sk_live_123"), "live");
  assert.equal(stripeKeyMode("sk_test_123"), "test");
  assert.equal(stripeKeyMode("rk_live_123"), "unknown");
  assert.equal(stripeKeyMode(""), "unknown");
});

test("keeps production checkout off when Stripe is still in test mode", () => {
  const original = {
    VERCEL_ENV: process.env.VERCEL_ENV,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_PREMIUM_MONTHLY_PRICE_ID: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
    STRIPE_PREMIUM_YEARLY_PRICE_ID: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID,
  };

  process.env.VERCEL_ENV = "production";
  process.env.NEXT_PUBLIC_SITE_URL = "https://roleforgeai.vercel.app";
  process.env.STRIPE_SECRET_KEY = "sk_test_123";
  process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID = "price_month";
  process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID = "price_year";

  try {
    assert.equal(productionRequiresLiveStripeKey(), true);
    assert.equal(getStripeBillingConfig().liveModeReady, false);
    assert.equal(getStripeBillingConfig().checkoutConfigured, false);

    process.env.STRIPE_SECRET_KEY = "sk_live_123";
    assert.equal(getStripeBillingConfig().liveModeReady, true);
    assert.equal(getStripeBillingConfig().checkoutConfigured, true);
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
});
