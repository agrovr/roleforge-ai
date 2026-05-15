import { NextResponse, type NextRequest } from "next/server";

import { safeRedirectPath } from "@/app/lib/safeRedirect";
import { createRoleForgeServerClient } from "@/app/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const authError = url.searchParams.get("error_code") ?? url.searchParams.get("error");
  const authErrorDescription = url.searchParams.get("error_description");
  const next = safeRedirectPath(url.searchParams.get("next"));
  const redirectTo = new URL(next, url.origin);

  if (authError) {
    redirectTo.searchParams.set("account", "signin-error");
    redirectTo.searchParams.set("auth_error", authErrorDescription || authError);
    return NextResponse.redirect(redirectTo);
  }

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
  if (error) {
    redirectTo.searchParams.set("account", "signin-error");
    redirectTo.searchParams.set("auth_error", error.message);
  } else {
    redirectTo.searchParams.set("account", "connected");
  }

  return NextResponse.redirect(redirectTo);
}
