import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { getSupabaseConfig } from "@/app/lib/supabase/config";

export async function proxy(request: NextRequest) {
  const config = getSupabaseConfig();

  if (!config.configured) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headersToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headersToSet ?? {}).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });

  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims?.sub && request.nextUrl.pathname.startsWith("/app")) {
    const signInUrl = new URL("/login", request.url);
    signInUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    signInUrl.searchParams.set("account", "signin-required");
    return NextResponse.redirect(signInUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
