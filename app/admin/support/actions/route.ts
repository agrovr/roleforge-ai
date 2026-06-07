import { NextResponse } from "next/server";

import { isSupportAdminUser, parseAdminSupportStatus, updateAdminSupportRequestStatus } from "@/app/lib/supportAdmin";
import { createRoleForgeRouteClient, withSupabaseCookies } from "@/app/lib/supabase/routeClient";
import { createRoleForgeServiceClient } from "@/app/lib/supabase/service";

const SUPPORT_REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function redirectToInbox(request: Request, result: string) {
  const url = new URL("/admin/support", request.url);
  url.searchParams.set("support", result);
  return url;
}

export async function POST(request: Request) {
  const routeClient = await createRoleForgeRouteClient();
  if (!routeClient) return NextResponse.redirect(redirectToInbox(request, "unavailable"), 303);

  const {
    data: { user },
    error,
  } = await routeClient.supabase.auth.getUser();

  if (error || !user) {
    return withSupabaseCookies(
      NextResponse.redirect(new URL("/login?next=/admin/support&account=signin-required", request.url), 303),
      routeClient.cookiesToSet,
    );
  }

  if (!isSupportAdminUser(user)) {
    return withSupabaseCookies(NextResponse.redirect(redirectToInbox(request, "denied"), 303), routeClient.cookiesToSet);
  }

  const serviceClient = createRoleForgeServiceClient();
  if (!serviceClient) {
    return withSupabaseCookies(NextResponse.redirect(redirectToInbox(request, "unavailable"), 303), routeClient.cookiesToSet);
  }

  const formData = await request.formData();
  const id = String(formData.get("id") || "").trim();
  const status = parseAdminSupportStatus(formData.get("status"));

  if (!SUPPORT_REQUEST_ID_PATTERN.test(id) || !status) {
    return withSupabaseCookies(NextResponse.redirect(redirectToInbox(request, "invalid"), 303), routeClient.cookiesToSet);
  }

  try {
    await updateAdminSupportRequestStatus(serviceClient, id, status);
    return withSupabaseCookies(NextResponse.redirect(redirectToInbox(request, "updated"), 303), routeClient.cookiesToSet);
  } catch (error) {
    console.error("Admin support status update failed", error);
    return withSupabaseCookies(NextResponse.redirect(redirectToInbox(request, "unavailable"), 303), routeClient.cookiesToSet);
  }
}
