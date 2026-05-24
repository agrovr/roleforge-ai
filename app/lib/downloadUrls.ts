import type { ExportFormat } from "./exportFormats";

const WORKFLOW_DOWNLOAD_FILENAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(pdf|docx|txt)$/i;
const MAX_WORKFLOW_DOWNLOAD_FILENAME_LENGTH = 180;

type ParsedWorkflowDownloadFilename =
  | {
      ok: true;
      filename: string;
      format: ExportFormat;
    }
  | {
      ok: false;
      error: string;
    };

type ParsedWorkflowDownloadUrl =
  | {
      ok: true;
      url: string;
      filename: string;
      format: ExportFormat;
    }
  | {
      ok: false;
      error: string;
    };

export function workflowDownloadUrl(filename: string) {
  const parsedFilename = parseWorkflowDownloadFilename(filename);
  if (!parsedFilename.ok) {
    throw new Error(parsedFilename.error);
  }

  return `/api/workflow/download/${encodeURIComponent(parsedFilename.filename)}`;
}

export function normalizeWorkflowDownloadUrl(url: string) {
  const normalizeFilename = (value: string) => {
    const parsedFilename = parseWorkflowDownloadFilename(decodeURIComponent(value));
    return parsedFilename.ok ? workflowDownloadUrl(parsedFilename.filename) : url;
  };

  try {
    const parsed = new URL(url, "https://roleforge.local");
    const match = parsed.pathname.match(/(?:\/api\/workflow)?\/download\/([^/]+)$/);
    if (match?.[1]) return normalizeFilename(match[1]);
  } catch {
    const match = url.match(/(?:\/api\/workflow)?\/download\/([^/?#]+)/);
    if (match?.[1]) return normalizeFilename(match[1]);
  }

  return url;
}

export function parseWorkflowDownloadFilename(value: unknown): ParsedWorkflowDownloadFilename {
  if (typeof value !== "string") {
    return { ok: false, error: "This download link is invalid." };
  }

  const filename = value.trim();
  const match = filename.match(WORKFLOW_DOWNLOAD_FILENAME);

  if (
    !filename ||
    filename.length > MAX_WORKFLOW_DOWNLOAD_FILENAME_LENGTH ||
    filename.startsWith(".") ||
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\") ||
    !match
  ) {
    return { ok: false, error: "This download link is invalid." };
  }

  return { ok: true, filename, format: match[1].toLowerCase() as ExportFormat };
}

export function parseWorkflowDownloadUrl(value: unknown): ParsedWorkflowDownloadUrl {
  if (typeof value !== "string") {
    return { ok: false, error: "Saved project download link is invalid." };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(value.trim(), "https://roleforge.local");
  } catch {
    return { ok: false, error: "Saved project download link is invalid." };
  }

  if (parsedUrl.origin !== "https://roleforge.local" || parsedUrl.search || parsedUrl.hash) {
    return { ok: false, error: "Saved project download link is invalid." };
  }

  const match = parsedUrl.pathname.match(/^\/api\/workflow\/download\/([^/]+)$/);
  if (!match?.[1]) {
    return { ok: false, error: "Saved project download link is invalid." };
  }

  const parsedFilename = parseWorkflowDownloadFilename(decodeURIComponent(match[1]));
  if (!parsedFilename.ok) {
    return { ok: false, error: "Saved project download link is invalid." };
  }

  return {
    ok: true,
    url: workflowDownloadUrl(parsedFilename.filename),
    filename: parsedFilename.filename,
    format: parsedFilename.format,
  };
}
