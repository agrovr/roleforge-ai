import assert from "node:assert/strict";
import test from "node:test";

import { billingStatusDetail, billingStatusLabel, billingStatusTone } from "./display";
import type { BillingStatus } from "../entitlements";

const expectedLabels: Record<BillingStatus, string> = {
  none: "No subscription",
  trialing: "Trial active",
  active: "Active",
  past_due: "Payment issue",
  canceled: "Canceled",
  incomplete: "Payment incomplete",
  incomplete_expired: "Checkout expired",
  unpaid: "Unpaid",
  paused: "Paused",
};

test("formats billing statuses for customer-facing settings UI", () => {
  for (const [status, label] of Object.entries(expectedLabels) as Array<[BillingStatus, string]>) {
    assert.equal(billingStatusLabel(status), label);
  }
});

test("provides helpful billing status details without raw provider language", () => {
  assert.match(billingStatusDetail("none"), /Premium checkout/);
  assert.match(billingStatusDetail("past_due"), /Update billing/);
  assert.match(billingStatusDetail("incomplete_expired"), /expired/);
});

test("assigns billing status tones for settings pills", () => {
  assert.equal(billingStatusTone("active"), "good");
  assert.equal(billingStatusTone("trialing"), "good");
  assert.equal(billingStatusTone("past_due"), "warn");
  assert.equal(billingStatusTone("incomplete"), "warn");
  assert.equal(billingStatusTone("unpaid"), "warn");
  assert.equal(billingStatusTone("paused"), "warn");
  assert.equal(billingStatusTone("none"), "muted");
  assert.equal(billingStatusTone("canceled"), "muted");
  assert.equal(billingStatusTone("incomplete_expired"), "muted");
});
