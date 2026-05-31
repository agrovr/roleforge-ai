import assert from "node:assert/strict";
import test from "node:test";

import { validatePromoCodeOptions } from "./create_live_promo_code.mjs";

test("promotion code creator requires a live Stripe key", () => {
  assert.equal(validatePromoCodeOptions({ secretKey: "sk_live_example" }), true);
  assert.throws(() => validatePromoCodeOptions({ secretKey: "sk_test_example" }), /live Stripe secret key/);
  assert.throws(() => validatePromoCodeOptions({ secretKey: "" }), /live Stripe secret key/);
});

test("promotion code creator validates redemption and expiry limits before network calls", () => {
  assert.throws(() => validatePromoCodeOptions({ secretKey: "sk_live_example", expiresHours: 0 }), /expiresHours/);
  assert.throws(() => validatePromoCodeOptions({ secretKey: "sk_live_example", maxRedemptions: 0 }), /maxRedemptions/);
});
