import { NextResponse } from "next/server";

import { absoluteUrl, getStripeBillingConfig, getStripeClient } from "@/app/lib/billing/stripe";
import { createRoleForgeServerClient } from "@/app/lib/supabase/server";
import { createRoleForgeServiceClient } from "@/app/lib/supabase/service";

export const runtime = "nodejs";

type EntitlementBillingRow = {
  stripe_customer_id: string | null;
};

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const billingConfig = getStripeBillingConfig();
  const supabase = await createRoleForgeServerClient();
  const serviceSupabase = createRoleForgeServiceClient();

  if (!stripe || !billingConfig.secretKey || !serviceSupabase) {
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

  const { data: entitlement, error: entitlementError } = await serviceSupabase
    .from("account_entitlements")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (entitlementError) {
    console.error("Billing portal entitlement lookup failed", entitlementError);
    return NextResponse.redirect(absoluteUrl(request, "/settings?billing=temporarily-unavailable#billing"), 303);
  }

  const customerId = (entitlement as EntitlementBillingRow | null)?.stripe_customer_id ?? "";

  if (!customerId) {
    return NextResponse.redirect(absoluteUrl(request, "/settings?billing=no-customer#billing"), 303);
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: absoluteUrl(request, "/settings?billing=portal-return#billing"),
  });

  return NextResponse.redirect(portalSession.url, 303);
}
