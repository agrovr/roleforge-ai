import type { SupabaseClient } from "@supabase/supabase-js";

import { accountDisplayName } from "../accountUser";
import { parseWorkflowDownloadUrl } from "../downloadUrls";
import { getResumeTemplate, isResumeTemplateSlug, type ResumeTemplateSlug } from "../resumeTemplates";

type ExportFormat = "pdf" | "docx" | "txt";
type SavedDownloadMap = Partial<Record<ExportFormat, string>>;

export type SavedHistoryItem = {
  id: string;
  accountRunId?: string;
  projectId?: string;
  projectTitle?: string;
  createdAt: string;
  filename: string;
  mode: "conservative" | "balanced" | "aggressive";
  score: number;
  downloadUrl: string;
  downloadFormat?: ExportFormat;
  downloads?: SavedDownloadMap;
  roleHint: string;
  saved?: boolean;
  source?: "account" | "local";
  snapshot?: Record<string, unknown>;
};

export type CompletedRunSaveInput = SavedHistoryItem & {
  sourceResumeName?: string;
  jobTarget?: string;
  companyUrl?: string;
  atsScore?: number;
  keywordMatchCount?: number;
  readTimeSeconds?: number;
  downloadFilename?: string;
  payload?: Record<string, unknown>;
};

export type SavedProjectUser = {
  id: string;
  email?: string | null;
  user_metadata?: {
    name?: unknown;
    full_name?: unknown;
  } | null;
};

type TailorRunRow = {
  id: string;
  client_history_id: string | null;
  project_id: string;
  created_at: string;
  source_resume_name: string | null;
  job_target: string | null;
  mode: "conservative" | "balanced" | "aggressive";
  fit_score: number | null;
  download_format: ExportFormat | null;
  download_url: string | null;
  export_template?: string | null;
  payload: Record<string, unknown> | null;
};

type ResumeProjectRow = {
  id: string;
  title: string | null;
};

function titleFromTarget(value: string | undefined) {
  const trimmed = value?.replace(/\s+/g, " ").trim();
  if (!trimmed) return "Resume project";
  return trimmed.length > 80 ? `${trimmed.slice(0, 79).trimEnd()}...` : trimmed;
}

function readSnapshotDownloads(snapshot: Record<string, unknown> | undefined) {
  const rawDownloads = snapshot?.downloads;
  if (!rawDownloads || typeof rawDownloads !== "object") return {};

  return (["pdf", "docx", "txt"] as ExportFormat[]).reduce<SavedDownloadMap>((downloads, format) => {
    const value = (rawDownloads as Record<string, unknown>)[format];
    const parsedDownload = parseWorkflowDownloadUrl(value);
    if (parsedDownload.ok && parsedDownload.format === format) downloads[format] = parsedDownload.url;
    return downloads;
  }, {});
}

function safeDownloadForFormat(url: unknown, format: ExportFormat) {
  const parsedDownload = parseWorkflowDownloadUrl(url);
  return parsedDownload.ok && parsedDownload.format === format ? parsedDownload.url : null;
}

function snapshotWithDownloads(snapshot: Record<string, unknown> | undefined, downloads: SavedDownloadMap) {
  if (!snapshot) return snapshot;

  const safeSnapshot: Record<string, unknown> = { ...snapshot, downloads };
  const snapshotFormat = typeof safeSnapshot.downloadFormat === "string" ? safeSnapshot.downloadFormat : undefined;
  const snapshotUrl = safeDownloadForFormat(safeSnapshot.downloadUrl, snapshotFormat as ExportFormat);

  if (snapshotUrl && snapshotFormat) {
    safeSnapshot.downloadUrl = snapshotUrl;
    safeSnapshot.downloadFormat = snapshotFormat;
    return safeSnapshot;
  }

  delete safeSnapshot.downloadUrl;
  delete safeSnapshot.downloadFormat;
  return safeSnapshot;
}

function missingExportTemplateColumn(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const fields = error as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown };
  const text = [fields.code, fields.message, fields.details, fields.hint].filter(Boolean).join(" ").toLowerCase();
  return text.includes("export_template") && /(column|schema|not found|could not find|unknown)/.test(text);
}

function withoutExportTemplate<T extends { export_template?: unknown }>(payload: T) {
  const fallbackPayload = { ...payload } as Record<string, unknown>;
  delete fallbackPayload.export_template;
  return fallbackPayload;
}

