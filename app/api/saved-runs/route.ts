import { NextResponse } from "next/server";

import { createRoleForgeRouteClient, withSupabaseCookies } from "@/app/lib/supabase/routeClient";
import { createRoleForgeServiceClient } from "@/app/lib/supabase/service";
import { loadSavedRuns, saveCompletedRun, type CompletedRunSaveInput } from "@/app/lib/supabase/savedProjects";

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
        NextResponse.json({ error: "Sign in again to refresh saved projects." }, { status: 401 }),
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
    const dbClient = createRoleForgeServiceClient() ?? account.routeClient.supabase;
    const runs = await loadSavedRuns(dbClient, account.user.id);
    return withSupabaseCookies(NextResponse.json({ runs }), account.routeClient.cookiesToSet);
  } catch {
    return withSupabaseCookies(
      NextResponse.json({ error: "Saved projects could not refresh." }, { status: 500 }),
      account.routeClient.cookiesToSet,
    );
  }
}

export async function POST(request: Request) {
  const account = await requireAccount();
  if ("error" in account) return account.error;

  try {
    const input = (await request.json()) as CompletedRunSaveInput;
    const dbClient = createRoleForgeServiceClient() ?? account.routeClient.supabase;
    const savedRun = await saveCompletedRun(dbClient, input, account.user);
    return withSupabaseCookies(NextResponse.json(savedRun), account.routeClient.cookiesToSet);
  } catch {
    return withSupabaseCookies(
      NextResponse.json({ error: "This run could not be saved to your account." }, { status: 500 }),
      account.routeClient.cookiesToSet,
    );
  }
}
