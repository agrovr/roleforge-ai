export type AccountIdentitySource = {
  app_metadata?: {
    provider?: unknown;
    providers?: unknown;
  } | null;
  confirmed_at?: string | null;
  created_at?: string | null;
  email?: string | null;
  email_confirmed_at?: string | null;
  last_sign_in_at?: string | null;
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

export function accountReference(value: unknown) {
  const raw = cleanMetadataString(value).toUpperCase();
  const token = raw.replace(/[^A-Z0-9]/g, "").slice(-6);
  return token ? `RF-ACCT-${token.padStart(6, "0")}` : "RF-ACCT-ACCOUNT";
}

const PROVIDER_LABELS: Record<string, string> = {
  apple: "Apple",
  azure: "Microsoft",
  bitbucket: "Bitbucket",
  discord: "Discord",
  email: "Email",
  facebook: "Facebook",
  figma: "Figma",
  github: "GitHub",
  gitlab: "GitLab",
  google: "Google",
  linkedin: "LinkedIn",
  notion: "Notion",
  phone: "Phone",
  slack: "Slack",
  spotify: "Spotify",
  sso: "SSO",
  twitter: "X",
  workos: "WorkOS",
};

function providerLabel(provider: string) {
  const normalized = provider.toLowerCase();
  return PROVIDER_LABELS[normalized] ?? provider
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
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

export function accountSignInMethodLabel(user: AccountIdentitySource | null | undefined) {
  const rawProviders = user?.app_metadata?.providers;
  const providers = Array.isArray(rawProviders)
    ? rawProviders.map(cleanMetadataString).filter(Boolean)
    : [];
  const firstProvider = cleanMetadataString(user?.app_metadata?.provider);
  const uniqueProviders = [...new Set((providers.length ? providers : [firstProvider]).filter(Boolean))];

  if (!uniqueProviders.length && user?.email) return "Email";
  if (!uniqueProviders.length) return "Not recorded";

  return uniqueProviders.map(providerLabel).join(" + ");
}

export function accountEmailVerificationLabel(user: AccountIdentitySource | null | undefined) {
  if (!user?.email) return "No email";
  return user.email_confirmed_at || user.confirmed_at ? "Confirmed" : "Pending confirmation";
}

export function accountSecurityDateLabel(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
