import type { SupabaseClient } from "@supabase/supabase-js";

export type AccountProfile = {
  displayName: string;
  email: string;
  communicationPreferences: CommunicationPreferences;
  updatedAt: string;
};

export type CommunicationPreferences = {
  productUpdates: boolean;
};

export type AccountProfileUser = {
  id: string;
  email?: string | null;
};

const MAX_DISPLAY_NAME_LENGTH = 80;
export const DEFAULT_COMMUNICATION_PREFERENCES: CommunicationPreferences = {
  productUpdates: false,
};

type ProfileRow = {
  display_name: string | null;
  email: string | null;
  communication_preferences?: unknown;
  updated_at: string | null;
};

export function normalizeProfileDisplayName(value: unknown) {
  if (typeof value !== "string") return "";
  const cleanName = value.replace(/\s+/g, " ").trim();
  if (cleanName.length > MAX_DISPLAY_NAME_LENGTH) {
    throw new Error(`Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer.`);
  }
  return cleanName;
}

export function normalizeCommunicationPreferences(value: unknown): CommunicationPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_COMMUNICATION_PREFERENCES };
  }

  const record = value as Record<string, unknown>;
  return {
    productUpdates: record.productUpdates === true,
  };
}

function profileFromRow(row: ProfileRow): AccountProfile {
  return {
    displayName: row.display_name ?? "",
    email: row.email ?? "",
    communicationPreferences: normalizeCommunicationPreferences(row.communication_preferences),
    updatedAt: row.updated_at ?? "",
  };
}

export async function loadAccountProfile(client: SupabaseClient, userId: string): Promise<AccountProfile | null> {
  const result = await client
    .from("profiles")
    .select("display_name, email, communication_preferences, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (!result.error && result.data) {
    return profileFromRow(result.data as ProfileRow);
  }

  const fallback = await client
    .from("profiles")
    .select("display_name, email, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (fallback.error || !fallback.data) return null;

  return profileFromRow(fallback.data as ProfileRow);
}

export async function saveAccountProfile(
  client: SupabaseClient,
  user: AccountProfileUser,
  input: { displayName: unknown },
) {
  const displayName = normalizeProfileDisplayName(input.displayName);
  const updatedAt = new Date().toISOString();

  const { error: profileError } = await client.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      display_name: displayName || null,
      updated_at: updatedAt,
    },
    { onConflict: "id" },
  );

  if (profileError) throw profileError;

  const { error: authError } = await client.auth.updateUser({
    data: { name: displayName || null },
  });

  if (authError) throw authError;

  return {
    displayName,
    updatedAt,
  };
}

export async function saveCommunicationPreferences(
  client: SupabaseClient,
  user: AccountProfileUser,
  preferences: CommunicationPreferences,
) {
  const normalized = normalizeCommunicationPreferences(preferences);
  const updatedAt = new Date().toISOString();

  const { error } = await client.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      communication_preferences: normalized,
      updated_at: updatedAt,
    },
    { onConflict: "id" },
  );

  if (error) throw error;

  return {
    communicationPreferences: normalized,
    updatedAt,
  };
}
