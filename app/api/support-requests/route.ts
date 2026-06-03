import { NextResponse } from "next/server";

import { withAccountDatabase } from "@/app/lib/supabase/accountDatabase";
import { createRoleForgeRouteClient, withSupabaseCookies } from "@/app/lib/supabase/routeClient";
import { parseSupportRequestInput, saveSupportRequest, supportRequestReference } from "@/app/lib/supportRequests";

function supportRedirect(request: Request, status: string, reference?: string) {
  const url = new URL("/support", request.url);
  url.searchParams.set("support", status);
  if (reference) url.searchParams.set("ref", supportRequestReference(reference));
  url.hash = "request";
  return url;
}

export async function POST(request: Request) {
  const routeClient = await createRoleForgeRouteClient();
  if (!routeClient) {
    return NextResponse.redirect(supportRedirect(request, "unavailable"), 303);
  }

  const {
    data: { user },
    error,
  } = await routeClient.supabase.auth.getUser();

  if (error || !user) {
    return withSupabaseCookies(
      NextResponse.redirect(new URL("/login?next=/support&account=signin-required", request.url), 303),
      routeClient.cookiesToSet,
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return withSupabaseCookies(
      NextResponse.redirect(supportRedirect(request, "invalid"), 303),
      routeClient.cookiesToSet,
    );
  }

  const parsed = parseSupportRequestInput({
    category: formData.get("category"),
    subject: formData.get("subject"),
    message: formData.get("message"),
    contextUrl: formData.get("contextUrl"),
  });

  if (!parsed.ok) {
    return withSupabaseCookies(
      NextResponse.redirect(supportRedirect(request, "invalid"), 303),
      routeClient.cookiesToSet,
    );
  }

  try {
    const saved = await withAccountDatabase(
      routeClient.supabase,
      (dbClient) => saveSupportRequest(dbClient, parsed.input, user),
      { label: "Support request save database operation" },
    );
    return withSupabaseCookies(
      NextResponse.redirect(supportRedirect(request, "sent", saved.id), 303),
      routeClient.cookiesToSet,
    );
  } catch (saveError) {
    console.error("Support request save failed", saveError);
    return withSupabaseCookies(
      NextResponse.redirect(supportRedirect(request, "unavailable"), 303),
      routeClient.cookiesToSet,
    );
  }

}
