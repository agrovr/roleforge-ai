import { NextResponse } from "next/server";

import { createRoleForgeRouteClient, withSupabaseCookies } from "@/app/lib/supabase/routeClient";

export const dynamic = "force-dynamic";

function authError(message: string, status: 401 | 503, cookiesToSet: Parameters<typeof withSupabaseCookies>[1] = []) {
  return withSupabaseCookies(
    NextResponse.json({ error: message }, { status }),
    cookiesToSet,
  );
}

export async function GET() {
  const routeClient = await createRoleForgeRouteClient();

  if (!routeClient) {
    return authError("Account access is temporarily unavailable. Try again shortly.", 503);
  }

  const { data: claimsData, error: claimsError } = await routeClient.supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims?.sub) {
    return authError("Sign in again to continue your resume workflow.", 401, routeClient.cookiesToSet);
  }

  const {
    data: { session },
    error: sessionError,
  } = await routeClient.supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    return authError("Sign in again to continue your resume workflow.", 401, routeClient.cookiesToSet);
  }

  return withSupabaseCookies(
    NextResponse.json({
      accessToken: session.access_token,
      expiresAt: session.expires_at ?? 0,
    }),
    routeClient.cookiesToSet,
  );
}
