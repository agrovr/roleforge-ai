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

export function downloadProxyErrorPayload(payload: BackendErrorPayload | null | undefined): DownloadProxyError {
  const fallback = "This export could not be downloaded.";
  const error = payload?.error;

  if (typeof error === "string") {
    return { error: error || fallback };
  }

  if (error && typeof error === "object") {
    return {
      error: error.message || fallback,
      code: error.code,
    };
  }

  return { error: fallback };
}

export async function readDownloadProxyError(upstream: Response): Promise<DownloadProxyError> {
  try {
    const payload = (await upstream.clone().json()) as BackendErrorPayload;
    return downloadProxyErrorPayload(payload);
  } catch {
    return downloadProxyErrorPayload(null);
  }
}
