import type { SupabaseClient } from "@supabase/supabase-js";

export type AccountProfile = {
  displayName: string;
  email: string;
  updatedAt: string;
};

export type AccountProfileUser = {
  id: string;
  email?: string | null;
};

const MAX_DISPLAY_NAME_LENGTH = 80;

type ProfileRow = {
  display_name: string | null;
  email: string | null;
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

export async function loadAccountProfile(client: SupabaseClient, userId: string): Promise<AccountProfile | null> {
  const { data, error } = await client
    .from("profiles")
    .select("display_name, email, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as ProfileRow;
  return {
    displayName: row.display_name ?? "",
    email: row.email ?? "",
    updatedAt: row.updated_at ?? "",
  };
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