function normalizedTemplateSlug(value: unknown): ResumeTemplateSlug | undefined {
  return typeof value === "string" && isResumeTemplateSlug(value) ? value : undefined;
}

function templateSlugFromSnapshot(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  return normalizedTemplateSlug((value as Record<string, unknown>).templateSlug);
}

function snapshotWithTemplate(snapshot: Record<string, unknown> | undefined, exportTemplate: unknown) {
  const templateSlug = templateSlugFromSnapshot(snapshot) ?? normalizedTemplateSlug(exportTemplate);
  if (!templateSlug) return snapshot;

  const template = getResumeTemplate(templateSlug);
  return {
    ...(snapshot ?? {}),
    templateSlug,
    templateName: typeof snapshot?.templateName === "string" ? snapshot.templateName : template.name,
  };
}

function exportTemplateForInput(input: CompletedRunSaveInput) {
  return (
    templateSlugFromSnapshot(input.snapshot) ??
    templateSlugFromSnapshot(input.payload?.studioSnapshot) ??
    normalizedTemplateSlug(input.payload?.export_template) ??
    "classic"
  );
}

function hasSavedProjectSurface(run: TailorRunRow) {
  if (run.download_url && run.download_url !== "#") return true;
  const snapshot = run.payload?.studioSnapshot;
  return Boolean(snapshot && typeof snapshot === "object");
}

export async function loadSavedRuns(client: SupabaseClient, userId: string): Promise<SavedHistoryItem[]> {
  const selectSavedRuns = (select: string) =>
    client
      .from("tailor_runs")
      .select(select)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(12);

  let { data, error } = await selectSavedRuns(
    "id, client_history_id, project_id, created_at, source_resume_name, job_target, mode, fit_score, download_format, download_url, export_template, payload",
  );

  if (error && missingExportTemplateColumn(error)) {
    ({ data, error } = await selectSavedRuns(
      "id, client_history_id, project_id, created_at, source_resume_name, job_target, mode, fit_score, download_format, download_url, payload",
    ));
  }

  if (error) throw error;

  const runs = (data ?? []) as unknown as TailorRunRow[];
  const visibleRuns = runs.filter(hasSavedProjectSurface);
  const projectIds = Array.from(new Set(visibleRuns.map((run) => run.project_id).filter(Boolean)));
  const projectTitles = new Map<string, string>();

  if (projectIds.length) {
    const { data: projects, error: projectError } = await client
      .from("resume_projects")
      .select("id, title")
      .eq("user_id", userId)
      .in("id", projectIds);

    if (projectError) throw projectError;

    ((projects ?? []) as ResumeProjectRow[]).forEach((project) => {
      if (project.title) projectTitles.set(project.id, project.title);
    });
  }

  return visibleRuns.map((run) => {
    const rawSnapshot = (run.payload?.studioSnapshot as Record<string, unknown> | undefined) ?? undefined;
    const templateSnapshot = snapshotWithTemplate(rawSnapshot, run.export_template);
    const downloadFormat = run.download_format || "pdf";
    const downloads = readSnapshotDownloads(templateSnapshot);
    const runDownloadUrl = safeDownloadForFormat(run.download_url, downloadFormat);
    if (runDownloadUrl) downloads[downloadFormat] = runDownloadUrl;
    const snapshot = snapshotWithDownloads(templateSnapshot, downloads);

    return {
      id: run.client_history_id || run.id,
      accountRunId: run.id,
      projectId: run.project_id,
      projectTitle: projectTitles.get(run.project_id) || titleFromTarget(run.job_target ?? undefined),
      createdAt: run.created_at,
      filename: run.source_resume_name || "Saved resume",
      mode: run.mode || "balanced",
      score: run.fit_score ?? 0,
      downloadUrl: runDownloadUrl || "#",
      downloadFormat,
      downloads,
      roleHint: titleFromTarget(run.job_target ?? undefined),
      saved: true,
      source: "account",
      snapshot,
    };
  });
}

