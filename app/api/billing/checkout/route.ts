import { NextResponse } from "next/server";

import { FREE_FEATURES } from "@/app/lib/billing/entitlements";
import { absoluteUrl, getStripeBillingConfig, getStripeClient, priceIdForInterval, type BillingInterval } from "@/app/lib/billing/stripe";
import { createRoleForgeServerClient } from "@/app/lib/supabase/server";
import { createRoleForgeServiceClient } from "@/app/lib/supabase/service";

export const runtime = "nodejs";

type EntitlementBillingRow = {
  stripe_customer_id: string | null;
};

function normalizeInterval(value: FormDataEntryValue | null): BillingInterval {
  return value === "year" ? "year" : "month";
}

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const billingConfig = getStripeBillingConfig();
  const supabase = await createRoleForgeServerClient();
  const serviceSupabase = createRoleForgeServiceClient();

  if (!stripe || !billingConfig.checkoutConfigured || !serviceSupabase) {
    return NextResponse.json({ error: "Billing is not configured yet." }, { status: 503 });
  }

  if (!supabase) {
    return NextResponse.redirect(absoluteUrl(request, "/login?next=/settings&account=signin-required"), 303);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(absoluteUrl(request, "/login?next=/settings&account=signin-required"), 303);
  }

  const formData = await request.formData();
  const interval = normalizeInterval(formData.get("interval"));
  const priceId = priceIdForInterval(interval);

  const { data: entitlement } = await serviceSupabase
    .from("account_entitlements")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let customerId = (entitlement as EntitlementBillingRow | null)?.stripe_customer_id ?? "";

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: typeof user.user_metadata?.name === "string" ? user.user_metadata.name : undefined,
      metadata: {
        supabase_user_id: user.id,
      },
    });

    customerId = customer.id;

    await serviceSupabase
      .from("account_entitlements")
      .upsert({
        user_id: user.id,
        plan: "free",
        billing_status: "none",
        stripe_customer_id: customerId,
        features: FREE_FEATURES,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: absoluteUrl(request, "/settings?billing=checkout-success"),
    cancel_url: absoluteUrl(request, "/settings?billing=checkout-canceled#billing"),
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
      },
    },
    metadata: {
      supabase_user_id: user.id,
      plan: "premium",
      interval,
    },
  });

  if (!session.url) {
    return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 502 });
  }

  return NextResponse.redirect(session.url, 303);
}
