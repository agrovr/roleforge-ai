import { NextResponse, type NextRequest } from "next/server";

import { safeRedirectPath } from "@/app/lib/safeRedirect";
import { createRoleForgeServerClient } from "@/app/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = safeRedirectPath(url.searchParams.get("next"));
  const redirectTo = new URL(next, url.origin);

  if (!code) {
    redirectTo.searchParams.set("account", "signin-error");
    return NextResponse.redirect(redirectTo);
  }

  const supabase = await createRoleForgeServerClient();
  if (!supabase) {
    redirectTo.searchParams.set("account", "account-not-configured");
    return NextResponse.redirect(redirectTo);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  redirectTo.searchParams.set("account", error ? "signin-error" : "connected");

  return NextResponse.redirect(redirectTo);
}
