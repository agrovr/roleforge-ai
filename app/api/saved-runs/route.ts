import { NextResponse } from "next/server";

import { withAccountDatabase } from "@/app/lib/supabase/accountDatabase";
import { createRoleForgeRouteClient, withSupabaseCookies } from "@/app/lib/supabase/routeClient";
import { parseCompletedRunSaveInput } from "@/app/lib/supabase/savedProjectInput";
import { loadSavedRuns, saveCompletedRun } from "@/app/lib/supabase/savedProjects";

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
        NextResponse.json({ error: "Sign in again to load saved projects." }, { status: 401 }),
        routeClient.cookiesToSet,
      ),
    };
  }

  return { routeClient, user };
}

export async function GET() {
  const account = await requireAccount();
  if ("error" in account) return account.error;

  try {
    const runs = await withAccountDatabase(
      account.routeClient.supabase,
      (dbClient) => loadSavedRuns(dbClient, account.user.id),
      { label: "Saved projects database operation" },
    );
    return withSupabaseCookies(NextResponse.json({ runs }), account.routeClient.cookiesToSet);
  } catch (error) {
    console.error("Saved projects refresh failed", error);
    return withSupabaseCookies(
      NextResponse.json({ error: "Saved projects are taking a moment to load." }, { status: 500 }),
      account.routeClient.cookiesToSet,
    );
  }
}

export async function POST(request: Request) {
  const account = await requireAccount();
  if ("error" in account) return account.error;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return withSupabaseCookies(
      NextResponse.json({ error: "Saved project data is incomplete." }, { status: 400 }),
      account.routeClient.cookiesToSet,
    );
  }

  const parsedInput = parseCompletedRunSaveInput(payload);
  if (!parsedInput.ok) {
    return withSupabaseCookies(
      NextResponse.json({ error: parsedInput.error }, { status: 400 }),
      account.routeClient.cookiesToSet,
    );
  }

  try {
    const savedRun = await withAccountDatabase(
      account.routeClient.supabase,
      (dbClient) => saveCompletedRun(dbClient, parsedInput.input, account.user),
      { label: "Saved project save database operation" },
    );
    return withSupabaseCookies(NextResponse.json(savedRun), account.routeClient.cookiesToSet);
  } catch (error) {
    console.error("Saved project save failed", error);
    return withSupabaseCookies(
      NextResponse.json({ error: "This run could not be saved to your account." }, { status: 500 }),
      account.routeClient.cookiesToSet,
    );
  }
}
