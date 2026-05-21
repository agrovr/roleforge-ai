import assert from "node:assert/strict";
import test from "node:test";

import type { SupabaseClient } from "@supabase/supabase-js";

import { withAccountDatabase } from "./accountDatabase";

test("uses the signed-in account client first", async () => {
  const accountClient = { name: "account" } as unknown as SupabaseClient;
  const serviceClient = { name: "service" } as unknown as SupabaseClient;
  const seen: SupabaseClient[] = [];

  const result = await withAccountDatabase(
    accountClient,
    async (client) => {
      seen.push(client);
      return "ok";
    },
    { label: "saved projects", serviceClientFactory: () => serviceClient },
  );

  assert.equal(result, "ok");
  assert.deepEqual(seen, [accountClient]);
});

test("falls back to the service client when the account client cannot read", async () => {
  const accountClient = { name: "account" } as unknown as SupabaseClient;
  const serviceClient = { name: "service" } as unknown as SupabaseClient;
  const seen: SupabaseClient[] = [];

  const result = await withAccountDatabase(
    accountClient,
    async (client) => {
      seen.push(client);
      if (client === accountClient) throw new Error("rls blocked");
      return "service-ok";
    },
    { label: "saved projects", serviceClientFactory: () => serviceClient },
  );

  assert.equal(result, "service-ok");
  assert.deepEqual(seen, [accountClient, serviceClient]);
});

test("preserves the account-client error when no service fallback is configured", async () => {
  const accountClient = { name: "account" } as unknown as SupabaseClient;

  await assert.rejects(
    withAccountDatabase(
      accountClient,
      async () => {
        throw new Error("account failed");
      },
      { label: "saved projects", serviceClientFactory: () => null },
    ),
    /account failed/,
  );
});
