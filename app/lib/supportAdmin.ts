import type { SupabaseClient, User } from "@supabase/supabase-js";

import {
  supportCategoryLabel,
  supportRequestDateLabel,
  supportRequestReference,
  supportStatusLabel,
  type SupportRequestCategory,
  type SupportRequestStatus,
} from "./supportRequests";

const SUPPORT_STATUS_SET = new Set<string>(["open", "reviewing", "closed"]);
const SUPPORT_CATEGORY_SET = new Set<string>(["workflow", "exports", "billing", "privacy", "account", "saved-projects", "other"]);

export type AdminSupportRequest = {
  id: string;
  referenceLabel: string;
  userId: string;
  email: string;
  category: SupportRequestCategory;
  categoryLabel: string;
  subject: string;
  message: string;
  contextUrl: string | null;
  status: SupportRequestStatus;
  statusLabel: string;
  createdAt: string;
  createdLabel: string;
};

export type SupportOperatorReadiness = {
  adminAccessReady: boolean;
  customerReplyReady: boolean;
  emailAlertsReady: boolean;
  webhookReady: boolean;
  serviceRoleReady: boolean;
};

function compact(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function compactMessage(value: unknown) {
  return typeof value === "string" ? value.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim() : "";
}

function normalizeCategory(value: unknown): SupportRequestCategory {
  const category = compact(value);
  return SUPPORT_CATEGORY_SET.has(category) ? category as SupportRequestCategory : "other";
}

export function normalizeAdminEmail(value: unknown) {
  const email = compact(value).toLowerCase();
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ? email : "";
}

export function parseSupportAdminEmails(value: unknown) {
  if (typeof value !== "string") return [];
  return Array.from(new Set(value.split(/[;,]/).map(normalizeAdminEmail).filter(Boolean)));
}

function normalizeEmailAddress(value: unknown) {
  if (typeof value !== "string") return "";
  const candidate = compact(value);
  const match = candidate.match(/<([^<>@\s]+@[^<>@\s]+\.[^<>@\s]+)>$/);
  return normalizeAdminEmail(match?.[1] ?? candidate);
}

function notificationEmailListReady(value: unknown) {
  if (typeof value !== "string") return false;
  return value
    .split(/[;,]/)
    .map(normalizeEmailAddress)
    .filter(Boolean)
    .length > 0;
}

function emailListReady(value: unknown) {
  return parseSupportAdminEmails(value).length > 0;
}

function httpsUrlReady(value: unknown) {
  if (typeof value !== "string") return false;
  try {
    return new URL(value.trim()).protocol === "https:";
  } catch {
    return false;
  }
}

function senderEmailReady(value: unknown) {
  return Boolean(normalizeEmailAddress(value));
}

export function supportOperatorReadiness(env: Record<string, string | undefined> = process.env): SupportOperatorReadiness {
  return {
    adminAccessReady: emailListReady(env.ROLEFORGE_ADMIN_EMAILS),
    customerReplyReady: Boolean(env.RESEND_API_KEY?.trim() && senderEmailReady(env.ROLEFORGE_SUPPORT_EMAIL_FROM)),
    emailAlertsReady: Boolean(
      env.RESEND_API_KEY?.trim()
      && notificationEmailListReady(env.ROLEFORGE_SUPPORT_EMAIL_TO)
      && senderEmailReady(env.ROLEFORGE_SUPPORT_EMAIL_FROM),
    ),
    webhookReady: httpsUrlReady(env.ROLEFORGE_SUPPORT_WEBHOOK_URL),
    serviceRoleReady: Boolean(env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
  };
}

export function isSupportAdminUser(
  user: Pick<User, "email"> | null | undefined,
  env: Record<string, string | undefined> = process.env,
) {
  const email = normalizeAdminEmail(user?.email);
  if (!email) return false;
  return parseSupportAdminEmails(env.ROLEFORGE_ADMIN_EMAILS).includes(email);
}

function normalizeStatus(value: unknown): SupportRequestStatus {
  const status = compact(value);
  return SUPPORT_STATUS_SET.has(status) ? status as SupportRequestStatus : "open";
}

export function parseAdminSupportStatus(value: unknown): SupportRequestStatus | null {
  const status = compact(value);
  return SUPPORT_STATUS_SET.has(status) ? status as SupportRequestStatus : null;
}

function normalizeAdminSupportRequest(row: Record<string, unknown>): AdminSupportRequest {
  const category = normalizeCategory(row.category);
  const status = normalizeStatus(row.status);
  const createdAt = compact(row.created_at);
  return {
    id: compact(row.id),
    referenceLabel: supportRequestReference(row.id),
    userId: compact(row.user_id),
    email: compact(row.email) || "No email",
    category,
    categoryLabel: supportCategoryLabel(category),
    subject: compact(row.subject) || "Support request",
    message: compactMessage(row.message),
    contextUrl: compact(row.context_url) || null,
    status,
    statusLabel: supportStatusLabel(status),
    createdAt,
    createdLabel: supportRequestDateLabel(createdAt),
  };
}

export async function loadAdminSupportRequests(client: SupabaseClient, options: { limit?: number; status?: SupportRequestStatus | "all" } = {}) {
  const limit = Math.min(Math.max(options.limit ?? 30, 1), 100);
  const status = options.status ?? "open";
  let query = client
    .from("support_requests")
    .select("id, user_id, email, category, subject, message, context_url, status, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => normalizeAdminSupportRequest(row as Record<string, unknown>));
}

export async function loadAdminSupportRequest(client: SupabaseClient, id: string) {
  const { data, error } = await client
    .from("support_requests")
    .select("id, user_id, email, category, subject, message, context_url, status, created_at")
    .eq("id", id)
    .single();

  if (error) throw error;
  return normalizeAdminSupportRequest(data as Record<string, unknown>);
}

export async function updateAdminSupportRequestStatus(client: SupabaseClient, id: string, status: SupportRequestStatus) {
  const normalizedStatus = parseAdminSupportStatus(status);
  if (!normalizedStatus) throw new Error("Unsupported support request status.");

  const { data, error } = await client
    .from("support_requests")
    .update({ status: normalizedStatus, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, status")
    .single();

  if (error) throw error;
  return {
    id: compact(data?.id),
    status: normalizeStatus(data?.status),
  };
}
