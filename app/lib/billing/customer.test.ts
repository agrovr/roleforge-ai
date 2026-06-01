import assert from "node:assert/strict";
import test from "node:test";

import type Stripe from "stripe";

import { FREE_FEATURES, PREMIUM_FEATURES } from "./entitlements";
import { loadBillingPortalCustomer, prepareCheckoutCustomer } from "./customer";

type FakeServiceOptions = {
  lookup: { data: unknown; error: unknown };
  upsert?: { error: unknown };
};

function fakeService({ lookup, upsert = { error: null } }: FakeServiceOptions) {
  const calls: Array<{ type: string; payload?: unknown; options?: unknown }> = [];
  const query = {
    select(columns: string) {
      calls.push({ type: "select", payload: columns });
      return query;
    },
    eq(column: string, value: string) {
      calls.push({ type: "eq", payload: { column, value } });
      return query;
    },
    async maybeSingle() {
      calls.push({ type: "maybeSingle" });
      return lookup;
    },
    async upsert(payload: unknown, options: unknown) {
      calls.push({ type: "upsert", payload, options });
      return upsert;
    },
  };

  return {
    calls,
    client: {
      from(table: string) {
        calls.push({ type: "from", payload: table });
        return query;
      },
    },
  };
}

function fakeStripe(customerId = "cus_new", options: { retrieve?: "active" | "deleted" | "missing" | "error" } = {}) {
  const createCalls: unknown[] = [];
  const retrieveCalls: string[] = [];
  const stripe = {
    customers: {
      async retrieve(id: string) {
        retrieveCalls.push(id);
        if (options.retrieve === "missing") {
          throw Object.assign(new Error("No such customer"), { code: "resource_missing" });
        }
        if (options.retrieve === "error") {
          throw new Error("Stripe unavailable");
        }
        if (options.retrieve === "deleted") {
          return { id, deleted: true };
        }
        return { id, deleted: false };
      },
      async create(payload: unknown) {
        createCalls.push(payload);
        return { id: customerId };
      },
    },
  } as unknown as Stripe;

  return { stripe, createCalls, retrieveCalls };
}

const user = {
  id: "user_123",
  email: "test@example.com",
  user_metadata: { name: "Test User" },
};

test("reuses an existing Stripe customer for checkout", async () => {
  const service = fakeService({
    lookup: {
      data: { stripe_customer_id: "cus_existing", plan: "free", billing_status: "none" },
      error: null,
    },
  });
  const stripe = fakeStripe();

  const result = await prepareCheckoutCustomer(service.client as never, stripe.stripe, user as never);

  assert.deepEqual(result, { status: "ready", customerId: "cus_existing" });
  assert.deepEqual(stripe.retrieveCalls, ["cus_existing"]);
  assert.equal(stripe.createCalls.length, 0);
  assert.equal(service.calls.some((call) => call.type === "upsert"), false);
});

test("replaces stale Stripe customers before checkout", async () => {
  const service = fakeService({
    lookup: {
      data: { stripe_customer_id: "cus_deleted", plan: "free", billing_status: "canceled" },
      error: null,
    },
  });
  const stripe = fakeStripe("cus_replacement", { retrieve: "deleted" });

  const result = await prepareCheckoutCustomer(service.client as never, stripe.stripe, user as never);

  assert.deepEqual(stripe.retrieveCalls, ["cus_deleted"]);
  assert.equal(stripe.createCalls.length, 1);
  assert.deepEqual(result, { status: "ready", customerId: "cus_replacement" });
  const upsertCall = service.calls.find((call) => call.type === "upsert");
  const upsertPayload = upsertCall?.payload as Record<string, unknown>;
  assert.equal(upsertPayload.stripe_customer_id, "cus_replacement");
  assert.equal(upsertPayload.billing_status, "none");
  assert.equal(upsertPayload.stripe_subscription_id, null);
});

