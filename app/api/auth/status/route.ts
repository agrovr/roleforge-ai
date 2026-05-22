import { NextResponse } from "next/server";

import { accountDisplayName } from "@/app/lib/accountUser";
import { reconcileUserSubscriptionEntitlement } from "@/app/lib/billing/entitlements";
import { FREE_ENTITLEMENT, loadAccountEntitlement } from "@/app/lib/entitlements";
import { getSupabaseConfig } from "@/app/lib/supabase/config";
import { createRoleForgeServerClient } from "@/app/lib/supabase/server";
import { loadAccountUsage } from "@/app/lib/usage";

export async function GET() {
  const config = getSupabaseConfig();

  if (!config.configured) {
    return NextResponse.json({
      configured: false,
      enabled: false,
      provider: "supabase",
      user: null,
      entitlement: FREE_ENTITLEMENT,
      next: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY before enabling account features.",
    });
  }

  const supabase = await createRoleForgeServerClient();
  const { data, error } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null }, error: null };
  const user = !error && data.user
    ? {
        id: data.user.id,
        email: data.user.email ?? "",
        name: accountDisplayName(data.user),
      }
    : null;

  if (user) {
    await reconcileUserSubscriptionEntitlement(user.id).catch(() => false);
  }

  const entitlement = user && supabase ? await loadAccountEntitlement(supabase, user.id) : FREE_ENTITLEMENT;
  const usage = user && supabase ? await loadAccountUsage(supabase, user.id, entitlement) : null;

  return NextResponse.json({
    configured: true,
    enabled: true,
    provider: "supabase",
    user,
    entitlement,
    usage,
    next: user
      ? "Saved projects sync to your account when a completed run is available."
      : "Use email or Google sign-in to sync completed runs to saved projects.",
  });
}
