export type SupabasePublicConfig = {
  configured: boolean;
  missing: string[];
  publishableKey: string;
  url: string;
};

const requiredPublicEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
] as const;

export function getSupabaseConfig(): SupabasePublicConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
  const missing = requiredPublicEnv.filter((key) => !process.env[key]?.trim());

  return {
    configured: missing.length === 0,
    missing,
    publishableKey,
    url,
  };
}
