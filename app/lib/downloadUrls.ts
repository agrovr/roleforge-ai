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

export function workflowDownloadUrl(filename: string) {
  return `/api/workflow/download/${encodeURIComponent(filename)}`;
}

export function normalizeWorkflowDownloadUrl(url: string) {
  try {
    const parsed = new URL(url, "https://roleforge.local");
    const match = parsed.pathname.match(/(?:\/api\/workflow)?\/download\/([^/]+)$/);
    if (match?.[1]) return workflowDownloadUrl(decodeURIComponent(match[1]));
  } catch {
    const match = url.match(/(?:\/api\/workflow)?\/download\/([^/?#]+)/);
    if (match?.[1]) return workflowDownloadUrl(decodeURIComponent(match[1]));
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
