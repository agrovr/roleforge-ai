import type { CompletedRunSaveInput } from "./savedProjects";
import { parseWorkflowDownloadUrl } from "../downloadUrls";

const SAVE_MODES = new Set(["conservative", "balanced", "aggressive"]);

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function validCreatedAt(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp);
}

export function parseCompletedRunSaveInput(value: unknown):
  | { ok: true; input: CompletedRunSaveInput }
  | { ok: false; error: string } {
  if (!isRecord(value)) {
    return { ok: false, error: "Saved project data is incomplete." };
  }

  const id = stringValue(value.id);
  const createdAt = stringValue(value.createdAt);
  const filename = stringValue(value.filename);
  const mode = stringValue(value.mode);
  const roleHint = stringValue(value.roleHint);
  const downloadUrl = stringValue(value.downloadUrl);
  const score = value.score;

  if (!id || !createdAt || !filename || !mode || !roleHint || !downloadUrl) {
    return { ok: false, error: "Saved project data is incomplete." };
  }

  if (!validCreatedAt(createdAt)) {
    return { ok: false, error: "Saved project date is invalid." };
  }

  if (!SAVE_MODES.has(mode)) {
    return { ok: false, error: "Saved project mode is invalid." };
  }

  const parsedDownloadUrl = parseWorkflowDownloadUrl(downloadUrl);
  if (!parsedDownloadUrl.ok) {
    return { ok: false, error: parsedDownloadUrl.error };
  }

  const downloadFormat = stringValue(value.downloadFormat);
  if (downloadFormat && downloadFormat !== parsedDownloadUrl.format) {
    return { ok: false, error: "Saved project download format is invalid." };
  }

  if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 100) {
    return { ok: false, error: "Saved project score is invalid." };
  }

  return {
    ok: true,
    input: {
      ...(value as CompletedRunSaveInput),
      downloadUrl: parsedDownloadUrl.url,
      downloadFormat: parsedDownloadUrl.format,
    },
  };
}

export function parseSavedProjectId(value: unknown) {
  const projectId = stringValue(value);
  if (!projectId || projectId.length > 120) {
    return { ok: false as const, error: "Saved project link is invalid." };
  }

  return { ok: true as const, projectId };
}

export function parseSavedProjectRenameInput(value: unknown):
  | { ok: true; title: string }
  | { ok: false; error: string } {
  if (!isRecord(value)) {
    return { ok: false, error: "Project name is required." };
  }

  const title = stringValue(value.title).replace(/\s+/g, " ");
  if (!title) {
    return { ok: false, error: "Project name is required." };
  }

  if (title.length > 120) {
    return { ok: false, error: "Project name must be 120 characters or fewer." };
  }

  return { ok: true, title };
}
