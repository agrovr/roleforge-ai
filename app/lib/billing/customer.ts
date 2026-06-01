import type { User } from "@supabase/supabase-js";
import type Stripe from "stripe";

import type { createRoleForgeServiceClient } from "@/app/lib/supabase/service";

import { FREE_FEATURES } from "./entitlements";
import { hasActivePremiumAccess } from "./readiness";

type BillingServiceClient = NonNullable<ReturnType<typeof createRoleForgeServiceClient>>;

type EntitlementBillingRow = {
  stripe_customer_id: string | null;
  plan: string | null;
  billing_status: string | null;
};

type PortalBillingRow = {
  stripe_customer_id: string | null;
};

type BillingFailureReason = "entitlement_lookup_failed" | "customer_record_save_failed";

type CheckoutCustomerResult =
  | { status: "ready"; customerId: string }
  | { status: "already-premium" }
  | { status: "temporarily-unavailable"; reason: BillingFailureReason; error: unknown };

type PortalCustomerResult =
  | { status: "ready"; customerId: string }
  | { status: "no-customer" }
  | { status: "temporarily-unavailable"; reason: BillingFailureReason; error: unknown };

function stripeCustomerActive(customer: Stripe.Customer | Stripe.DeletedCustomer) {
  return !("deleted" in customer && customer.deleted);
}

function missingStripeCustomer(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "resource_missing";
}

async function verifiedCustomerId(stripe: Stripe, customerId: string) {
  if (!customerId) return "";

  try {
    const customer = await stripe.customers.retrieve(customerId);
    return stripeCustomerActive(customer) ? customer.id : "";
  } catch (error) {
    if (missingStripeCustomer(error)) return "";
    throw error;
  }
}

async function createAndSaveCustomer(
  serviceSupabase: BillingServiceClient,
  stripe: Stripe,
  user: Pick<User, "id" | "email" | "user_metadata">,
) {
  const customer = await stripe.customers.create({
    email: user.email ?? undefined,
    name: typeof user.user_metadata?.name === "string" ? user.user_metadata.name : undefined,
    metadata: {
      supabase_user_id: user.id,
    },
  });

  const { error: customerRecordError } = await serviceSupabase
    .from("account_entitlements")
    .upsert({
      user_id: user.id,
      plan: "free",
      billing_status: "none",
      stripe_customer_id: customer.id,
      stripe_subscription_id: null,
      current_period_end: null,
      cancel_at_period_end: false,
      cancel_at: null,
      canceled_at: null,
      features: FREE_FEATURES,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (customerRecordError) {
    return { status: "temporarily-unavailable" as const, reason: "customer_record_save_failed" as const, error: customerRecordError };
  }

  return { status: "ready" as const, customerId: customer.id };
}

export async function prepareCheckoutCustomer(
  serviceSupabase: BillingServiceClient,
  stripe: Stripe,
  user: User,
): Promise<CheckoutCustomerResult> {
  const { data: entitlement, error: entitlementError } = await serviceSupabase
    .from("account_entitlements")
    .select("stripe_customer_id, plan, billing_status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (entitlementError) {
    return { status: "temporarily-unavailable", reason: "entitlement_lookup_failed", error: entitlementError };
  }

  const entitlementRow = entitlement as EntitlementBillingRow | null;
  if (hasActivePremiumAccess(entitlementRow?.plan, entitlementRow?.billing_status)) {
    return { status: "already-premium" };
  }

  const existingCustomerId = entitlementRow?.stripe_customer_id ?? "";
  try {
    const activeCustomerId = await verifiedCustomerId(stripe, existingCustomerId);
    if (activeCustomerId) {
      return { status: "ready", customerId: activeCustomerId };
    }
  } catch (error) {
    return { status: "temporarily-unavailable", reason: "entitlement_lookup_failed", error };
  }

  return createAndSaveCustomer(serviceSupabase, stripe, user);
}

export async function loadBillingPortalCustomer(
  serviceSupabase: BillingServiceClient,
  stripe: Stripe,
  user: Pick<User, "id" | "email" | "user_metadata">,
): Promise<PortalCustomerResult> {
  const { data: entitlement, error: entitlementError } = await serviceSupabase
    .from("account_entitlements")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (entitlementError) {
    return { status: "temporarily-unavailable", reason: "entitlement_lookup_failed", error: entitlementError };
  }

  const customerId = (entitlement as PortalBillingRow | null)?.stripe_customer_id ?? "";
  try {
    const activeCustomerId = await verifiedCustomerId(stripe, customerId);
    if (activeCustomerId) {
      return { status: "ready", customerId: activeCustomerId };
    }
  } catch (error) {
    return { status: "temporarily-unavailable", reason: "entitlement_lookup_failed", error };
  }

  if (!customerId) {
    return createAndSaveCustomer(serviceSupabase, stripe, user);
  }

  return createAndSaveCustomer(serviceSupabase, stripe, user);
}
