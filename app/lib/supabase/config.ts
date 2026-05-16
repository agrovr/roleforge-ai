export type SupabasePublicConfig = {
  configured: boolean;
  missing: string[];
  publishableKey: string;
  url: string;
};

export function getSupabaseConfig(): SupabasePublicConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    "";
  const missing = [
    !url ? "NEXT_PUBLIC_SUPABASE_URL" : "",
    !publishableKey ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY" : "",
  ].filter(Boolean);

  return {
    configured: missing.length === 0,
    missing,
    publishableKey,
    url,
  };
}
