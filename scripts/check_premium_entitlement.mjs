#!/usr/bin/env node

import { pathToFileURL } from "node:url";

import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://ijdspodwpkuhwszmvqip.supabase.co";
const ACTIVE_BILLING_STATUSES = new Set(["active", "trialing"]);

function firstNonEmptyEnv(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

function parseInteger(value, name) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`${name} must be a non-negative integer.`);
  return parsed;
}

function parseArgs(argv) {
  const options = {
    waitSeconds: 0,
    pollSeconds: 5,
    expect: "premium",
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
    if (["--email", "--user-id", "--wait-seconds", "--poll-seconds", "--expect"].includes(name)) {
      const value = inlineValue ?? argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
      if (name === "--email") options.email = value.trim().toLowerCase();
      if (name === "--user-id") options.userId = value.trim();
      if (name === "--wait-seconds") options.waitSeconds = parseInteger(value, "--wait-seconds");
      if (name === "--poll-seconds") options.pollSeconds = Math.max(1, parseInteger(value, "--poll-seconds"));
      if (name === "--expect") {
        if (value !== "premium" && value !== "free") throw new Error("--expect must be premium or free.");
        options.expect = value;
      }
      if (inlineValue === undefined) index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.email && !options.userId && !options.help) {
    throw new Error("Provide --email or --user-id.");
  }
  if (options.email && options.userId) {
    throw new Error("Use --email or --user-id, not both.");
  }

  return options;
}

function printHelp() {
  console.log(`RoleForge AI Premium entitlement checker

Usage:
  node scripts/check_premium_entitlement.mjs --email user@example.com
  node scripts/check_premium_entitlement.mjs --user-id <supabase-user-id> --wait-seconds 60

Required environment:
  SUPABASE_SERVICE_ROLE_KEY or ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY

Optional environment:
  ROLEFORGE_SUPABASE_URL

The script checks account_entitlements after live checkout/webhook delivery.
It does not print service-role secrets.`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function maskId(value = "") {
  if (!value) return "";
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function entitlementIsPremium(row) {
  return row?.plan === "premium" && ACTIVE_BILLING_STATUSES.has(row?.billing_status ?? "");
}

export function summarizeEntitlement(row) {
  return {
    found: Boolean(row),
    plan: row?.plan ?? "missing",
    billingStatus: row?.billing_status ?? "missing",
    premiumActive: entitlementIsPremium(row),
    stripeCustomer: row?.stripe_customer_id ? "present" : "missing",
    stripeSubscription: row?.stripe_subscription_id ? maskId(row.stripe_subscription_id) : "missing",
    currentPeriodEnd: row?.current_period_end ?? null,
    cancelAtPeriodEnd: Boolean(row?.cancel_at_period_end),
  };
}

function createServiceClient({ supabaseUrl, serviceRoleKey }) {
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY or ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY is required.");
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function findUserIdByEmail(client, email) {
  let page = 1;
  const perPage = 100;
  while (page <= 20) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Could not list Supabase users: ${error.message}`);
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match.id;
    if (data.users.length < perPage) break;
    page += 1;
  }
  throw new Error(`Could not find Supabase user for ${email}.`);
}

async function loadEntitlement(client, userId) {
  const { data, error } = await client
    .from("account_entitlements")
    .select("plan, billing_status, stripe_customer_id, stripe_subscription_id, current_period_end, cancel_at_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`Could not load account entitlement: ${error.message}`);
  return data;
}

export async function checkPremiumEntitlement({
  email,
  userId,
  expect = "premium",
  waitSeconds = 0,
  pollSeconds = 5,
  supabaseUrl = firstNonEmptyEnv("ROLEFORGE_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL") || DEFAULT_SUPABASE_URL,
  serviceRoleKey = firstNonEmptyEnv("ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"),
} = {}) {
  if (!email && !userId) throw new Error("Provide email or userId.");
  const client = createServiceClient({ supabaseUrl, serviceRoleKey });
  const resolvedUserId = userId || await findUserIdByEmail(client, email.toLowerCase());
  const deadline = Date.now() + waitSeconds * 1000;
  let lastSummary = null;

  do {
    const row = await loadEntitlement(client, resolvedUserId);
    lastSummary = summarizeEntitlement(row);
    const matches = expect === "premium" ? lastSummary.premiumActive : !lastSummary.premiumActive;
    if (matches) {
      return {
        ok: true,
        expected: expect,
        userId: maskId(resolvedUserId),
        ...lastSummary,
      };
    }
    if (Date.now() >= deadline) break;
    await sleep(pollSeconds * 1000);
  } while (true);

  return {
    ok: false,
    expected: expect,
    userId: maskId(resolvedUserId),
    ...lastSummary,
  };
}

export async function runCheckPremiumEntitlementCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printHelp();
    return 0;
  }

  const result = await checkPremiumEntitlement(options);
  console.log(JSON.stringify(result, null, 2));
  return result.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await runCheckPremiumEntitlementCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
