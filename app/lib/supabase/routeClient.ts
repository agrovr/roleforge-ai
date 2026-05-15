import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { getSupabaseConfig } from "./config";

type SupabaseCookie = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

export async function createRoleForgeRouteClient() {
  const config = getSupabaseConfig();

  if (!config.configured) {
    return null;
  }

  const cookieStore = await cookies();
  const cookiesToSet: SupabaseCookie[] = [];

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(nextCookies) {
        cookiesToSet.push(...nextCookies);
      },
    },
  });

  return { supabase, cookiesToSet };
}

export function withSupabaseCookies(response: NextResponse, cookiesToSet: SupabaseCookie[]) {
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
