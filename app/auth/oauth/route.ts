import { NextResponse, type NextRequest } from "next/server";
import type { Provider } from "@supabase/supabase-js";

import { loginStatusRedirectPath } from "@/app/lib/authRedirect";
import { safeRedirectPath } from "@/app/lib/safeRedirect";
import { getRequestOrigin } from "@/app/lib/siteUrl";
import { createRoleForgeRouteClient, withSupabaseCookies } from "@/app/lib/supabase/routeClient";

const supportedOAuthProviders = new Set<Provider>(["google"]);

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const provider = url.searchParams.get("provider") as Provider | null;
  const next = safeRedirectPath(url.searchParams.get("next"));

  if (!provider || !supportedOAuthProviders.has(provider)) {
    return NextResponse.redirect(new URL(loginStatusRedirectPath(next, "signin-error"), url.origin));
  }

  const routeClient = await createRoleForgeRouteClient();
  if (!routeClient) {
    return NextResponse.redirect(new URL(loginStatusRedirectPath(next, "account-not-configured"), url.origin));
  }

  const origin = getRequestOrigin(request.url);
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const { data, error } = await routeClient.supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(
      new URL(loginStatusRedirectPath(next, "signin-error", error?.message), url.origin),
    );
  }

  return withSupabaseCookies(NextResponse.redirect(data.url), routeClient.cookiesToSet);
}
