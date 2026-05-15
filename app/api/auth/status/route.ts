import { NextResponse } from "next/server";

import { getSupabaseConfig } from "@/app/lib/supabase/config";
import { createRoleForgeServerClient } from "@/app/lib/supabase/server";

export async function GET() {
  const config = getSupabaseConfig();

  if (!config.configured) {
    return NextResponse.json({
      configured: false,
      enabled: false,
      provider: "supabase",
      user: null,
      next: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY before enabling account features.",
    });
  }

  const supabase = await createRoleForgeServerClient();
  const { data, error } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null }, error: null };
  const user = !error && data.user
    ? {
        id: data.user.id,
        email: data.user.email ?? "",
        name: typeof data.user.user_metadata?.name === "string" ? data.user.user_metadata.name : "",
      }
    : null;

  return NextResponse.json({
    configured: true,
    enabled: true,
    provider: "supabase",
    user,
    next: user
      ? "Saved projects sync to your account when a completed run is available."
      : "Use email or Google sign-in to sync completed runs to saved projects.",
  });
}
