export type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    request_id?: string;
    details?: unknown;
  };
};

export type ApiWorkflowError = Error & {
  code?: string;
  requestId?: string;
  details?: Record<string, unknown> | null;
};

export type WorkflowErrorState = {
  message: string;
  code?: string;
  requestId?: string;
  details?: Record<string, unknown> | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function customerWorkflowMessage(code: string | undefined, apiMessage: string | undefined, fallback: string) {
  switch (code) {
    case "auth_not_configured":
      return "Account sign-in is temporarily unavailable. Try again shortly.";
    case "authentication_required":
      return "Sign in again to continue your resume workflow.";
    case "auth_verification_failed":
      return "We could not verify your session. Refresh the page or sign in again, then retry.";
    case "export_forbidden":
      return "This export belongs to another signed-in account.";
    case "file_not_found":
      return "This export link is no longer available. Create a fresh PDF from the saved run.";
    case "invalid_filename":
      return "This export link is invalid. Create a fresh export from the saved run.";
    case "job_url_fetch_failed":
      return "We could not read that job post. Paste the job description or try the link again.";
    case "missing_filename":
      return "Choose a resume file before uploading.";
    case "resume_not_found":
      return "Upload the source resume again before re-running Tailor.";
    case "usage_verification_failed":
      return "We could not check your plan usage. Wait a moment, then try again.";
    case "usage_recording_failed":
      return "We could not save this run to your account usage yet. Try again in a moment.";
    case "rate_limited":
      return "Too many tailoring requests are running right now. Wait a minute, then try again.";
    case "plan_limit_reached":
      return "Free monthly limit reached.";
    case "premium_required":
      return "This export requires an active Premium plan.";
    default:
      return apiMessage || fallback;
  }
}

function createWorkflowError(message: string, code?: string, requestId?: string, details?: unknown): ApiWorkflowError {
  const error = new Error(message) as ApiWorkflowError;
  error.code = code;
  error.requestId = requestId;
  error.details = asRecord(details);
  return error;
}

export async function readApiError(response: Response, fallback: string): Promise<ApiWorkflowError> {
  try {
    const data = (await response.json()) as ApiErrorPayload;
    const message = data.error?.message;
    const code = data.error?.code;
    const requestId = data.error?.request_id;
    return createWorkflowError(customerWorkflowMessage(code, message, fallback), code, requestId, data.error?.details);
  } catch {
    return createWorkflowError(fallback);
  }
}

export function workflowErrorFromCaught(caught: unknown, fallback: string): WorkflowErrorState {
  if (caught instanceof Error) {
    const apiError = caught as ApiWorkflowError;
    return {
      message: customerWorkflowMessage(apiError.code, apiError.message || undefined, fallback),
      code: apiError.code,
      requestId: apiError.requestId,
      details: apiError.details ?? null,
    };
  }

  return { message: fallback, details: null };
}
