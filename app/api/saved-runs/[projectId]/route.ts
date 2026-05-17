import { NextResponse } from "next/server";

import { createRoleForgeRouteClient, withSupabaseCookies } from "@/app/lib/supabase/routeClient";
import { deleteSavedProject, renameSavedProject } from "@/app/lib/supabase/savedProjects";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

async function requireAccount() {
  const routeClient = await createRoleForgeRouteClient();

  if (!routeClient) {
    return {
      error: NextResponse.json({ error: "Account sync is not enabled yet." }, { status: 503 }),
    };
  }

  const {
    data: { user },
    error,
  } = await routeClient.supabase.auth.getUser();

  if (error || !user) {
    return {
      error: withSupabaseCookies(
        NextResponse.json({ error: "Sign in again to manage saved projects." }, { status: 401 }),
        routeClient.cookiesToSet,
      ),
    };
  }

  return { routeClient };
}

export async function PATCH(request: Request, context: RouteContext) {
  const account = await requireAccount();
  if ("error" in account) return account.error;

  const { projectId } = await context.params;

  try {
    const payload = (await request.json()) as { title?: string };
    const title = await renameSavedProject(account.routeClient.supabase, projectId, payload.title ?? "");
    return withSupabaseCookies(NextResponse.json({ title }), account.routeClient.cookiesToSet);
  } catch {
    return withSupabaseCookies(
      NextResponse.json({ error: "Project name could not be saved." }, { status: 500 }),
      account.routeClient.cookiesToSet,
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const account = await requireAccount();
  if ("error" in account) return account.error;

  const { projectId } = await context.params;

  try {
    await deleteSavedProject(account.routeClient.supabase, projectId);
    return withSupabaseCookies(NextResponse.json({ ok: true }), account.routeClient.cookiesToSet);
  } catch {
    return withSupabaseCookies(
      NextResponse.json({ error: "Saved project could not be deleted." }, { status: 500 }),
      account.routeClient.cookiesToSet,
    );
  }
}
