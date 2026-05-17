import type { SupabaseClient } from "@supabase/supabase-js";

export type AccountPlan = "free" | "premium";
export type BillingStatus = "none" | "trialing" | "active" | "past_due" | "canceled" | "incomplete";

export type AccountEntitlement = {
  plan: AccountPlan;
  billingStatus: BillingStatus;
  exportFormats: {
    pdf: boolean;
    docx: boolean;
    txt: boolean;
  };
  projectStorage: boolean;
  currentPeriodEnd: string | null;
};

type EntitlementRow = {
  plan: AccountPlan | null;
  billing_status: BillingStatus | null;
  current_period_end: string | null;
  features: Record<string, unknown> | null;
};

export const FREE_ENTITLEMENT: AccountEntitlement = {
  plan: "free",
  billingStatus: "none",
  exportFormats: {
    pdf: true,
    docx: false,
    txt: false,
  },
  projectStorage: true,
  currentPeriodEnd: null,
};

function booleanFeature(features: Record<string, unknown> | null, key: string, fallback: boolean) {
  const value = features?.[key];
  return typeof value === "boolean" ? value : fallback;
}

export function entitlementFromRow(row?: EntitlementRow | null): AccountEntitlement {
  if (!row) return FREE_ENTITLEMENT;

  const plan = row.plan === "premium" ? "premium" : "free";
  const premiumActive = plan === "premium" && ["active", "trialing"].includes(row.billing_status ?? "");
  const features = row.features ?? {};

  return {
    plan,
    billingStatus: row.billing_status ?? "none",
    exportFormats: {
      pdf: booleanFeature(features, "export_pdf", true),
      docx: booleanFeature(features, "export_docx", premiumActive),
      txt: booleanFeature(features, "export_txt", premiumActive),
    },
    projectStorage: booleanFeature(features, "project_storage", true),
    currentPeriodEnd: row.current_period_end,
  };
}

export async function loadAccountEntitlement(client: SupabaseClient, userId: string): Promise<AccountEntitlement> {
  const { data, error } = await client
    .from("account_entitlements")
    .select("plan, billing_status, current_period_end, features")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return FREE_ENTITLEMENT;
  }

  return entitlementFromRow(data as EntitlementRow | null);
}
