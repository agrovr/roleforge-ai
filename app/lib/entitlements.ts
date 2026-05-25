import type { SupabaseClient } from "@supabase/supabase-js";

export type AccountPlan = "free" | "premium";
export type BillingStatus =
  | "none"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

export type AccountEntitlement = {
  plan: AccountPlan;
  billingStatus: BillingStatus;
  exportFormats: {
    pdf: boolean;
    docx: boolean;
    txt: boolean;
  };
  projectStorage: boolean;
  monthlyRunLimit: number | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  cancelAt: string | null;
  canceledAt: string | null;
};

type EntitlementRow = {
  plan: AccountPlan | null;
  billing_status: BillingStatus | null;
  current_period_end: string | null;
  cancel_at_period_end?: boolean | null;
  cancel_at?: string | null;
  canceled_at?: string | null;
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
  monthlyRunLimit: 5,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  cancelAt: null,
  canceledAt: null,
};

function booleanFeature(features: Record<string, unknown> | null, key: string, fallback: boolean) {
  const value = features?.[key];
  return typeof value === "boolean" ? value : fallback;
}

function numberFeature(features: Record<string, unknown> | null, key: string, fallback: number | null) {
  const value = features?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function premiumBooleanFeature(features: Record<string, unknown> | null, key: string, premiumActive: boolean) {
  return premiumActive ? booleanFeature(features, key, true) : false;
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
      docx: premiumBooleanFeature(features, "export_docx", premiumActive),
      txt: premiumBooleanFeature(features, "export_txt", premiumActive),
    },
    projectStorage: booleanFeature(features, "project_storage", true),
    monthlyRunLimit: premiumActive ? numberFeature(features, "monthly_run_limit", null) : FREE_ENTITLEMENT.monthlyRunLimit,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    cancelAt: row.cancel_at ?? null,
    canceledAt: row.canceled_at ?? null,
  };
}

export async function loadAccountEntitlement(client: SupabaseClient, userId: string): Promise<AccountEntitlement> {
  const { data, error } = await client
    .from("account_entitlements")
    .select("plan, billing_status, current_period_end, cancel_at_period_end, cancel_at, canceled_at, features")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return FREE_ENTITLEMENT;
  }

  return entitlementFromRow(data as EntitlementRow | null);
}