export async function renameSavedProject(client: SupabaseClient, projectId: string, title: string, userId: string) {
  const cleanTitle = title.replace(/\s+/g, " ").trim();
  if (!cleanTitle) throw new Error("Project name is required");

  const { error } = await client
    .from("resume_projects")
    .update({
      title: cleanTitle,
      target_title: cleanTitle,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .eq("user_id", userId);

  if (error) throw error;
  return cleanTitle;
}

export async function deleteSavedProject(client: SupabaseClient, projectId: string, userId: string) {
  const { error } = await client
    .from("resume_projects")
    .delete()
    .eq("id", projectId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function saveCompletedRun(
  client: SupabaseClient,
  input: CompletedRunSaveInput,
  accountUser?: SavedProjectUser,
) {
  const user = accountUser ?? (await client.auth.getUser()).data.user;
  if (!user) throw new Error("Not signed in");

  const email = user.email ?? "";
  const displayName = accountDisplayName(user);

  const { error: profileError } = await client.from("profiles").upsert(
    {
      id: user.id,
      email,
      display_name: displayName || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  // Profiles are useful account decoration, but saved-run persistence should not
  // fail if an older Supabase project has not created the optional table yet.
  void profileError;

  const projectTitle = titleFromTarget(input.jobTarget || input.roleHint || input.filename);
  const runPayload = {
    source_resume_name: input.sourceResumeName || input.filename,
    job_target: input.jobTarget || input.roleHint,
    company_url: input.companyUrl || null,
    mode: input.mode,
    fit_score: input.score,
    ats_score: input.atsScore ?? null,
    keyword_match_count: input.keywordMatchCount ?? null,
    read_time_seconds: input.readTimeSeconds ?? null,
    download_format: input.downloadFormat || "pdf",
    download_url: input.downloadUrl,
    download_filename: input.downloadFilename || null,
    export_template: exportTemplateForInput(input),
    payload: input.payload ?? {},
    created_at: input.createdAt,
  };

  const { data: existingRun, error: existingRunError } = await client
    .from("tailor_runs")
    .select("id, project_id")
    .eq("user_id", user.id)
    .eq("client_history_id", input.id)
    .maybeSingle();

  if (existingRunError) throw existingRunError;

  if (existingRun) {
    const runRecord = existingRun as { id: string; project_id: string };
    const updateRun = (payload: Record<string, unknown>) =>
      client
        .from("tailor_runs")
        .update(payload)
        .eq("id", runRecord.id)
        .eq("user_id", user.id);

    let { error: updateRunError } = await updateRun(runPayload);
    if (updateRunError && missingExportTemplateColumn(updateRunError)) {
      ({ error: updateRunError } = await updateRun(withoutExportTemplate(runPayload)));
    }

    if (updateRunError) throw updateRunError;

    const { error: updateProjectError } = await client
      .from("resume_projects")
      .update({
        title: projectTitle,
        source_filename: input.filename,
        source_name: input.sourceResumeName || input.filename,
        target_title: projectTitle,
        target_source: input.jobTarget || input.roleHint,
        last_target_summary: input.roleHint,
        latest_run_id: runRecord.id,
        status: "exported",
        updated_at: new Date().toISOString(),
      })
      .eq("id", runRecord.project_id)
      .eq("user_id", user.id);

    if (updateProjectError) throw updateProjectError;
    return { projectId: runRecord.project_id, runId: runRecord.id };
  }

  const { data: project, error: projectError } = await client
    .from("resume_projects")
    .insert({
      user_id: user.id,
      title: projectTitle,
      status: "exported",
      source_filename: input.filename,
      source_name: input.sourceResumeName || input.filename,
      target_title: projectTitle,
      target_source: input.jobTarget || input.roleHint,
      last_target_summary: input.roleHint,
    })
    .select("id")
    .single();

  if (projectError) throw projectError;
  const projectId = (project as { id: string }).id;

  const insertRun = (payload: Record<string, unknown>) =>
    client
      .from("tailor_runs")
      .insert({
        project_id: projectId,
        user_id: user.id,
        client_history_id: input.id,
        ...payload,
      })
      .select("id")
      .single();

  let { data: run, error: runError } = await insertRun(runPayload);
  if (runError && missingExportTemplateColumn(runError)) {
    ({ data: run, error: runError } = await insertRun(withoutExportTemplate(runPayload)));
  }

  if (runError) throw runError;
  const runId = (run as { id: string }).id;

  const { error: updateError } = await client
    .from("resume_projects")
    .update({ latest_run_id: runId, status: "exported", updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (updateError) throw updateError;

  return { projectId, runId };
}
