import { NextResponse } from "next/server";

import { loadBillingPortalCustomer } from "@/app/lib/billing/customer";
import { absoluteUrl, getStripeBillingConfig, getStripeClient } from "@/app/lib/billing/stripe";
import { createRoleForgeServerClient } from "@/app/lib/supabase/server";
import { createRoleForgeServiceClient } from "@/app/lib/supabase/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createRoleForgeServerClient();

  if (!supabase) {
    return NextResponse.redirect(absoluteUrl(request, "/login?next=/settings&account=signin-required"), 303);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return NextResponse.redirect(
    absoluteUrl(request, user ? "/settings#billing" : "/login?next=/settings&account=signin-required"),
    303,
  );
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

  if (!stripe || !billingConfig.secretKey || !billingConfig.liveModeReady || !serviceSupabase) {
    return NextResponse.redirect(absoluteUrl(request, "/settings?billing=temporarily-unavailable#billing"), 303);
  }

  const portalCustomer = await loadBillingPortalCustomer(serviceSupabase, stripe, user);

  if (portalCustomer.status === "temporarily-unavailable") {
    console.error(`Billing portal ${portalCustomer.reason}`, portalCustomer.error);
    return NextResponse.redirect(absoluteUrl(request, "/settings?billing=temporarily-unavailable#billing"), 303);
  }

  if (portalCustomer.status === "no-customer") {
    return NextResponse.redirect(absoluteUrl(request, "/settings?billing=no-customer#billing"), 303);
  }

  let portalSession;

  try {
    portalSession = await stripe.billingPortal.sessions.create({
      customer: portalCustomer.customerId,
      return_url: absoluteUrl(request, "/settings?billing=portal-return#billing"),
    });
  } catch (error) {
    console.error("Billing portal session creation failed", error);
    return NextResponse.redirect(absoluteUrl(request, "/settings?billing=temporarily-unavailable#billing"), 303);
  }

  return NextResponse.redirect(portalSession.url, 303);
}
