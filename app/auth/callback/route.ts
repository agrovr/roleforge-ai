import { NextResponse, type NextRequest } from "next/server";

import { loginStatusRedirectPath } from "@/app/lib/authRedirect";
import { safeRedirectPath } from "@/app/lib/safeRedirect";
import { createRoleForgeRouteClient, withSupabaseCookies } from "@/app/lib/supabase/routeClient";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const authError = url.searchParams.get("error_code") ?? url.searchParams.get("error");
  const authErrorDescription = url.searchParams.get("error_description");
  const next = safeRedirectPath(url.searchParams.get("next"));
  const redirectTo = new URL(next, url.origin);

  if (authError) {
    return NextResponse.redirect(
      new URL(loginStatusRedirectPath(next, "signin-error", authErrorDescription || authError), url.origin),
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL(loginStatusRedirectPath(next, "signin-error"), url.origin));
  }

  const routeClient = await createRoleForgeRouteClient();
  if (!routeClient) {
    return NextResponse.redirect(new URL(loginStatusRedirectPath(next, "account-not-configured"), url.origin));
  }

  const { error } = await routeClient.supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return withSupabaseCookies(
      NextResponse.redirect(
        new URL(loginStatusRedirectPath(next, "signin-error", error.message), url.origin),
      ),
      routeClient.cookiesToSet,
    );
  } else {
    redirectTo.searchParams.set("account", "connected");
  }

  return withSupabaseCookies(NextResponse.redirect(redirectTo), routeClient.cookiesToSet);
}
