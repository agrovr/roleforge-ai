import { NextResponse, type NextRequest } from "next/server";
import type { Provider } from "@supabase/supabase-js";

import { safeRedirectPath } from "@/app/lib/safeRedirect";
import { getRequestOrigin } from "@/app/lib/siteUrl";
import { createRoleForgeServerClient } from "@/app/lib/supabase/server";

const supportedOAuthProviders = new Set<Provider>(["google"]);

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const provider = url.searchParams.get("provider") as Provider | null;
  const next = safeRedirectPath(url.searchParams.get("next"));
  const fallback = new URL(next, url.origin);

  if (!provider || !supportedOAuthProviders.has(provider)) {
    fallback.searchParams.set("account", "signin-error");
    return NextResponse.redirect(fallback);
  }

  const supabase = await createRoleForgeServerClient();
  if (!supabase) {
    fallback.searchParams.set("account", "account-not-configured");
    return NextResponse.redirect(fallback);
  }

  const origin = getRequestOrigin(request.url);
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
    },
  });

  if (error || !data.url) {
    fallback.searchParams.set("account", "signin-error");
    return NextResponse.redirect(fallback);
  }

  return NextResponse.redirect(data.url);
}
