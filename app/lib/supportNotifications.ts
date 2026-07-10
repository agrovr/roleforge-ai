import { createHash } from "node:crypto";

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
  | { status: "skipped"; reason: "missing-destination" | "invalid-webhook" | "invalid-email" | "missing-fetch" }
  | { status: "sent" }
  | { status: "failed"; statusCode: number; bodyPreview: string };

export type SupportReplyEmailResult =
  | { status: "skipped"; reason: "invalid-email" | "missing-fetch" }
  | { status: "sent" }
  | { status: "failed"; statusCode: number; bodyPreview: string };

function compactPreview(value: string, limit = 300) {
  const compacted = value.replace(/\s+/g, " ").trim();
  return compacted.length > limit ? `${compacted.slice(0, limit - 3).trim()}...` : compacted;
}

function normalizeIdempotencyKey(value: unknown) {
  if (typeof value !== "string") return "";
  const candidate = value.trim();
  return candidate.length >= 1 && candidate.length <= 256 && /^[\x21-\x7e]+$/.test(candidate) ? candidate : "";
}

export function buildSupportReplyIdempotencyKey({
  requestId,
  requestVersion,
  message,
  nextStatus,
}: {
  requestId: string;
  requestVersion: string;
  message: string;
  nextStatus: "reviewing" | "closed";
}) {
  const digest = createHash("sha256")
    .update(`${requestId}\u0000${requestVersion}\u0000${nextStatus}\u0000${message.trim()}`)
    .digest("hex")
    .slice(0, 32);
  return `support-reply/${requestId}/${digest}`;
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

function normalizeSupportEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  if (!candidate) return null;
  const match = candidate.match(/<([^<>@\s]+@[^<>@\s]+\.[^<>@\s]+)>$/);
  const email = (match?.[1] ?? candidate).trim();
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ? candidate : null;
}

function normalizeSupportEmailRecipients(value: unknown) {
  if (typeof value !== "string") return [];
  return value
    .split(/[;,]/)
    .map((entry) => normalizeSupportEmail(entry))
    .filter((entry): entry is string => Boolean(entry));
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

function normalizeSupportSiteUrl(value: unknown) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : "";
  } catch {
    return "";
  }
}

function buildSupportRequestEmailText(payload: SupportRequestNotificationPayload, adminInboxUrl = "") {
  return [
    `RoleForge support request ${payload.reference}`,
    "",
    `Status: open`,
    `Created: ${payload.createdAt}`,
    `Category: ${payload.categoryLabel}`,
    `Subject: ${payload.subject}`,
    `Customer email: ${payload.account.email ?? "Not available"}`,
    payload.contextUrl ? `Context: ${payload.contextUrl}` : "Context: Not provided",
    "",
    "Message:",
    payload.message,
    "",
    "Operator actions:",
    adminInboxUrl ? `- Open the support inbox: ${adminInboxUrl}` : "- Open the support inbox from /admin/support.",
    `- Reply to the customer by email and keep ${payload.reference} in the subject.`,
    "- Mark the request reviewing or closed from the web inbox.",
  ].join("\n");
}

function buildSupportReplyEmailText({
  message,
  reference,
}: {
  message: string;
  reference: string;
}) {
  return [
    message.trim(),
    "",
    "--",
    "RoleForge Support",
    `Request: ${reference}`,
  ].join("\n");
}

