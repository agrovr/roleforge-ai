import type Stripe from "stripe";

import { createRoleForgeServiceClient } from "../supabase/service";
import { getStripeClient } from "./stripe";

export type BillingStatus =
  | "none"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

export type EntitlementPatch = {
  userId: string;
  plan: "free" | "premium";
  billingStatus: BillingStatus;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  cancelAt?: string | null;
  canceledAt?: string | null;
};

type EntitlementSubscriptionRow = {
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

const PREMIUM_FEATURES = {
  export_pdf: true,
  export_docx: true,
  export_txt: true,
  project_storage: true,
  monthly_run_limit: null,
};

const FREE_FEATURES = {
  export_pdf: true,
  export_docx: false,
  export_txt: false,
  project_storage: true,
  monthly_run_limit: 5,
};

export function normalizeBillingStatus(status?: Stripe.Subscription.Status | null): BillingStatus {
  if (
    status === "active" ||
    status === "trialing" ||
    status === "past_due" ||
    status === "canceled" ||
    status === "incomplete" ||
    status === "incomplete_expired" ||
    status === "unpaid" ||
    status === "paused"
  ) {
    return status;
  }

  return "none";
}

function currentPeriodEnd(subscription: Stripe.Subscription) {
  const legacyPeriodEnd = (subscription as unknown as { current_period_end?: number }).current_period_end;
  const itemPeriodEnd = subscription.items.data[0]?.current_period_end;
  const periodEnd = legacyPeriodEnd ?? itemPeriodEnd ?? null;

  return periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
}

function timestampToIso(timestamp?: number | null) {
  return timestamp ? new Date(timestamp * 1000).toISOString() : null;
}

export async function upsertEntitlement(patch: EntitlementPatch) {
  const supabase = createRoleForgeServiceClient();

  if (!supabase) {
    throw new Error("Supabase service role is not configured for billing entitlement updates.");
  }

  const premiumActive = patch.plan === "premium" && ["active", "trialing"].includes(patch.billingStatus);

  const { error } = await supabase
    .from("account_entitlements")
    .upsert({
      user_id: patch.userId,
      plan: premiumActive ? "premium" : "free",
      billing_status: patch.billingStatus,
      stripe_customer_id: patch.stripeCustomerId ?? null,
      stripe_subscription_id: patch.stripeSubscriptionId ?? null,
      current_period_end: patch.currentPeriodEnd ?? null,
      cancel_at_period_end: patch.cancelAtPeriodEnd ?? false,
      cancel_at: patch.cancelAt ?? null,
      canceled_at: patch.canceledAt ?? null,
      features: premiumActive ? PREMIUM_FEATURES : FREE_FEATURES,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (error) {
    throw new Error(error.message);
  }
}

export function entitlementPatchFromSubscription(subscription: Stripe.Subscription): EntitlementPatch {
  const supabaseUserId = subscription.metadata.supabase_user_id;
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  if (!supabaseUserId) {
    throw new Error(`Subscription ${subscription.id} is missing supabase_user_id metadata.`);
  }

  const billingStatus = normalizeBillingStatus(subscription.status);

  return {
    userId: supabaseUserId,
    plan: ["active", "trialing"].includes(billingStatus) ? "premium" : "free",
    billingStatus,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    currentPeriodEnd: currentPeriodEnd(subscription),
    cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    cancelAt: timestampToIso(subscription.cancel_at),
    canceledAt: timestampToIso(subscription.canceled_at),
  };
}

export async function syncSubscriptionEntitlement(subscription: Stripe.Subscription) {
  await upsertEntitlement(entitlementPatchFromSubscription(subscription));
}

export async function reconcileUserSubscriptionEntitlement(userId: string) {
  const supabase = createRoleForgeServiceClient();
  const stripe = getStripeClient();

  if (!supabase || !stripe) {
    return false;
  }

  const { data, error } = await supabase
    .from("account_entitlements")
    .select("stripe_customer_id, stripe_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const subscriptionId = (data as EntitlementSubscriptionRow | null)?.stripe_subscription_id;
  const customerId = (data as EntitlementSubscriptionRow | null)?.stripe_customer_id;

  if (!subscriptionId) {
    return false;
  }

  let subscription: Stripe.Subscription;

  try {
    subscription = await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    const stripeError = error as { code?: string };

    if (stripeError.code === "resource_missing") {
      await upsertEntitlement({
        userId,
        plan: "free",
        billingStatus: "canceled",
        stripeCustomerId: customerId,
        stripeSubscriptionId: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        cancelAt: null,
        canceledAt: new Date().toISOString(),
      });
      return true;
    }

    throw error;
  }

  await syncSubscriptionEntitlement(subscription);
  return true;
}
