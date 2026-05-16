import type { SupabaseClient } from "@supabase/supabase-js";

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
  downloadFormat?: "pdf" | "docx" | "txt";
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

type TailorRunRow = {
  id: string;
  client_history_id: string | null;
  project_id: string;
  resume_projects?: {
    title: string | null;
    updated_at: string | null;
  } | { title: string | null; updated_at: string | null }[] | null;
  created_at: string;
  source_resume_name: string | null;
  job_target: string | null;
  mode: "conservative" | "balanced" | "aggressive";
  fit_score: number | null;
  download_format: "pdf" | "docx" | "txt" | null;
  download_url: string | null;
  payload: Record<string, unknown> | null;
};

function titleFromTarget(value: string | undefined) {
  const trimmed = value?.replace(/\s+/g, " ").trim();
  if (!trimmed) return "Resume project";
  return trimmed.length > 80 ? `${trimmed.slice(0, 79).trimEnd()}...` : trimmed;
}

export async function loadSavedRuns(client: SupabaseClient): Promise<SavedHistoryItem[]> {
  const { data, error } = await client
    .from("tailor_runs")
    .select("id, client_history_id, project_id, created_at, source_resume_name, job_target, mode, fit_score, download_format, download_url, payload, resume_projects!tailor_runs_project_id_fkey(title, updated_at)")
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) throw error;

  return ((data ?? []) as TailorRunRow[]).map((run) => {
    const project = Array.isArray(run.resume_projects) ? run.resume_projects[0] : run.resume_projects;

    return {
      id: run.client_history_id || run.id,
      accountRunId: run.id,
      projectId: run.project_id,
      projectTitle: project?.title || titleFromTarget(run.job_target ?? undefined),
      createdAt: run.created_at,
      filename: run.source_resume_name || "Saved resume",
      mode: run.mode || "balanced",
      score: run.fit_score ?? 0,
      downloadUrl: run.download_url || "#",
      downloadFormat: run.download_format || "pdf",
      roleHint: titleFromTarget(run.job_target ?? undefined),
      saved: true,
      source: "account",
      snapshot: (run.payload?.studioSnapshot as Record<string, unknown> | undefined) ?? undefined,
    };
  });
}

export async function renameSavedProject(client: SupabaseClient, projectId: string, title: string) {
  const cleanTitle = title.replace(/\s+/g, " ").trim();
  if (!cleanTitle) throw new Error("Project name is required");

  const { error } = await client
    .from("resume_projects")
    .update({
      title: cleanTitle,
      target_title: cleanTitle,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  if (error) throw error;
  return cleanTitle;
}

export async function deleteSavedProject(client: SupabaseClient, projectId: string) {
  const { error } = await client
    .from("resume_projects")
    .delete()
    .eq("id", projectId);

  if (error) throw error;
}

export async function saveCompletedRun(client: SupabaseClient, input: CompletedRunSaveInput) {
  const { data: userResult, error: userError } = await client.auth.getUser();
  if (userError) throw userError;

  const user = userResult.user;
  if (!user) throw new Error("Not signed in");

  const email = user.email ?? "";
  const displayName =
    typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : "";

  const { error: profileError } = await client.from("profiles").upsert(
    {
      id: user.id,
      email,
      display_name: displayName || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (profileError) throw profileError;

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
    const { error: updateRunError } = await client
      .from("tailor_runs")
      .update(runPayload)
      .eq("id", runRecord.id)
      .eq("user_id", user.id);

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
      status: "active",
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

  const { data: run, error: runError } = await client
    .from("tailor_runs")
    .insert({
      project_id: projectId,
      user_id: user.id,
      client_history_id: input.id,
      ...runPayload,
    })
    .select("id")
    .single();

  if (runError) throw runError;
  const runId = (run as { id: string }).id;

  const { error: updateError } = await client
    .from("resume_projects")
    .update({ latest_run_id: runId, updated_at: new Date().toISOString() })
    .eq("id", projectId);

  if (updateError) throw updateError;

  return { projectId, runId };
}
