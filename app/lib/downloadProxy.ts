type BackendErrorPayload = {
  error?: string | {
    code?: string;
    message?: string;
  };
};

export type DownloadProxyError = {
  error: string;
  code?: string;
};

function fallbackDownloadProxyError(status?: number): DownloadProxyError {
  if (status === 401) return { error: "Sign in again to download this export.", code: "authentication_required" };
  if (status === 402) return { error: "This export requires an active Premium plan.", code: "premium_required" };
  if (status === 403) return { error: "This export is not available for this account.", code: "export_forbidden" };
  if (status === 404) return { error: "This export file is no longer available.", code: "export_not_found" };
  if (status === 503) return { error: "Downloads are temporarily unavailable. Try again in a moment.", code: "downloads_unavailable" };
  return { error: "This export could not be downloaded." };
}

export function downloadProxyErrorPayload(payload: BackendErrorPayload | null | undefined, status?: number): DownloadProxyError {
  const fallback = fallbackDownloadProxyError(status);
  const error = payload?.error;

  if (typeof error === "string") {
    return error ? { error } : fallback;
  }

  if (error && typeof error === "object") {
    return {
      error: error.message || fallback.error,
      code: error.code || fallback.code,
    };
  }

  return fallback;
}

export async function readDownloadProxyError(upstream: Response): Promise<DownloadProxyError> {
  try {
    const payload = (await upstream.clone().json()) as BackendErrorPayload;
    return downloadProxyErrorPayload(payload, upstream.status);
  } catch {
    return downloadProxyErrorPayload(null, upstream.status);
  }
}
