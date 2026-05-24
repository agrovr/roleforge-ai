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

export function runWord(count: number | null) {
  return count === 1 ? "run" : "runs";
}

export function monthlyRunAllowanceLabel(monthlyRunLimit: number | null) {
  if (monthlyRunLimit === null) return "Unlimited runs";
  return `${monthlyRunLimit} ${runWord(monthlyRunLimit)} each month`;
}

export function monthlyRunAllowanceSentence(monthlyRunLimit: number | null) {
  if (monthlyRunLimit === null) return "Premium does not count completed runs against a monthly cap.";
  return `Free includes ${monthlyRunLimit} completed tailoring ${runWord(monthlyRunLimit)} each month. Upgrade when you need more room.`;
}

export function usageProgressPercent(usage: Pick<AccountUsage, "monthlyRuns" | "monthlyRunLimit" | "runLimited">) {
  if (usage.monthlyRunLimit === null) return 100;
  if (usage.monthlyRunLimit <= 0) return usage.runLimited ? 100 : 0;
  return Math.min(100, (usage.monthlyRuns / usage.monthlyRunLimit) * 100);
}

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
