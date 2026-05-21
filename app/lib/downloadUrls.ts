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
