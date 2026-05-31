#!/usr/bin/env node

import { pathToFileURL } from "node:url";

const DEFAULT_BASE_URL = "https://roleforgeai.vercel.app";
const DEFAULT_SUPABASE_URL = "https://ijdspodwpkuhwszmvqip.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ii0BuTrEpkue3q2Eenim6Q_JkxYMY9p";

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

function normalizeBaseUrl(value) {
  const raw = (value || DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
  if (!/^https:\/\//i.test(raw)) throw new Error(`Live checkout smoke requires an https URL, got ${raw}`);
  return raw;
}

function parseArgs(argv) {
  const options = {
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
    if (name === "--base-url") {
      const value = inlineValue ?? argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--base-url requires a value");
      options.baseUrl = value;
      if (inlineValue === undefined) index += 1;
      continue;
    }
    if (name === "--interval") {
      const value = inlineValue ?? argv[index + 1];
      if (value !== "month" && value !== "year") throw new Error("--interval must be month or year");
      options.interval = value;
      if (inlineValue === undefined) index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  options.baseUrl = normalizeBaseUrl(options.baseUrl);
  return options;
}

function printHelp() {
  console.log(`RoleForge AI live checkout smoke

Usage:
  node scripts/smoke_live_checkout.mjs
  node scripts/smoke_live_checkout.mjs --interval year

Required environment:
  SUPABASE_SERVICE_ROLE_KEY or ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY

Optional environment:
  ROLEFORGE_SUPABASE_URL
  ROLEFORGE_SUPABASE_PUBLISHABLE_KEY

The script creates a temporary confirmed Supabase user, starts a live Stripe Checkout Session,
confirms the redirect is to checkout.stripe.com with a cs_live session id, and deletes the user.`);
}

async function supabaseAdminRequest(supabaseUrl, serviceRoleKey, path, options = {}) {
  return fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
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

export async function smokeLiveCheckout({
  baseUrl = DEFAULT_BASE_URL,
  interval = "month",
  supabaseUrl = firstNonEmptyEnv("ROLEFORGE_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL") || DEFAULT_SUPABASE_URL,
  publishableKey = firstNonEmptyEnv(
    "ROLEFORGE_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ) || DEFAULT_SUPABASE_PUBLISHABLE_KEY,
  serviceRoleKey = firstNonEmptyEnv("ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"),
} = {}) {
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY or ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY is required.");
  if (interval !== "month" && interval !== "year") throw new Error("interval must be month or year.");

  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `checkout-smoke-${suffix}@roleforge.local`;
  const password = `RoleForge-${suffix}-Smoke!`;
  let userId = "";
  let smokeResult = null;
  let tempUserDeleted = false;

  try {
    const createResponse = await supabaseAdminRequest(supabaseUrl, serviceRoleKey, "/auth/v1/admin/users", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: "RoleForge Checkout Smoke" },
      }),
    });
    const createText = await createResponse.text();
    if (!createResponse.ok) {
      throw new Error(`Temporary user create failed with ${createResponse.status}: ${createText.slice(0, 160)}`);
    }
    userId = JSON.parse(createText).id;

    const session = await signInTemporaryUser({ supabaseUrl, publishableKey, email, password });
    const checkoutResponse = await fetch(`${normalizedBaseUrl}/api/billing/checkout`, {
      method: "POST",
      redirect: "manual",
      headers: {
        Cookie: cookieFromSession(supabaseUrl, session),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ interval }),
    });
    const location = checkoutResponse.headers.get("location") || "";
    const locationUrl = location ? new URL(location) : null;
    const sessionIdMatch = location.match(/cs_(live|test)_[^#?/]*/);

    if (checkoutResponse.status !== 303) throw new Error(`Checkout did not redirect; got ${checkoutResponse.status}.`);
    if (locationUrl?.hostname !== "checkout.stripe.com") {
      throw new Error(`Checkout did not redirect to Stripe; got ${locationUrl?.hostname || "no location"}.`);
    }
    if (sessionIdMatch?.[1] !== "live") throw new Error("Checkout session was not live mode.");

    smokeResult = {
      checkoutStatus: checkoutResponse.status,
      checkoutHost: locationUrl.hostname,
      checkoutMode: sessionIdMatch[1],
      checkoutSessionPrefix: sessionIdMatch[0].slice(0, 12),
      interval,
    };
  } finally {
    if (userId) {
      const deleteResponse = await supabaseAdminRequest(supabaseUrl, serviceRoleKey, `/auth/v1/admin/users/${userId}`, {
        method: "DELETE",
      });
      tempUserDeleted = deleteResponse.ok;
      if (!tempUserDeleted) {
        console.error(`WARN Temporary Supabase user cleanup failed with ${deleteResponse.status}. User id: ${userId}`);
      }
    }
  }

  return {
    ...smokeResult,
    tempUserDeleted,
  };
}

export async function runLiveCheckoutSmokeCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printHelp();
    return 0;
  }

  const result = await smokeLiveCheckout(options);
  console.log(JSON.stringify(result, null, 2));
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await runLiveCheckoutSmokeCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
