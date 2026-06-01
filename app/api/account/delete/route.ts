import { NextResponse, type NextRequest } from "next/server";

import { accountDeletionBlockReason, validateAccountDeletionConfirmation } from "@/app/lib/accountDeletion";
import { createRoleForgeServiceClient } from "@/app/lib/supabase/service";
import { createRoleForgeRouteClient, withSupabaseCookies } from "@/app/lib/supabase/routeClient";

export const dynamic = "force-dynamic";

function redirectWithAccountStatus(request: NextRequest, status: string) {
  return NextResponse.redirect(new URL(`/settings?account=${status}#account-danger`, request.url), 303);
}

export async function POST(request: NextRequest) {
  const routeClient = await createRoleForgeRouteClient();

  if (!routeClient) {
    return redirectWithAccountStatus(request, "delete-unavailable");
  }

  const form = await request.formData();
  if (!validateAccountDeletionConfirmation(form.get("confirmation"))) {
    return withSupabaseCookies(
      redirectWithAccountStatus(request, "delete-invalid"),
      routeClient.cookiesToSet,
    );
  }

  const {
    data: { user },
    error,
  } = await routeClient.supabase.auth.getUser();

  if (error || !user) {
    return withSupabaseCookies(
      NextResponse.redirect(new URL("/login?next=/settings&account=signin-required", request.url), 303),
      routeClient.cookiesToSet,
    );
  }

  const blockReason = await accountDeletionBlockReason(routeClient.supabase, user.id);
  if (blockReason === "billing-active") {
    return withSupabaseCookies(
      redirectWithAccountStatus(request, "delete-billing-active"),
      routeClient.cookiesToSet,
    );
  }
  if (blockReason === "unavailable") {
    return withSupabaseCookies(
      redirectWithAccountStatus(request, "delete-unavailable"),
      routeClient.cookiesToSet,
    );
  }

  const serviceClient = createRoleForgeServiceClient();
  if (!serviceClient) {
    return withSupabaseCookies(
      redirectWithAccountStatus(request, "delete-unavailable"),
      routeClient.cookiesToSet,
    );
  }

  const { error: signOutError } = await routeClient.supabase.auth.signOut({ scope: "global" });
  if (signOutError) {
    return withSupabaseCookies(
      redirectWithAccountStatus(request, "delete-unavailable"),
      routeClient.cookiesToSet,
    );
  }

  const { error: deleteError } = await serviceClient.auth.admin.deleteUser(user.id, false);
  if (deleteError) {
    return withSupabaseCookies(
      redirectWithAccountStatus(request, "delete-unavailable"),
      routeClient.cookiesToSet,
    );
  }

  return withSupabaseCookies(
    NextResponse.redirect(new URL("/login?account=account-deleted", request.url), 303),
    routeClient.cookiesToSet,
  );
}
