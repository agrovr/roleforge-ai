export type AccountIdentitySource = {
  email?: string | null;
  user_metadata?: {
    name?: unknown;
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
