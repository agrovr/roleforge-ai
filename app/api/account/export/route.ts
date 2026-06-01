import { NextResponse } from "next/server";

import { accountExportFilename, loadAccountExportData } from "@/app/lib/accountExport";
import { loadAccountEntitlement } from "@/app/lib/entitlements";
import { withAccountDatabase } from "@/app/lib/supabase/accountDatabase";
import { createRoleForgeRouteClient, withSupabaseCookies } from "@/app/lib/supabase/routeClient";
import { loadAccountUsage } from "@/app/lib/usage";

export const dynamic = "force-dynamic";

export async function GET() {
  const routeClient = await createRoleForgeRouteClient();

  if (!routeClient) {
    return NextResponse.json({ error: "Account export is temporarily unavailable." }, { status: 503 });
  }

  const {
    data: { user },
    error,
  } = await routeClient.supabase.auth.getUser();

  if (error || !user) {
    return withSupabaseCookies(
      NextResponse.json({ error: "Sign in again to download your account summary." }, { status: 401 }),
      routeClient.cookiesToSet,
    );
  }

  try {
    const entitlement = await loadAccountEntitlement(routeClient.supabase, user.id);
    const usage = await loadAccountUsage(routeClient.supabase, user.id, entitlement);
    const payload = await withAccountDatabase(
      routeClient.supabase,
      (dbClient) => loadAccountExportData(dbClient, user, entitlement, usage),
      { label: "Account export database operation" },
    );
    const body = JSON.stringify(payload, null, 2);
    const response = new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${accountExportFilename(user.email)}"`,
      },
    });

    return withSupabaseCookies(response, routeClient.cookiesToSet);
  } catch (exportError) {
    console.error("Account export failed", exportError);
    return withSupabaseCookies(
      NextResponse.json({ error: "Your account summary is taking a moment to prepare." }, { status: 500 }),
      routeClient.cookiesToSet,
    );
  }
}
