import { NextResponse } from "next/server";

import { loadAccountProfile } from "@/app/lib/accountProfile";
import { accountAvatarUrl, accountDisplayName, accountReference } from "@/app/lib/accountUser";
import { reconcileUserSubscriptionEntitlement } from "@/app/lib/billing/entitlements";
import { billingReadiness } from "@/app/lib/billing/readiness";
import { getStripeBillingConfig } from "@/app/lib/billing/stripe";
import { FREE_ENTITLEMENT, loadAccountEntitlement } from "@/app/lib/entitlements";
import { getSupabaseConfig } from "@/app/lib/supabase/config";
import { createRoleForgeServerClient } from "@/app/lib/supabase/server";
import { loadAccountUsage } from "@/app/lib/usage";

type CountResult = { count: number | null; error: unknown };

async function countAccountRows(
  supabase: NonNullable<Awaited<ReturnType<typeof createRoleForgeServerClient>>>,
  table: "resume_projects" | "support_requests",
  userId: string,
) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId) as CountResult;

  return error ? null : count ?? 0;
}

export async function GET() {
  const config = getSupabaseConfig();

  if (!config.configured) {
    return NextResponse.json({
      configured: false,
      enabled: false,
      provider: "supabase",
      user: null,
      entitlement: FREE_ENTITLEMENT,
      next: "Account sync is temporarily unavailable. Browser history still works.",
    });
  }

  const supabase = await createRoleForgeServerClient();
  const { data, error } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null }, error: null };
  const profile = !error && data.user && supabase
    ? await loadAccountProfile(supabase, data.user.id).catch(() => null)
    : null;
  const userId = !error && data.user ? data.user.id : "";
  const user = userId && data.user
    ? {
        reference: accountReference(userId),
        email: data.user.email ?? "",
        name: accountDisplayName(data.user, profile?.displayName),
        imageUrl: accountAvatarUrl(data.user),
      }
    : null;

  if (userId) {
    await reconcileUserSubscriptionEntitlement(userId).catch(() => false);
  }

  const entitlement = userId && supabase ? await loadAccountEntitlement(supabase, userId) : FREE_ENTITLEMENT;
  const usage = userId && supabase
    ? await loadAccountUsage(supabase, userId, entitlement).catch(() => null)
    : null;
  const accountSummary = userId && supabase
    ? await Promise.all([
        countAccountRows(supabase, "resume_projects", userId).catch(() => null),
        countAccountRows(supabase, "support_requests", userId).catch(() => null),
      ]).then(([savedProjectCount, supportRequestCount]) => ({
        savedProjectCount,
        supportRequestCount,
      }))
    : null;
  const billing = billingReadiness(getStripeBillingConfig(), {
    hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    billingStatus: entitlement.billingStatus,
  });

  return NextResponse.json({
    configured: true,
    enabled: true,
    provider: "supabase",
    user,
    entitlement,
    usage,
    accountSummary,
    billing,
    next: user
      ? usage
        ? "Saved projects sync to your account when a completed run is available."
        : "Saved projects sync is active. Usage will refresh shortly."
      : "Use email or Google sign-in to sync completed runs to saved projects.",
  });
}
