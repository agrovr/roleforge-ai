import assert from "node:assert/strict";
import test from "node:test";

import { CHECKOUT_SESSION_ID_TEMPLATE, absoluteUrl, checkoutSuccessUrl } from "./stripe";

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
