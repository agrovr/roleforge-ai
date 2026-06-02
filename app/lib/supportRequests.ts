import type { SupabaseClient, User } from "@supabase/supabase-js";

export const SUPPORT_REQUEST_CATEGORIES = [
  "workflow",
  "exports",
  "billing",
  "account",
  "saved-projects",
  "other",
] as const;

export type SupportRequestCategory = (typeof SUPPORT_REQUEST_CATEGORIES)[number];

export type SupportRequestInput = {
  category: SupportRequestCategory;
  subject: string;
  message: string;
  contextUrl: string | null;
};

export type SupportRequestResult = {
  id: string;
  createdAt: string;
};

const supportCategorySet = new Set<string>(SUPPORT_REQUEST_CATEGORIES);

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function compactSingleLine(value: unknown) {
  return stringValue(value).replace(/\s+/g, " ").trim();
}

function compactMessage(value: unknown) {
  return stringValue(value)
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeContextUrl(value: unknown) {
  const contextUrl = compactSingleLine(value);
  if (!contextUrl) return null;
  if (contextUrl.length > 300) return null;
  if (/^https?:\/\//i.test(contextUrl)) return contextUrl;
  if (/^\/[A-Za-z0-9/?#&=._~:%+-]*$/.test(contextUrl)) return contextUrl;
  if (/^req_[A-Za-z0-9_-]{3,80}$/.test(contextUrl)) return contextUrl;
  return null;
}

export function supportCategoryLabel(category: SupportRequestCategory) {
  switch (category) {
    case "workflow":
      return "Workflow";
    case "exports":
      return "Exports";
    case "billing":
      return "Billing";
    case "account":
      return "Account";
    case "saved-projects":
      return "Saved projects";
    case "other":
      return "Other";
  }
}

export function parseSupportRequestInput(payload: {
  category?: unknown;
  subject?: unknown;
  message?: unknown;
  contextUrl?: unknown;
}): { ok: true; input: SupportRequestInput } | { ok: false; error: string } {
  const category = compactSingleLine(payload.category);
  const subject = compactSingleLine(payload.subject);
  const message = compactMessage(payload.message);
  const contextUrl = normalizeContextUrl(payload.contextUrl);

  if (!supportCategorySet.has(category)) {
    return { ok: false, error: "Choose a support topic." };
  }

  if (subject.length < 4 || subject.length > 120) {
    return { ok: false, error: "Use a subject between 4 and 120 characters." };
  }

  if (message.length < 20 || message.length > 2000) {
    return { ok: false, error: "Use a message between 20 and 2000 characters." };
  }

  return {
    ok: true,
    input: {
      category: category as SupportRequestCategory,
      subject,
      message,
      contextUrl,
    },
  };
}

export async function saveSupportRequest(
  client: SupabaseClient,
  input: SupportRequestInput,
  user: Pick<User, "id" | "email">,
): Promise<SupportRequestResult> {
  const { data, error } = await client
    .from("support_requests")
    .insert({
      user_id: user.id,
      email: user.email ?? null,
      category: input.category,
      subject: input.subject,
      message: input.message,
      context_url: input.contextUrl,
    })
    .select("id, created_at")
    .single();

  if (error) throw error;

  return {
    id: String(data.id),
    createdAt: String(data.created_at),
  };
}
