import type { SupabaseClient } from "@supabase/supabase-js";

import type { AccountEntitlement } from "./entitlements";

export type AccountUsage = {
  currentPeriodStart: string;
  currentPeriodEnd: string;
  monthlyRuns: number;
  monthlyRunLimit: number | null;
  remainingRuns: number | null;
  runLimited: boolean;
};

type CountResult = { count: number | null; error: unknown };

export function currentUsagePeriod(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  return {
    start,
    end,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

export async function loadAccountUsage(
  client: SupabaseClient,
  userId: string,
  entitlement: AccountEntitlement,
): Promise<AccountUsage> {
  const period = currentUsagePeriod();
  const { count, error } = await client
    .from("tailor_runs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", period.startIso)
    .lt("created_at", period.endIso) as CountResult;
  const monthlyRuns = error ? 0 : count ?? 0;
  const monthlyRunLimit = entitlement.monthlyRunLimit;
  const remainingRuns = typeof monthlyRunLimit === "number" ? Math.max(0, monthlyRunLimit - monthlyRuns) : null;

  return {
    currentPeriodStart: period.startIso,
    currentPeriodEnd: period.endIso,
    monthlyRuns,
    monthlyRunLimit,
    remainingRuns,
    runLimited: typeof monthlyRunLimit === "number" && monthlyRuns >= monthlyRunLimit,
  };
}