test("does not start checkout when premium is already active", async () => {
  const service = fakeService({
    lookup: {
      data: {
        stripe_customer_id: "cus_existing",
        plan: "premium",
        billing_status: "active",
        features: PREMIUM_FEATURES,
      },
      error: null,
    },
  });

  const result = await prepareCheckoutCustomer(service.client as never, fakeStripe().stripe, user as never);

  assert.deepEqual(result, { status: "already-premium" });
});

test("fails closed when checkout entitlement lookup fails", async () => {
  const lookupError = new Error("supabase unavailable");
  const service = fakeService({ lookup: { data: null, error: lookupError } });

  const result = await prepareCheckoutCustomer(service.client as never, fakeStripe().stripe, user as never);

  assert.equal(result.status, "temporarily-unavailable");
  if (result.status === "temporarily-unavailable") {
    assert.equal(result.reason, "entitlement_lookup_failed");
    assert.equal(result.error, lookupError);
  }
});

test("fails closed when a newly-created customer cannot be saved", async () => {
  const saveError = new Error("write failed");
  const service = fakeService({
    lookup: { data: null, error: null },
    upsert: { error: saveError },
  });
  const stripe = fakeStripe("cus_created");

  const result = await prepareCheckoutCustomer(service.client as never, stripe.stripe, user as never);

  assert.equal(stripe.createCalls.length, 1);
  assert.equal(result.status, "temporarily-unavailable");
  if (result.status === "temporarily-unavailable") {
    assert.equal(result.reason, "customer_record_save_failed");
    assert.equal(result.error, saveError);
  }
  const upsertCall = service.calls.find((call) => call.type === "upsert");
  const upsertPayload = upsertCall?.payload as Record<string, unknown>;
  assert.deepEqual({
    ...upsertPayload,
    updated_at: "normalized",
  }, {
    user_id: "user_123",
    plan: "free",
    billing_status: "none",
    stripe_customer_id: "cus_created",
    stripe_subscription_id: null,
    current_period_end: null,
    cancel_at_period_end: false,
    cancel_at: null,
    canceled_at: null,
    features: FREE_FEATURES,
    updated_at: "normalized",
  });
  assert.match(String(upsertPayload.updated_at), /^[0-9]{4}-[0-9]{2}-[0-9]{2}T/);
});

test("loads portal customer ids and fails closed on lookup errors", async () => {
  const readyService = fakeService({
    lookup: { data: { stripe_customer_id: "cus_portal" }, error: null },
  });
  const readyStripe = fakeStripe();
  assert.deepEqual(await loadBillingPortalCustomer(readyService.client as never, readyStripe.stripe, user as never), {
    status: "ready",
    customerId: "cus_portal",
  });
  assert.deepEqual(readyStripe.retrieveCalls, ["cus_portal"]);

  const missingService = fakeService({
    lookup: { data: { stripe_customer_id: null }, error: null },
  });
  const missingStripe = fakeStripe("cus_portal_created");
  assert.deepEqual(await loadBillingPortalCustomer(missingService.client as never, missingStripe.stripe, user as never), {
    status: "ready",
    customerId: "cus_portal_created",
  });
  assert.equal(missingStripe.createCalls.length, 1);

  const lookupError = new Error("read failed");
  const errorService = fakeService({ lookup: { data: null, error: lookupError } });
  const result = await loadBillingPortalCustomer(errorService.client as never, fakeStripe().stripe, user as never);
  assert.equal(result.status, "temporarily-unavailable");
  if (result.status === "temporarily-unavailable") {
    assert.equal(result.reason, "entitlement_lookup_failed");
    assert.equal(result.error, lookupError);
  }
});

test("replaces stale Stripe customers before opening the billing portal", async () => {
  const service = fakeService({
    lookup: { data: { stripe_customer_id: "cus_stale" }, error: null },
  });
  const stripe = fakeStripe("cus_new_portal", { retrieve: "missing" });

  const result = await loadBillingPortalCustomer(service.client as never, stripe.stripe, user as never);

  assert.deepEqual(stripe.retrieveCalls, ["cus_stale"]);
  assert.equal(stripe.createCalls.length, 1);
  assert.deepEqual(result, { status: "ready", customerId: "cus_new_portal" });
});
