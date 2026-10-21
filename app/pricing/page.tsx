import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { accountIdentityFromClaims } from "../lib/accountUser";
import { billingReadiness, hasActivePremiumAccess } from "../lib/billing/readiness";
import { getStripeBillingConfig, PREMIUM_PRICE } from "../lib/billing/stripe";
import { FREE_ENTITLEMENT, loadAccountEntitlement } from "../lib/entitlements";
import { createRoleForgeServerClient } from "../lib/supabase/server";
import { PricingPlans } from "./PricingPlans";
import "./pricing.css";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Compare RoleForge's free PDF workflow with Premium runs and export formats.",
  alternates: { canonical: "/pricing" },
  openGraph: { title: "RoleForge AI Pricing", url: "/pricing" },
};

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ interval?: string }> }) {
  const params = await searchParams;
  const supabase = await createRoleForgeServerClient();
  const auth = supabase ? await supabase.auth.getClaims() : null;
  const user = accountIdentityFromClaims(auth?.data?.claims);
  const entitlement = user && supabase ? await loadAccountEntitlement(supabase, user.id) : FREE_ENTITLEMENT;
  const premiumActive = hasActivePremiumAccess(entitlement.plan, entitlement.billingStatus);
  const billing = billingReadiness(getStripeBillingConfig(), {
    hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    billingStatus: entitlement.billingStatus,
  });
  const studioHref = user ? "/app" : "/login?next=/app";
  return <main className="pricing-page">
    <a className="site-skip-link" href="#plans">Skip to plans</a>
    <div className="pricing-page-content">
      <SiteHeader active="pricing" studioHref={studioHref} signedIn={Boolean(user)}>
        <Link className="btn btn-soft pricing-header-action" href={user ? "/settings#billing" : "/login?next=%2Fpricing"} prefetch={false}>{user ? "My account" : "Sign in"}</Link>
        <Link className="btn btn-brand pricing-header-action" href={studioHref} prefetch={false}>Open studio</Link>
      </SiteHeader>
      <PricingPlans prices={PREMIUM_PRICE} freeRunLimit={FREE_ENTITLEMENT.monthlyRunLimit} signedIn={Boolean(user)} premiumActive={premiumActive} premiumEnding={premiumActive && entitlement.cancelAtPeriodEnd} checkoutReady={billing.checkoutReady} initialInterval={params.interval === "year" ? "year" : "month"} studioHref={studioHref} />
    </div>
    <SiteFooter active="/pricing" />
  </main>;
}
