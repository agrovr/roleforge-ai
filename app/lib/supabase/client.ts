import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseConfig } from "./config";

export function createRoleForgeBrowserClient() {
  const config = getSupabaseConfig();

  if (!config.configured) {
    return null;
  }

  return createBrowserClient(config.url, config.publishableKey);
}
