#!/usr/bin/env node

import { pathToFileURL } from "node:url";

import { createClient } from "@supabase/supabase-js";

import { resolveSupabaseServiceRoleKey } from "./lib/supabase_service_role.mjs";
import { supportRequestReference } from "./list_support_requests.mjs";

const DEFAULT_SUPABASE_URL = "https://ijdspodwpkuhwszmvqip.supabase.co";
const SUPPORT_STATUSES = new Set(["open", "reviewing", "closed"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readValueArg(argv, index, name, inlineValue) {
  const value = inlineValue ?? argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  return value;
}

function normalizeReference(value = "") {
  return supportRequestReference(value);
}

function isUuid(value = "") {
  return UUID_PATTERN.test(String(value).trim());
}

export function parseArgs(argv) {
  const options = {
    id: "",
    reference: "",
    status: "",
    dryRun: false,
    json: false,
    showId: false,
    searchLimit: 500,
    supabaseCli: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const equalsIndex = arg.indexOf("=");
    const name = equalsIndex >= 0 ? arg.slice(0, equalsIndex) : arg;
    const inlineValue = equalsIndex >= 0 ? arg.slice(equalsIndex + 1) : undefined;

    if (name === "--help" || name === "-h") {
      options.help = true;
      continue;
    }
    if (name === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (name === "--json") {
      options.json = true;
      continue;
    }
    if (name === "--show-id") {
      options.showId = true;
      continue;
    }
    if (name === "--no-supabase-cli") {
      options.supabaseCli = false;
      continue;
    }
    if (["--id", "--reference", "--status", "--search-limit"].includes(name)) {
      const value = readValueArg(argv, index, name, inlineValue);
      if (name === "--id") {
        if (!isUuid(value)) throw new Error("--id must be a full support request UUID.");
        options.id = value.trim();
      }
      if (name === "--reference") options.reference = normalizeReference(value);
      if (name === "--status") {
        if (!SUPPORT_STATUSES.has(value)) throw new Error("--status must be open, reviewing, or closed.");
        options.status = value;
      }
      if (name === "--search-limit") {
        const parsed = Number.parseInt(String(value), 10);
        if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 1000) {
          throw new Error("--search-limit must be an integer from 1 to 1000.");
        }
        options.searchLimit = parsed;
      }
      if (inlineValue === undefined) index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.help) {
    if (!options.status) throw new Error("--status is required.");
    if (Boolean(options.id) === Boolean(options.reference)) throw new Error("Provide exactly one of --id or --reference.");
  }

  return options;
}

function printHelp() {
  console.log(`RoleForge AI support status updater

Usage:
  npm run support:status -- --reference RF-70A225 --status reviewing
  npm run support:status -- --id 4adcd15a-769a-4c2f-939f-09df6e70a225 --status closed
  npm run support:status -- --reference RF-70A225 --status reviewing --dry-run

Required environment:
  SUPABASE_SERVICE_ROLE_KEY or ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY,
  or a logged-in Supabase CLI session

Optional environment:
  ROLEFORGE_SUPABASE_URL

This command updates only support_requests.status and updated_at.
It does not print ticket messages, subjects, emails, or service-role secrets.
Use --no-supabase-cli to require an explicit service-role environment variable.
References are resolved from recent tickets and fail closed if ambiguous.`);
}

function createServiceClient({ supabaseUrl, serviceRoleKey, allowCli }) {
  const resolved = serviceRoleKey
    ? { key: serviceRoleKey, source: "env" }
    : resolveSupabaseServiceRoleKey({ allowCli });
  return createClient(supabaseUrl, resolved.key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function resolveSupportRequestId(client, { id = "", reference = "", searchLimit = 500 } = {}) {
  if (id) return id;
  const normalizedReference = normalizeReference(reference);
  const { data, error } = await client
    .from("support_requests")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(searchLimit);

  if (error) throw new Error(`Could not resolve support request reference: ${error.message}`);

  const matches = (data || []).filter((row) => normalizeReference(row?.id) === normalizedReference);
  if (!matches.length) throw new Error(`No support request found for ${normalizedReference}.`);
  if (matches.length > 1) throw new Error(`${normalizedReference} matched multiple support requests; retry with --id.`);
  return String(matches[0].id);
}

function publicStatusResult(row, { dryRun = false, showId = false, requestedStatus = "" } = {}) {
  const id = String(row?.id || "");
  const result = {
    reference: supportRequestReference(id),
    status: row?.status || requestedStatus,
    dryRun,
  };
  if (row?.updated_at) result.updatedAt = row.updated_at;
  if (showId) result.id = id;
  return result;
}

export async function updateSupportRequestStatus({
  client,
  id = "",
  reference = "",
  status,
  dryRun = false,
  showId = false,
  searchLimit = 500,
  now = () => new Date().toISOString(),
} = {}) {
  if (!SUPPORT_STATUSES.has(status)) throw new Error("status must be open, reviewing, or closed.");
  const resolvedId = await resolveSupportRequestId(client, { id, reference, searchLimit });

  if (dryRun) {
    return publicStatusResult({ id: resolvedId, status }, { dryRun: true, showId, requestedStatus: status });
  }

  const { data, error } = await client
    .from("support_requests")
    .update({ status, updated_at: now() })
    .eq("id", resolvedId)
    .select("id, status, category, created_at, updated_at")
    .single();

  if (error) throw new Error(`Could not update support request status: ${error.message}`);
  if (!data?.id) throw new Error("Could not update support request status: no row returned.");
  return publicStatusResult(data, { dryRun: false, showId, requestedStatus: status });
}

function formatResult(result) {
  const prefix = result.dryRun ? "Dry run:" : "Updated:";
  const id = result.id ? ` id=${result.id}` : "";
  const updated = result.updatedAt ? ` updated_at=${result.updatedAt}` : "";
  return `${prefix} ${result.reference} status=${result.status}${id}${updated}`;
}

export async function runSupportStatusCli(argv = process.argv.slice(2), env = process.env) {
  const options = parseArgs(argv);
  if (options.help) {
    printHelp();
    return 0;
  }

  const client = createServiceClient({
    supabaseUrl: env.ROLEFORGE_SUPABASE_URL?.trim() || env.NEXT_PUBLIC_SUPABASE_URL?.trim() || DEFAULT_SUPABASE_URL,
    serviceRoleKey: env.ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
    allowCli: options.supabaseCli,
  });

  const result = await updateSupportRequestStatus({ client, ...options });
  console.log(options.json ? JSON.stringify(result, null, 2) : formatResult(result));
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await runSupportStatusCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