export async function sendSupportReplyEmail({
  to,
  subject,
  message,
  reference,
  idempotencyKey,
  env = process.env,
  fetcher = globalThis.fetch as SupportNotificationFetch | undefined,
}: {
  to: string;
  subject: string;
  message: string;
  reference: string;
  idempotencyKey?: string;
  env?: SupportNotificationEnv;
  fetcher?: SupportNotificationFetch;
}): Promise<SupportReplyEmailResult> {
  const resendApiKey = env.RESEND_API_KEY?.trim() ?? "";
  const emailFrom = normalizeSupportEmail(env.ROLEFORGE_SUPPORT_EMAIL_FROM);
  const emailTo = normalizeSupportEmail(to);

  if (!resendApiKey || !emailFrom || !emailTo || !message.trim()) return { status: "skipped", reason: "invalid-email" };
  if (!fetcher) return { status: "skipped", reason: "missing-fetch" };

  const headers: Record<string, string> = {
    "content-type": "application/json",
    authorization: `Bearer ${resendApiKey}`,
  };
  const normalizedIdempotencyKey = normalizeIdempotencyKey(idempotencyKey);
  if (normalizedIdempotencyKey) headers["Idempotency-Key"] = normalizedIdempotencyKey;

  const abortController = typeof AbortController === "function" ? new AbortController() : null;
  const timeout = abortController ? setTimeout(() => abortController.abort(), 3500) : null;

  let response: { ok: boolean; status: number; text?: () => Promise<string> };
  try {
    response = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: emailFrom,
        to: [emailTo],
        subject: `Re: ${subject} (${reference})`,
        text: buildSupportReplyEmailText({ message, reference }),
      }),
      signal: abortController?.signal,
    });
  } catch (error) {
    return {
      status: "failed",
      statusCode: 0,
      bodyPreview: compactPreview(error instanceof Error ? error.message : "Support reply email failed"),
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
  const payload = buildSupportRequestNotificationPayload({ saved, input, user });
  const adminInboxUrl = normalizeSupportSiteUrl(env.NEXT_PUBLIC_SITE_URL) ? `${normalizeSupportSiteUrl(env.NEXT_PUBLIC_SITE_URL)}/admin/support` : "";
  const configuredWebhook = env.ROLEFORGE_SUPPORT_WEBHOOK_URL?.trim() ?? "";
  const resendApiKey = env.RESEND_API_KEY?.trim() ?? "";
  const emailFrom = normalizeSupportEmail(env.ROLEFORGE_SUPPORT_EMAIL_FROM);
  const emailTo = normalizeSupportEmailRecipients(env.ROLEFORGE_SUPPORT_EMAIL_TO);
  const emailConfigured = Boolean(resendApiKey || env.ROLEFORGE_SUPPORT_EMAIL_FROM || env.ROLEFORGE_SUPPORT_EMAIL_TO);
  const emailReady = Boolean(resendApiKey && emailFrom && emailTo.length);

  if (!configuredWebhook && !emailConfigured) return { status: "skipped", reason: "missing-destination" };
  if (emailConfigured && !emailReady && !configuredWebhook) return { status: "skipped", reason: "invalid-email" };

  const webhookUrl = normalizeSupportWebhookUrl(configuredWebhook);
  if (configuredWebhook && !webhookUrl && !emailReady) return { status: "skipped", reason: "invalid-webhook" };

  if (!fetcher) return { status: "skipped", reason: "missing-fetch" };

  if (webhookUrl) {
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
        body: JSON.stringify(payload),
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

    if (!response.ok) {
      const body = typeof response.text === "function" ? await response.text().catch(() => "") : "";
      return {
        status: "failed",
        statusCode: response.status,
        bodyPreview: compactPreview(body),
      };
    }
  }

  if (!emailReady) return { status: "sent" };

  const headers: Record<string, string> = {
    "content-type": "application/json",
    authorization: `Bearer ${resendApiKey}`,
  };

  const abortController = typeof AbortController === "function" ? new AbortController() : null;
  const timeout = abortController ? setTimeout(() => abortController.abort(), 3500) : null;

  let response: { ok: boolean; status: number; text?: () => Promise<string> };
  try {
    response = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: emailFrom,
        to: emailTo,
        reply_to: user.email ? [user.email] : undefined,
        subject: `[RoleForge Support] ${payload.reference} ${payload.categoryLabel}: ${payload.subject}`,
        text: buildSupportRequestEmailText(payload, adminInboxUrl),
      }),
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
