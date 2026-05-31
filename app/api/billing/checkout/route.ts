import { NextResponse } from "next/server";

import { prepareCheckoutCustomer } from "@/app/lib/billing/customer";
import { billingReadiness } from "@/app/lib/billing/readiness";
import { absoluteUrl, checkoutSuccessUrl, getStripeBillingConfig, getStripeClient, priceIdForInterval, type BillingInterval } from "@/app/lib/billing/stripe";
import { createRoleForgeServerClient } from "@/app/lib/supabase/server";
import { createRoleForgeServiceClient } from "@/app/lib/supabase/service";

export const runtime = "nodejs";

function normalizeInterval(value: FormDataEntryValue | null): BillingInterval {
  return value === "year" ? "year" : "month";
}

export async function POST(request: Request) {
  const supabase = await createRoleForgeServerClient();

  if (!supabase) {
    return NextResponse.redirect(absoluteUrl(request, "/login?next=/settings&account=signin-required"), 303);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(absoluteUrl(request, "/login?next=/settings&account=signin-required"), 303);
  }

  const stripe = getStripeClient();
  const billingConfig = getStripeBillingConfig();
  const serviceSupabase = createRoleForgeServiceClient();
  const billingReady = billingReadiness(billingConfig, {
    hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    billingStatus: "none",
  });

  if (!stripe || !billingReady.checkoutReady || !serviceSupabase) {
    return NextResponse.json({ error: "Billing is temporarily unavailable. Try again shortly." }, { status: 503 });
  }

  const formData = await request.formData();
  const interval = normalizeInterval(formData.get("interval"));
  const priceId = priceIdForInterval(interval);

  const checkoutCustomer = await prepareCheckoutCustomer(serviceSupabase, stripe, user);

  if (checkoutCustomer.status === "temporarily-unavailable") {
    console.error(`Checkout ${checkoutCustomer.reason}`, checkoutCustomer.error);
    return NextResponse.redirect(absoluteUrl(request, "/settings?billing=temporarily-unavailable#billing"), 303);
  }

  if (checkoutCustomer.status === "already-premium") {
    return NextResponse.redirect(absoluteUrl(request, "/settings?billing=already-premium#billing"), 303);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: checkoutCustomer.customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: checkoutSuccessUrl(request),
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
