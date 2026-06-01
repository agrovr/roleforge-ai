import type { SupabaseClient } from "@supabase/supabase-js";

export type AccountDeletionBlockReason = "none" | "billing-active" | "unavailable";

type BillingDeletionRow = {
  billing_status: string | null;
  stripe_subscription_id: string | null;
};

const DELETION_CONFIRMATION = "DELETE";
const SUBSCRIPTION_BLOCKING_STATUSES = new Set(["trialing", "active", "past_due", "incomplete", "unpaid", "paused"]);

export function validateAccountDeletionConfirmation(value: FormDataEntryValue | string | null) {
  return typeof value === "string" && value.trim() === DELETION_CONFIRMATION;
}

export function accountDeletionBlockedByBilling(row?: BillingDeletionRow | null): AccountDeletionBlockReason {
  if (!row) return "none";
  const status = row.billing_status ?? "none";

  if (row.stripe_subscription_id && SUBSCRIPTION_BLOCKING_STATUSES.has(status)) {
    return "billing-active";
  }

  return "none";
}

export async function accountDeletionBlockReason(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from("account_entitlements")
    .select("billing_status, stripe_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return "unavailable";
  return accountDeletionBlockedByBilling(data as BillingDeletionRow | null);
}
