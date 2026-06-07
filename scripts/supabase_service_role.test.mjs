import assert from "node:assert/strict";
import test from "node:test";

import {
  extractServiceRoleKeyFromApiKeysJson,
  firstNonEmptyEnv,
  resolveSupabaseServiceRoleKey,
} from "./lib/supabase_service_role.mjs";

test("reads the first available service-role environment value", () => {
  assert.equal(firstNonEmptyEnv({ A: "", B: "  secret-value  " }, "A", "B"), "secret-value");
  assert.equal(firstNonEmptyEnv({ A: "" }, "A", "B"), "");
});

test("extracts service-role key from Supabase CLI JSON shapes", () => {
  assert.equal(
    extractServiceRoleKeyFromApiKeysJson(JSON.stringify([
      { id: "anon", api_key: "anon-key" },
      { id: "service_role", api_key: "service-role-key" },
    ])),
    "service-role-key",
  );
  assert.equal(
    extractServiceRoleKeyFromApiKeysJson(JSON.stringify({
      api_keys: [{ name: "service_role", key: "nested-service-role-key" }],
    })),
    "nested-service-role-key",
  );
  assert.throws(() => extractServiceRoleKeyFromApiKeysJson("not-json"), /valid API key JSON/);
  assert.throws(() => extractServiceRoleKeyFromApiKeysJson("[]"), /service_role API key/);
});

test("resolves from env before attempting Supabase CLI", () => {
  let called = false;
  const result = resolveSupabaseServiceRoleKey({
    env: { ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY: "env-service-key" },
    runner: () => {
      called = true;
    },
  });

  assert.deepEqual(result, { key: "env-service-key", source: "env" });
  assert.equal(called, false);
});

test("resolves from Supabase CLI without printing the key", () => {
  const calls = [];
  const result = resolveSupabaseServiceRoleKey({
    env: {},
    projectRef: "project-ref",
    runner(command, args) {
      calls.push({ command, args });
      return {
        status: 0,
        stdout: JSON.stringify([{ id: "service_role", api_key: "cli-service-key" }]),
        stderr: "",
      };
    },
  });

  assert.equal(result.key, "cli-service-key");
  assert.equal(result.source, "supabase-cli");
  assert.deepEqual(calls[0]?.args.slice(-5), ["api-keys", "--project-ref", "project-ref", "--output", "json"]);
});

test("fails closed when explicit env mode is requested", () => {
  assert.throws(
    () => resolveSupabaseServiceRoleKey({ env: {}, allowCli: false }),
    /SUPABASE_SERVICE_ROLE_KEY/,
  );
});
