import type { SupabaseClient } from "@supabase/supabase-js";

import { createRoleForgeServiceClient } from "./service";

type AccountDatabaseOptions = {
  label: string;
  serviceClientFactory?: () => SupabaseClient | null;
};

export async function withAccountDatabase<T>(
  accountClient: SupabaseClient,
  action: (dbClient: SupabaseClient) => Promise<T>,
  options: AccountDatabaseOptions,
) {
  try {
    return await action(accountClient);
  } catch (accountClientError) {
    const serviceClient = (options.serviceClientFactory ?? createRoleForgeServiceClient)();
    if (!serviceClient) throw accountClientError;

    try {
      return await action(serviceClient);
    } catch (serviceClientError) {
      console.error(`${options.label} failed`, serviceClientError);
      throw serviceClientError;
    }
  }
}
