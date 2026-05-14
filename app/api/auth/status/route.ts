import { NextResponse } from "next/server";

import { getSupabaseConfig } from "@/app/lib/supabase/config";

export function GET() {
  const config = getSupabaseConfig();

  return NextResponse.json({
    configured: config.configured,
    enabled: false,
    provider: "supabase",
    user: null,
    next: config.configured
      ? "Account routes, callback handling, row-level security, and project sync can be wired next."
      : "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY before enabling account features.",
  });
}
