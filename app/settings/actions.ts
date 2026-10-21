"use server";

import { cookies } from "next/headers";
import { saveAccountProfile, saveCommunicationPreferences } from "../lib/accountProfile";
import { RESUME_TEMPLATE_COOKIE } from "../lib/resumeTemplates";
import { persistSettingsChanges, type SettingsChange, type SettingsSaveResult } from "../lib/settingsDrafts";
import { createRoleForgeServerClient } from "../lib/supabase/server";
import { updateSavedProjectStatus } from "../lib/supabase/savedProjects";
import type { ApplicationStatus } from "../lib/applicationStatus";

export async function saveSettingsDraft(changes: SettingsChange[]): Promise<SettingsSaveResult> {
  if (!Array.isArray(changes) || changes.length > 100 || changes.some((change) => !change || typeof change.key !== "string" || change.key.length > 160)) {
    return { saved: [], errors: { form: "Invalid settings request. Reload and try again." } };
  }
  const supabase = await createRoleForgeServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) return { saved: [], errors: { form: "Your session has ended. Sign in again before saving." } };
  return persistSettingsChanges(changes, async ({ key, value }) => {
    if (key === "displayName") {
      try { await saveAccountProfile(supabase, user, { displayName: value }); }
      catch { throw new Error("Name save could not finish. Your profile may already be updated; retry to finish syncing it."); }
    } else if (key === "productUpdates") {
      try { await saveCommunicationPreferences(supabase, user, { productUpdates: value === true }); }
      catch { throw new Error("Communication preferences could not be saved. Please retry."); }
    } else if (key === "template") {
      (await cookies()).set(RESUME_TEMPLATE_COOKIE, String(value), { maxAge: 60 * 60 * 24 * 365, path: "/", sameSite: "lax" });
    } else {
      const [, projectId, field] = key.split(":");
      if (field === "status") {
        try { await updateSavedProjectStatus(supabase, projectId, value as ApplicationStatus, user.id); }
        catch { throw new Error("Project stage could not be saved. It may no longer be available."); }
      } else {
        const { data, error } = await supabase.from("resume_projects")
          .update({ title: value, target_title: value, updated_at: new Date().toISOString() })
          .eq("id", projectId).eq("user_id", user.id).select("id").maybeSingle();
        if (error || !data) throw new Error("Project name could not be saved. It may no longer be available.");
      }
    }
  });
}
