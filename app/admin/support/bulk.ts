"use server";

import { isSupportAdminUser, parseAdminSupportStatus } from "@/app/lib/supportAdmin";
import { applySupportBulk, validSupportBulkTargets, type SupportBulkResult, type SupportBulkTarget } from "@/app/lib/supportBulk";
import { createRoleForgeServerClient } from "@/app/lib/supabase/server";
import { createRoleForgeServiceClient } from "@/app/lib/supabase/service";

export async function updateSupportSelection(targets: SupportBulkTarget[], requestedStatus: string): Promise<SupportBulkResult> {
  const status = parseAdminSupportStatus(requestedStatus);
  if (!status || !validSupportBulkTargets(targets)) return { saved: [], failed: [], error: "Choose up to 40 visible requests and a valid status." };
  const account = await createRoleForgeServerClient();
  const user = account ? (await account.auth.getUser()).data.user : null;
  if (!isSupportAdminUser(user)) return { saved: [], failed: [], error: "An authorized support administrator must sign in before updating requests." };
  const service = createRoleForgeServiceClient();
  if (!service) return { saved: [], failed: [], error: "The support database is unavailable." };
  return applySupportBulk(targets, async ({ id, version }) => {
    const updatedAt = new Date().toISOString();
    const { data, error } = await service.from("support_requests")
      .update({ status, updated_at: updatedAt }).eq("id", id).eq("updated_at", version)
      .select("id, status, updated_at").maybeSingle();
    if (error) throw error;
    return data ? { id: String(data.id), status, updatedAt: String(data.updated_at) } : null;
  });
}
