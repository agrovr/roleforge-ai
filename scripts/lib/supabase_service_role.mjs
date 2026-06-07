import { spawnSync } from "node:child_process";

export const DEFAULT_SUPABASE_PROJECT_REF = "ijdspodwpkuhwszmvqip";

export function firstNonEmptyEnv(env, ...names) {
  for (const name of names) {
    const value = env?.[name]?.trim();
    if (value) return value;
  }
  return "";
}

function runNpxSupabase(args, { cwd = process.cwd(), runner = spawnSync } = {}) {
  if (process.platform === "win32") {
    return runner("cmd.exe", ["/d", "/s", "/c", "npx", "supabase", ...args], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  }

  return runner("npx", ["supabase", ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

export function extractServiceRoleKeyFromApiKeysJson(value = "") {
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Supabase CLI did not return valid API key JSON.");
  }

  const keys = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.api_keys) ? parsed.api_keys : [];
  const serviceRole = keys.find((key) => key?.id === "service_role" || key?.name === "service_role");
  const apiKey = serviceRole?.api_key || serviceRole?.apiKey || serviceRole?.key || "";
  if (!apiKey) throw new Error("Supabase CLI output did not include a service_role API key.");
  return String(apiKey);
}

export function resolveSupabaseServiceRoleKey({
  env = process.env,
  allowCli = true,
  projectRef = DEFAULT_SUPABASE_PROJECT_REF,
  cwd = process.cwd(),
  runner,
} = {}) {
  const fromEnv = firstNonEmptyEnv(env, "ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY");
  if (fromEnv) return { key: fromEnv, source: "env" };

  if (!allowCli) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY or ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY is required.");
  }

  const result = runNpxSupabase(["projects", "api-keys", "--project-ref", projectRef, "--output", "json"], { cwd, runner });
  const exitCode = Number.isInteger(result.status) ? result.status : result.error ? 1 : 0;
  if (exitCode !== 0) {
    throw new Error("Could not resolve Supabase service-role key. Set ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SERVICE_ROLE_KEY, or run `npx supabase login`.");
  }

  return {
    key: extractServiceRoleKeyFromApiKeysJson(result.stdout || ""),
    source: "supabase-cli",
  };
}
