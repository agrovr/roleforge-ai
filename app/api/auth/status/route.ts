import { NextResponse } from "next/server";

import { loadAccountProfile } from "@/app/lib/accountProfile";
import { accountAvatarUrl, accountDisplayName, accountReference } from "@/app/lib/accountUser";
import { billingReadiness } from "@/app/lib/billing/readiness";
import { getStripeBillingConfig } from "@/app/lib/billing/stripe";
import { FREE_ENTITLEMENT, loadAccountEntitlement } from "@/app/lib/entitlements";
import { isSupportAdminUser } from "@/app/lib/supportAdmin";
import { getSupabaseConfig } from "@/app/lib/supabase/config";
import { createRoleForgeServerClient } from "@/app/lib/supabase/server";
import { loadAccountUsage } from "@/app/lib/usage";

type CountResult = { count: number | null; error: unknown };

function privateJson(payload: unknown) {
  const response = NextResponse.json(payload);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function claimRecord(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function claimString(value: unknown) {
  return typeof value === "string" ? value : "";
}

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
    return privateJson({
      configured: false,
      enabled: false,
      provider: "supabase",
      user: null,
      entitlement: FREE_ENTITLEMENT,
      next: "Account sync is temporarily unavailable. Browser history still works.",
    });
  }

  const supabase = await createRoleForgeServerClient();
  const { data: claimsData, error } = supabase
    ? await supabase.auth.getClaims()
    : { data: { claims: null }, error: null };
  const claims = !error ? claimsData?.claims : null;
  const userId = claimString(claims?.sub);
  const userMetadata = claimRecord(claims?.user_metadata);
  const appMetadata = claimRecord(claims?.app_metadata);
  const identity = userId
    ? {
        email: claimString(claims?.email),
        user_metadata: {
          avatar_url: userMetadata.avatar_url,
          full_name: userMetadata.full_name,
          name: userMetadata.name,
          picture: userMetadata.picture,
        },
        app_metadata: {
          provider: appMetadata.provider,
          providers: appMetadata.providers,
        },
      }
    : null;
  const entitlementPromise = userId && supabase
    ? loadAccountEntitlement(supabase, userId)
    : Promise.resolve(FREE_ENTITLEMENT);
  const profilePromise = userId && supabase
    ? loadAccountProfile(supabase, userId).catch(() => null)
    : Promise.resolve(null);
  const usagePromise = entitlementPromise.then((entitlement) => userId && supabase
    ? loadAccountUsage(supabase, userId, entitlement).catch(() => null)
    : null);
  const accountSummaryPromise = userId && supabase
    ? Promise.all([
        countAccountRows(supabase, "resume_projects", userId).catch(() => null),
        countAccountRows(supabase, "support_requests", userId).catch(() => null),
      ]).then(([savedProjectCount, supportRequestCount]) => ({
        savedProjectCount,
        supportRequestCount,
      }))
    : Promise.resolve(null);
  const [profile, entitlement, usage, accountSummary] = await Promise.all([
    profilePromise,
    entitlementPromise,
    usagePromise,
    accountSummaryPromise,
  ]);
  const user = userId && identity
    ? {
        reference: accountReference(userId),
        email: identity.email,
        name: accountDisplayName(identity, profile?.displayName),
        imageUrl: accountAvatarUrl(identity),
      }
    : null;
  const billing = billingReadiness(getStripeBillingConfig(), {
    hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    billingStatus: entitlement.billingStatus,
  });

  return privateJson({
    configured: true,
    enabled: true,
    provider: "supabase",
    user,
    entitlement,
    usage,
    accountSummary,
    operations: {
      supportAdmin: Boolean(identity && isSupportAdminUser(identity)),
    },
    billing,
    next: user
      ? usage
        ? "Saved projects sync to your account when a completed run is available."
        : "Saved projects sync is active. Usage will refresh shortly."
      : "Use email or Google sign-in to sync completed runs to saved projects.",
  });
}
