export type AccountIdentitySource = {
  email?: string | null;
  user_metadata?: {
    avatar_url?: unknown;
    name?: unknown;
    picture?: unknown;
    full_name?: unknown;
  } | null;
};

function cleanMetadataString(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export function accountDisplayName(
  user: AccountIdentitySource | null | undefined,
  profileDisplayName?: string | null,
) {
  return (
    cleanMetadataString(profileDisplayName) ||
    cleanMetadataString(user?.user_metadata?.name) ||
    cleanMetadataString(user?.user_metadata?.full_name)
  );
}

export function accountAvatarUrl(user: AccountIdentitySource | null | undefined) {
  const rawUrl = cleanMetadataString(user?.user_metadata?.avatar_url) || cleanMetadataString(user?.user_metadata?.picture);
  if (!rawUrl) return "";

  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}
