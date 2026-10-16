import type { CompletedRunSaveInput, SavedHistoryItem } from "./savedProjects";
import type { ApplicationStatus } from "../applicationStatus";

type SavedRunResponse = {
  runId: string;
  projectId: string;
};

async function readSavedProjectError(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error || fallback;
  } catch {
    return fallback;
  }
}

export async function loadSavedRuns(requestedRunId?: string): Promise<SavedHistoryItem[]> {
  const response = await fetch("/api/saved-runs", {
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(await readSavedProjectError(response, "Saved projects are taking a moment to load."));
  }

  const payload = (await response.json()) as { runs?: SavedHistoryItem[] };
  const runs = payload.runs ?? [];
  if (requestedRunId && /^[0-9a-f-]{36}$/i.test(requestedRunId) && !runs.some((run) => run.accountRunId === requestedRunId)) {
    const requested = await fetch(`/api/saved-runs?runId=${encodeURIComponent(requestedRunId)}`, { cache: "no-store", credentials: "same-origin" });
    if (!requested.ok) throw new Error(await readSavedProjectError(requested, "This saved project could not be loaded."));
    const page = await requested.json() as { runs?: SavedHistoryItem[] };
    return [...runs, ...(page.runs ?? [])];
  }
  return runs;
}

export async function saveCompletedRun(input: CompletedRunSaveInput): Promise<SavedRunResponse> {
  const response = await fetch("/api/saved-runs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await readSavedProjectError(response, "This run could not be saved to your account."));
  }

  return (await response.json()) as SavedRunResponse;
}

export async function renameSavedProject(projectId: string, title: string) {
  const response = await fetch(`/api/saved-runs/${encodeURIComponent(projectId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    throw new Error(await readSavedProjectError(response, "Project name could not be saved."));
  }

  const payload = (await response.json()) as { title: string };
  return payload.title;
}

export async function updateSavedProjectStatus(projectId: string, status: ApplicationStatus) {
  const response = await fetch(`/api/saved-runs/${encodeURIComponent(projectId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error(await readSavedProjectError(response, "Project stage could not be saved."));
  }

  const payload = (await response.json()) as { status: ApplicationStatus };
  return payload.status;
}

export async function deleteSavedProject(projectId: string) {
  const response = await fetch(`/api/saved-runs/${encodeURIComponent(projectId)}`, {
    method: "DELETE",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(await readSavedProjectError(response, "Saved project could not be deleted."));
  }
}
