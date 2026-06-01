import type { SupabaseClient } from "@supabase/supabase-js";

import { loadAccountProfile, type AccountProfile } from "./accountProfile";
import type { AccountIdentitySource } from "./accountUser";
import { accountDisplayName } from "./accountUser";
import type { AccountEntitlement } from "./entitlements";
import type { AccountUsage } from "./usage";

type ExportUser = AccountIdentitySource & {
  id: string;
  email?: string | null;
  created_at?: string | null;
};

type ProjectExportRow = {
  id: string;
  title: string | null;
  status: string | null;
  source_filename: string | null;
  source_name: string | null;
  target_title: string | null;
  target_source: string | null;
  last_target_summary: string | null;
  latest_run_id: string | null;
  created_at: string;
  updated_at: string;
};

type RunExportRow = {
  id: string;
  project_id: string;
  client_history_id: string | null;
  source_resume_name: string | null;
  job_target: string | null;
  company_url: string | null;
  mode: string | null;
  fit_score: number | null;
  ats_score: number | null;
  keyword_match_count: number | null;
  read_time_seconds: number | null;
  download_format: string | null;
  download_filename: string | null;
  export_template: string | null;
  created_at: string;
};

export function accountExportFilename(email: string | null | undefined, now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  const label = (email || "account")
    .toLowerCase()
    .replace(/@/g, "-at-")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 54) || "account";

  return `roleforge-account-summary-${label}-${day}.json`;
}

export function buildAccountExportPayload({
  user,
  profile,
  entitlement,
  usage,
  projects,
  runs,
  generatedAt = new Date().toISOString(),
}: {
  user: ExportUser;
  profile: AccountProfile | null;
  entitlement: AccountEntitlement;
  usage: AccountUsage;
  projects: ProjectExportRow[];
  runs: RunExportRow[];
  generatedAt?: string;
}) {
  return {
    exportType: "roleforge-account-summary",
    generatedAt,
    account: {
      id: user.id,
      email: user.email ?? profile?.email ?? "",
      displayName: accountDisplayName(user, profile?.displayName),
      createdAt: user.created_at ?? null,
      profileUpdatedAt: profile?.updatedAt || null,
    },
    plan: {
      name: entitlement.plan,
      billingStatus: entitlement.billingStatus,
      currentPeriodEnd: entitlement.currentPeriodEnd,
      cancelAtPeriodEnd: entitlement.cancelAtPeriodEnd,
      exportFormats: entitlement.exportFormats,
      monthlyRunLimit: entitlement.monthlyRunLimit,
    },
    usage: {
      currentPeriodStart: usage.currentPeriodStart,
      currentPeriodEnd: usage.currentPeriodEnd,
      monthlyRuns: usage.monthlyRuns,
      monthlyRunLimit: usage.monthlyRunLimit,
      remainingRuns: usage.remainingRuns,
      runLimited: usage.runLimited,
    },
    savedProjects: projects.map((project) => ({
      id: project.id,
      title: project.title || "Untitled resume",
      status: project.status || "draft",
      sourceFilename: project.source_filename,
      sourceName: project.source_name,
      targetTitle: project.target_title,
      targetSource: project.target_source,
      lastTargetSummary: project.last_target_summary,
      latestRunId: project.latest_run_id,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    })),
    tailoringRuns: runs.map((run) => ({
      id: run.id,
      projectId: run.project_id,
      clientHistoryId: run.client_history_id,
      sourceResumeName: run.source_resume_name,
      jobTarget: run.job_target,
      companyUrl: run.company_url,
      mode: run.mode,
      fitScore: run.fit_score,
      atsScore: run.ats_score,
      keywordMatchCount: run.keyword_match_count,
      readTimeSeconds: run.read_time_seconds,
      downloadFormat: run.download_format,
      downloadFilename: run.download_filename,
      exportTemplate: run.export_template,
      createdAt: run.created_at,
    })),
  };
}

export async function loadAccountExportData(
  client: SupabaseClient,
  user: ExportUser,
  entitlement: AccountEntitlement,
  usage: AccountUsage,
) {
  const [profile, projectsResult, runsResult] = await Promise.all([
    loadAccountProfile(client, user.id),
    client
      .from("resume_projects")
      .select("id, title, status, source_filename, source_name, target_title, target_source, last_target_summary, latest_run_id, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(250),
    client
      .from("tailor_runs")
      .select("id, project_id, client_history_id, source_resume_name, job_target, company_url, mode, fit_score, ats_score, keyword_match_count, read_time_seconds, download_format, download_filename, export_template, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (projectsResult.error) throw projectsResult.error;
  if (runsResult.error) throw runsResult.error;

  return buildAccountExportPayload({
    user,
    profile,
    entitlement,
    usage,
    projects: (projectsResult.data ?? []) as ProjectExportRow[],
    runs: (runsResult.data ?? []) as RunExportRow[],
  });
}
