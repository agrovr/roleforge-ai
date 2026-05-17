import type { CompletedRunSaveInput, SavedHistoryItem } from "./savedProjects";

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

export async function loadSavedRuns(): Promise<SavedHistoryItem[]> {
  const response = await fetch("/api/saved-runs", {
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(await readSavedProjectError(response, "Saved projects could not refresh."));
  }

  const payload = (await response.json()) as { runs?: SavedHistoryItem[] };
  return payload.runs ?? [];
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

export async function deleteSavedProject(projectId: string) {
  const response = await fetch(`/api/saved-runs/${encodeURIComponent(projectId)}`, {
    method: "DELETE",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(await readSavedProjectError(response, "Saved project could not be deleted."));
  }
}
