import type { User } from "@supabase/supabase-js";

import {
  supportCategoryLabel,
  type SupportRequestInput,
  type SupportRequestResult,
  supportRequestReference,
} from "./supportRequests";

type SupportNotificationEnv = Record<string, string | undefined>;

type SupportNotificationFetch = (
  input: string | URL,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<{ ok: boolean; status: number; text?: () => Promise<string> }>;

export type SupportRequestNotificationPayload = {
  event: "support_request.created";
  reference: string;
  requestId: string;
  createdAt: string;
  category: SupportRequestInput["category"];
  categoryLabel: string;
  subject: string;
  message: string;
  contextUrl: string | null;
  account: {
    email: string | null;
  };
};

export type SupportNotificationResult =
  | { status: "skipped"; reason: "missing-webhook" | "invalid-webhook" | "missing-fetch" }
  | { status: "sent" }
  | { status: "failed"; statusCode: number; bodyPreview: string };

function compactPreview(value: string, limit = 300) {
  const compacted = value.replace(/\s+/g, " ").trim();
  return compacted.length > limit ? `${compacted.slice(0, limit - 3).trim()}...` : compacted;
}

export function normalizeSupportWebhookUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function buildSupportRequestNotificationPayload({
  saved,
  input,
  user,
}: {
  saved: SupportRequestResult;
  input: SupportRequestInput;
  user: Pick<User, "email">;
}): SupportRequestNotificationPayload {
  return {
    event: "support_request.created",
    reference: supportRequestReference(saved.id),
    requestId: saved.id,
    createdAt: saved.createdAt,
    category: input.category,
    categoryLabel: supportCategoryLabel(input.category),
    subject: input.subject,
    message: input.message,
    contextUrl: input.contextUrl,
    account: {
      email: user.email ?? null,
    },
  };
}

export async function notifySupportRequestCreated({
  saved,
  input,
  user,
  env = process.env,
  fetcher = globalThis.fetch as SupportNotificationFetch | undefined,
}: {
  saved: SupportRequestResult;
  input: SupportRequestInput;
  user: Pick<User, "email">;
  env?: SupportNotificationEnv;
  fetcher?: SupportNotificationFetch;
}): Promise<SupportNotificationResult> {
  const configuredWebhook = env.ROLEFORGE_SUPPORT_WEBHOOK_URL?.trim() ?? "";
  if (!configuredWebhook) return { status: "skipped", reason: "missing-webhook" };

  const webhookUrl = normalizeSupportWebhookUrl(configuredWebhook);
  if (!webhookUrl) return { status: "skipped", reason: "invalid-webhook" };

  if (!fetcher) return { status: "skipped", reason: "missing-fetch" };

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "user-agent": "RoleForge-Support/1.0",
  };
  const webhookSecret = env.ROLEFORGE_SUPPORT_WEBHOOK_SECRET?.trim();
  if (webhookSecret) headers["x-roleforge-support-secret"] = webhookSecret;

  const abortController = typeof AbortController === "function" ? new AbortController() : null;
  const timeout = abortController ? setTimeout(() => abortController.abort(), 3500) : null;

  let response: { ok: boolean; status: number; text?: () => Promise<string> };
  try {
    response = await fetcher(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(buildSupportRequestNotificationPayload({ saved, input, user })),
      signal: abortController?.signal,
    });
  } catch (error) {
    return {
      status: "failed",
      statusCode: 0,
      bodyPreview: compactPreview(error instanceof Error ? error.message : "Support notification request failed"),
    };
  } finally {
    if (timeout) clearTimeout(timeout);
  }

  if (response.ok) return { status: "sent" };

  const body = typeof response.text === "function" ? await response.text().catch(() => "") : "";
  return {
    status: "failed",
    statusCode: response.status,
    bodyPreview: compactPreview(body),
  };
}
