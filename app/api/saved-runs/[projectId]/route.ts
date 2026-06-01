import { NextResponse } from "next/server";

import { withAccountDatabase } from "@/app/lib/supabase/accountDatabase";
import { createRoleForgeRouteClient, withSupabaseCookies } from "@/app/lib/supabase/routeClient";
import { parseSavedProjectId, parseSavedProjectRenameInput, parseSavedProjectStatusInput } from "@/app/lib/supabase/savedProjectInput";
import { deleteSavedProject, renameSavedProject, updateSavedProjectStatus } from "@/app/lib/supabase/savedProjects";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

async function requireAccount() {
  const routeClient = await createRoleForgeRouteClient();

  if (!routeClient) {
    return {
      error: NextResponse.json({ error: "Saved projects are temporarily unavailable." }, { status: 503 }),
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

  return { routeClient, user };
}

export async function PATCH(request: Request, context: RouteContext) {
  const account = await requireAccount();
  if ("error" in account) return account.error;

  const projectIdParam = parseSavedProjectId((await context.params).projectId);
  if (!projectIdParam.ok) {
    return withSupabaseCookies(
      NextResponse.json({ error: projectIdParam.error }, { status: 400 }),
      account.routeClient.cookiesToSet,
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return withSupabaseCookies(
      NextResponse.json({ error: "Project name is required." }, { status: 400 }),
      account.routeClient.cookiesToSet,
    );
  }

  const parsedStatusInput = parseSavedProjectStatusInput(payload);
  if (parsedStatusInput.ok) {
    try {
      const status = await withAccountDatabase(
        account.routeClient.supabase,
        (dbClient) => updateSavedProjectStatus(dbClient, projectIdParam.projectId, parsedStatusInput.status, account.user.id),
        { label: "Saved project status database operation" },
      );
      return withSupabaseCookies(NextResponse.json({ status }), account.routeClient.cookiesToSet);
    } catch (error) {
      console.error("Saved project status update failed", error);
      return withSupabaseCookies(
        NextResponse.json({ error: "Project stage could not be saved." }, { status: 500 }),
        account.routeClient.cookiesToSet,
      );
    }
  }
  if (payload && typeof payload === "object" && "status" in payload) {
    return withSupabaseCookies(
      NextResponse.json({ error: parsedStatusInput.error }, { status: 400 }),
      account.routeClient.cookiesToSet,
    );
  }

  const parsedInput = parseSavedProjectRenameInput(payload);
  if (!parsedInput.ok) {
    return withSupabaseCookies(
      NextResponse.json({ error: parsedInput.error }, { status: 400 }),
      account.routeClient.cookiesToSet,
    );
  }

  try {
    const title = await withAccountDatabase(
      account.routeClient.supabase,
      (dbClient) => renameSavedProject(dbClient, projectIdParam.projectId, parsedInput.title, account.user.id),
      { label: "Saved project rename database operation" },
    );
    return withSupabaseCookies(NextResponse.json({ title }), account.routeClient.cookiesToSet);
  } catch (error) {
    console.error("Saved project rename failed", error);
    return withSupabaseCookies(
      NextResponse.json({ error: "Project name could not be saved." }, { status: 500 }),
      account.routeClient.cookiesToSet,
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const account = await requireAccount();
  if ("error" in account) return account.error;

  const projectIdParam = parseSavedProjectId((await context.params).projectId);
  if (!projectIdParam.ok) {
    return withSupabaseCookies(
      NextResponse.json({ error: projectIdParam.error }, { status: 400 }),
      account.routeClient.cookiesToSet,
    );
  }

  try {
    await withAccountDatabase(
      account.routeClient.supabase,
      (dbClient) => deleteSavedProject(dbClient, projectIdParam.projectId, account.user.id),
      { label: "Saved project delete database operation" },
    );
    return withSupabaseCookies(NextResponse.json({ ok: true }), account.routeClient.cookiesToSet);
  } catch (error) {
    console.error("Saved project delete failed", error);
    return withSupabaseCookies(
      NextResponse.json({ error: "Saved project could not be deleted." }, { status: 500 }),
      account.routeClient.cookiesToSet,
    );
  }
}
