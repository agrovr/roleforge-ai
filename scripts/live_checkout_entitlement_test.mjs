#!/usr/bin/env node

import { pathToFileURL } from "node:url";

import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const DEFAULT_BASE_URL = "https://roleforgeai.vercel.app";
const DEFAULT_SUPABASE_URL = "https://ijdspodwpkuhwszmvqip.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ii0BuTrEpkue3q2Eenim6Q_JkxYMY9p";
const ACTIVE_BILLING_STATUSES = new Set(["active", "trialing"]);

function firstNonEmptyEnv(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

function base64UrlEncode(value) {
  return Buffer.from(value, "utf8").toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function supabaseStorageKey(supabaseUrl) {
  const host = new URL(supabaseUrl).hostname;
  const projectRef = host.split(".")[0];
  if (!projectRef) throw new Error(`Could not derive Supabase project ref from ${supabaseUrl}`);
  return `sb-${projectRef}-auth-token`;
}

function cookieFromSession(supabaseUrl, session) {
  if (!session?.access_token || !session?.refresh_token || !session?.user?.id) {
    throw new Error("Supabase sign-in did not return a complete session.");
  }
  return `${supabaseStorageKey(supabaseUrl)}=base64-${base64UrlEncode(JSON.stringify(session))}`;
}

function maskId(value = "") {
  if (!value) return "";
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function normalizeBaseUrl(value) {
  const raw = (value || DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
  if (!/^https:\/\//i.test(raw)) throw new Error(`Live checkout test requires an https URL, got ${raw}`);
  return raw;
}

function serviceClient({ supabaseUrl, serviceRoleKey }) {
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY or ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY is required.");
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function createTempUser(client) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `checkout-proof-${suffix}@roleforge.local`;
  const password = `RoleForge-${suffix}-Proof!`;
  const { data, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "RoleForge Checkout Proof" },
  });

  if (error || !data.user) throw new Error(`Temporary user create failed: ${error?.message || "missing user"}`);
  return { email, password, userId: data.user.id };
}

async function signInTemporaryUser({ supabaseUrl, publishableKey, email, password }) {
  const authUrl = new URL("/auth/v1/token", supabaseUrl);
  authUrl.searchParams.set("grant_type", "password");
  const response = await fetch(authUrl, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Temporary user sign-in failed with ${response.status}: ${text.slice(0, 160)}`);
  return JSON.parse(text);
}

async function startCheckout({
  baseUrl,
  interval,
  supabaseUrl,
  publishableKey,
  serviceRoleKey,
}) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const client = serviceClient({ supabaseUrl, serviceRoleKey });
  const tempUser = await createTempUser(client);
  try {
    const session = await signInTemporaryUser({ supabaseUrl, publishableKey, ...tempUser });
    const checkoutResponse = await fetch(`${normalizedBaseUrl}/api/billing/checkout`, {
      method: "POST",
      redirect: "manual",
      headers: {
        Cookie: cookieFromSession(supabaseUrl, session),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ interval }),
    });
    const checkoutUrl = checkoutResponse.headers.get("location") || "";
    const checkoutHost = checkoutUrl ? new URL(checkoutUrl).hostname : "";
    const checkoutSessionPrefix = checkoutUrl.match(/cs_(live|test)_[^#?/]*/)?.[0]?.slice(0, 12) || "";

    if (checkoutResponse.status !== 303) throw new Error(`Checkout did not redirect; got ${checkoutResponse.status}.`);
    if (checkoutHost !== "checkout.stripe.com") throw new Error(`Checkout did not redirect to Stripe; got ${checkoutHost || "no location"}.`);
    if (!checkoutSessionPrefix.startsWith("cs_live_")) throw new Error("Checkout session was not live mode.");

    return {
      nextStep: "Complete this Stripe Checkout URL, then run check with the userId below.",
      interval,
      userId: tempUser.userId,
      userIdMasked: maskId(tempUser.userId),
      email: tempUser.email,
      checkoutUrl,
      checkoutSessionPrefix,
    };
  } catch (error) {
    await client.auth.admin.deleteUser(tempUser.userId).catch(() => {});
    throw error;
  }
}

async function findUserIdByEmail(client, email) {
  let page = 1;
  const perPage = 100;
  while (page <= 20) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Could not list Supabase users: ${error.message}`);
    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match.id;
    if (data.users.length < perPage) break;
    page += 1;
  }
  throw new Error(`Could not find Supabase user for ${email}.`);
}

async function resolveUserId(client, options) {
  if (options.userId) return options.userId;
  if (options.email) return findUserIdByEmail(client, options.email);
  throw new Error("Provide --user-id or --email.");
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

function summarizeEntitlement(row) {
  const premiumActive = row?.plan === "premium" && ACTIVE_BILLING_STATUSES.has(row?.billing_status ?? "");
  return {
    found: Boolean(row),
    plan: row?.plan ?? "missing",
    billingStatus: row?.billing_status ?? "missing",
    premiumActive,
    stripeCustomer: row?.stripe_customer_id ? "present" : "missing",
    stripeSubscription: row?.stripe_subscription_id ? maskId(row.stripe_subscription_id) : "missing",
    currentPeriodEnd: row?.current_period_end ?? null,
    cancelAtPeriodEnd: Boolean(row?.cancel_at_period_end),
  };
}

async function checkEntitlement({ supabaseUrl, serviceRoleKey, userId, email }) {
  const client = serviceClient({ supabaseUrl, serviceRoleKey });
  const resolvedUserId = await resolveUserId(client, { userId, email });
  const row = await loadEntitlement(client, resolvedUserId);
  return {
    userId: resolvedUserId,
    userIdMasked: maskId(resolvedUserId),
    ...summarizeEntitlement(row),
  };
}

async function cleanupTestUser({ supabaseUrl, serviceRoleKey, stripeSecretKey, userId, email }) {
  const client = serviceClient({ supabaseUrl, serviceRoleKey });
  const resolvedUserId = await resolveUserId(client, { userId, email });
  const row = await loadEntitlement(client, resolvedUserId);
  const subscriptionId = row?.stripe_subscription_id || "";
  const cleanup = {
    userIdMasked: maskId(resolvedUserId),
    subscriptionCanceled: false,
    userDeleted: false,
  };

  if (subscriptionId) {
    if (!stripeSecretKey?.startsWith("sk_live_")) {
      throw new Error(
        "Refusing to delete the proof user because a Stripe subscription exists but no live Stripe secret key is available to cancel it first.",
      );
    } else {
      const stripe = new Stripe(stripeSecretKey, {
        appInfo: {
          name: "RoleForge AI live checkout entitlement test",
          version: "0.1.0",
        },
      });
      await stripe.subscriptions.cancel(subscriptionId);
      cleanup.subscriptionCanceled = true;
    }
  }

  const { error } = await client.auth.admin.deleteUser(resolvedUserId);
  if (error) throw new Error(`Temporary user delete failed: ${error.message}`);
  cleanup.userDeleted = true;
  return cleanup;
}

function parseArgs(argv) {
  const options = {
    command: "start",
    baseUrl: DEFAULT_BASE_URL,
    interval: "month",
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
    if (["start", "check", "cleanup"].includes(name) && index === 0) {
      options.command = name;
      continue;
    }
    if (["--base-url", "--interval", "--user-id", "--email"].includes(name)) {
      const value = inlineValue ?? argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
      if (name === "--base-url") options.baseUrl = value;
      if (name === "--interval") options.interval = value;
      if (name === "--user-id") options.userId = value.trim();
      if (name === "--email") options.email = value.trim().toLowerCase();
      if (inlineValue === undefined) index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (options.interval !== "month" && options.interval !== "year") throw new Error("--interval must be month or year.");
  return options;
}

function printHelp() {
  console.log(`RoleForge AI live checkout entitlement proof

Usage:
  node scripts/live_checkout_entitlement_test.mjs start --interval month
  node scripts/live_checkout_entitlement_test.mjs check --user-id <supabase-user-id>
  node scripts/live_checkout_entitlement_test.mjs cleanup --user-id <supabase-user-id>

Required environment:
  SUPABASE_SERVICE_ROLE_KEY or ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY

Optional environment:
  ROLEFORGE_SUPABASE_URL
  ROLEFORGE_SUPABASE_PUBLISHABLE_KEY
  STRIPE_SECRET_KEY or ROLEFORGE_STRIPE_SECRET_KEY for cleanup subscription cancellation

The start command creates a temporary confirmed Supabase user and returns a live Stripe
Checkout URL. It does not print any secret key. After completing Checkout, use check to
verify Premium entitlement, then cleanup to delete the temp user and cancel its subscription.`);
}

export async function runLiveCheckoutEntitlementTestCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printHelp();
    return 0;
  }

  const common = {
    supabaseUrl: firstNonEmptyEnv("ROLEFORGE_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL") || DEFAULT_SUPABASE_URL,
    publishableKey: firstNonEmptyEnv(
      "ROLEFORGE_SUPABASE_PUBLISHABLE_KEY",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ) || DEFAULT_SUPABASE_PUBLISHABLE_KEY,
    serviceRoleKey: firstNonEmptyEnv("ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"),
    stripeSecretKey: firstNonEmptyEnv("ROLEFORGE_STRIPE_SECRET_KEY", "STRIPE_SECRET_KEY"),
  };

  let result;
  if (options.command === "start") {
    result = await startCheckout({ ...common, baseUrl: options.baseUrl, interval: options.interval });
  } else if (options.command === "check") {
    result = await checkEntitlement({ ...common, userId: options.userId, email: options.email });
  } else {
    result = await cleanupTestUser({ ...common, userId: options.userId, email: options.email });
  }

  console.log(JSON.stringify(result, null, 2));
  return result?.premiumActive === false && options.command === "check" ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await runLiveCheckoutEntitlementTestCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
