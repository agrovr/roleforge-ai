import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { syncSubscriptionEntitlement, upsertEntitlement } from "@/app/lib/billing/entitlements";
import { getStripeBillingConfig, getStripeClient } from "@/app/lib/billing/stripe";

export const runtime = "nodejs";

async function retrieveSubscription(subscriptionId: string) {
  const stripe = getStripeClient();

  if (!stripe) {
    throw new Error("Stripe is not configured.");
  }

  return stripe.subscriptions.retrieve(subscriptionId);
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const stripe = getStripeClient();
  const { webhookSecret } = getStripeBillingConfig();

  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  }

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Stripe webhook signature.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

    if (subscriptionId) {
      await syncSubscriptionEntitlement(await retrieveSubscription(subscriptionId));
    }
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    await syncSubscriptionEntitlement(event.data.object as Stripe.Subscription);
  }

  if (event.type === "customer.deleted") {
    const customer = event.data.object as Stripe.Customer;
    const supabaseUserId = customer.metadata.supabase_user_id;

    if (supabaseUserId) {
      await upsertEntitlement({
        userId: supabaseUserId,
        plan: "free",
        billingStatus: "canceled",
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        cancelAt: null,
        canceledAt: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json({ received: true });
}
