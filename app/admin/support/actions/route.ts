import { NextResponse } from "next/server";

import { isSupportAdminUser, parseAdminSupportStatus, updateAdminSupportRequestStatus } from "@/app/lib/supportAdmin";
import { createRoleForgeRouteClient, withSupabaseCookies } from "@/app/lib/supabase/routeClient";
import { createRoleForgeServiceClient } from "@/app/lib/supabase/service";

const SUPPORT_REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function redirectToInbox(request: Request, result: string, returnStatus?: string) {
  const url = new URL("/admin/support", request.url);
  url.searchParams.set("support", result);
  const normalizedReturnStatus = returnStatus === "all" ? "all" : parseAdminSupportStatus(returnStatus);
  if (normalizedReturnStatus) url.searchParams.set("status", normalizedReturnStatus);
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
  const version = String(formData.get("version") || "").trim();
  const returnStatus = String(formData.get("returnStatus") || "").trim();
  const status = parseAdminSupportStatus(formData.get("status"));

  if (!SUPPORT_REQUEST_ID_PATTERN.test(id) || !version || !status) {
    return withSupabaseCookies(NextResponse.redirect(redirectToInbox(request, "invalid", returnStatus), 303), routeClient.cookiesToSet);
  }

  try {
    const updated = await updateAdminSupportRequestStatus(serviceClient, id, status, { expectedUpdatedAt: version });
    return withSupabaseCookies(NextResponse.redirect(redirectToInbox(request, updated ? "updated" : "stale", returnStatus), 303), routeClient.cookiesToSet);
  } catch (error) {
    console.error("Admin support status update failed", error);
    return withSupabaseCookies(NextResponse.redirect(redirectToInbox(request, "unavailable", returnStatus), 303), routeClient.cookiesToSet);
  }
}
