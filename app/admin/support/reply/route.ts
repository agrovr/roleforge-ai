import { NextResponse } from "next/server";

import {
  isSupportAdminUser,
  loadAdminSupportRequest,
  parseAdminSupportStatus,
  updateAdminSupportRequestStatus,
} from "@/app/lib/supportAdmin";
import { sendSupportReplyEmail } from "@/app/lib/supportNotifications";
import { createRoleForgeRouteClient, withSupabaseCookies } from "@/app/lib/supabase/routeClient";
import { createRoleForgeServiceClient } from "@/app/lib/supabase/service";

const SUPPORT_REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function redirectToInbox(request: Request, result: string) {
  const url = new URL("/admin/support", request.url);
  url.searchParams.set("support", result);
  return url;
}

function normalizeReplyMessage(value: FormDataEntryValue | null) {
  const message = typeof value === "string"
    ? value.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
    : "";
  return message.length >= 12 && message.length <= 2000 ? message : "";
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
  const message = normalizeReplyMessage(formData.get("message"));
  const nextStatus = parseAdminSupportStatus(formData.get("nextStatus")) ?? "reviewing";

  if (!SUPPORT_REQUEST_ID_PATTERN.test(id) || !message || !["reviewing", "closed"].includes(nextStatus)) {
    return withSupabaseCookies(NextResponse.redirect(redirectToInbox(request, "invalid"), 303), routeClient.cookiesToSet);
  }

  try {
    const supportRequest = await loadAdminSupportRequest(serviceClient, id);
    const sent = await sendSupportReplyEmail({
      to: supportRequest.email,
      subject: supportRequest.subject,
      message,
      reference: supportRequest.referenceLabel,
    });

    if (sent.status !== "sent") {
      return withSupabaseCookies(NextResponse.redirect(redirectToInbox(request, "reply-unavailable"), 303), routeClient.cookiesToSet);
    }

    await updateAdminSupportRequestStatus(serviceClient, id, nextStatus);
    return withSupabaseCookies(NextResponse.redirect(redirectToInbox(request, "reply-sent"), 303), routeClient.cookiesToSet);
  } catch (error) {
    console.error("Admin support reply failed", error);
    return withSupabaseCookies(NextResponse.redirect(redirectToInbox(request, "unavailable"), 303), routeClient.cookiesToSet);
  }
}
