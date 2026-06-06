#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const LIVE_SITE_HOST = "roleforgeai.vercel.app";
const DEFAULT_VERCEL_TEAM_ID = "team_kEe4HW272D5nYJDD92amj55H";
const TEMP_VERCEL_ENV_FILE = ".codex-vercel-production.env";
const VERCEL_ENCRYPTED_VALUE = "__VERCEL_ENCRYPTED__";
const VERCEL_PRODUCTION_NAMES = [
  "NEXT_PUBLIC_SITE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_PREMIUM_MONTHLY_PRICE_ID",
  "STRIPE_PREMIUM_YEARLY_PRICE_ID",
  "STRIPE_WEBHOOK_SECRET",
  "ROLEFORGE_SUPPORT_WEBHOOK_URL",
  "ROLEFORGE_SUPPORT_WEBHOOK_SECRET",
];

export function stripeKeyMode(secretKey = "") {
  if (secretKey === VERCEL_ENCRYPTED_VALUE) return "encrypted";
  if (secretKey.startsWith("sk_live_")) return "live";
  if (secretKey.startsWith("sk_test_")) return "test";
  return secretKey ? "unknown" : "missing";
}

function valuePresent(env, name) {
  return Boolean(env[name]?.trim());
}

function productionRequiresLiveStripeKey(env) {
  const siteUrl = env.NEXT_PUBLIC_SITE_URL?.trim().toLowerCase() || "";
  const productionUrl = env.VERCEL_PROJECT_PRODUCTION_URL?.trim().toLowerCase() || "";
  return env.VERCEL_ENV === "production" || siteUrl.includes(LIVE_SITE_HOST) || productionUrl.includes(LIVE_SITE_HOST);
}

function priceIdLooksValid(value = "") {
  if (value === VERCEL_ENCRYPTED_VALUE) return true;
  return value.startsWith("price_");
}

function webhookSecretLooksValid(value = "") {
  if (value === VERCEL_ENCRYPTED_VALUE) return true;
  return value.startsWith("whsec_");
}

function supportWebhookUrlLooksValid(value = "") {
  if (!value) return false;
  if (value === VERCEL_ENCRYPTED_VALUE) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function evaluateBillingLaunchReadiness(env = process.env) {
  const secretKey = env.STRIPE_SECRET_KEY?.trim() || "";
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET?.trim() || "";
  const monthlyPriceId = env.STRIPE_PREMIUM_MONTHLY_PRICE_ID?.trim() || "";
  const yearlyPriceId = env.STRIPE_PREMIUM_YEARLY_PRICE_ID?.trim() || "";
  const supportWebhookUrl = env.ROLEFORGE_SUPPORT_WEBHOOK_URL?.trim() || "";
  const supportWebhookSecret = env.ROLEFORGE_SUPPORT_WEBHOOK_SECRET?.trim() || "";
  const mode = stripeKeyMode(secretKey);
  const liveKeyRequired = productionRequiresLiveStripeKey(env);
  const findings = [];

  findings.push({
    ok: valuePresent(env, "NEXT_PUBLIC_SITE_URL"),
    level: valuePresent(env, "NEXT_PUBLIC_SITE_URL") ? "pass" : "fail",
    message: "NEXT_PUBLIC_SITE_URL is configured",
  });

  findings.push({
    ok: valuePresent(env, "SUPABASE_SERVICE_ROLE_KEY"),
    level: valuePresent(env, "SUPABASE_SERVICE_ROLE_KEY") ? "pass" : "fail",
    message: "SUPABASE_SERVICE_ROLE_KEY is configured for entitlement writes",
  });

  findings.push({
    ok: Boolean(secretKey),
    level: secretKey ? "pass" : "fail",
    message: secretKey ? `STRIPE_SECRET_KEY is configured (${mode} mode)` : "STRIPE_SECRET_KEY is missing",
  });

  if (secretKey && liveKeyRequired && mode !== "live" && mode !== "encrypted") {
    findings.push({
      ok: false,
      level: "fail",
      message: "Production requires STRIPE_SECRET_KEY to use a live key (sk_live_...)",
    });
  } else if (secretKey && mode === "unknown") {
    findings.push({
      ok: false,
      level: "fail",
      message: "STRIPE_SECRET_KEY should start with sk_live_ or sk_test_",
    });
  } else if (secretKey && mode === "test") {
    findings.push({
      ok: true,
      level: "warn",
      message: "Stripe is in test mode; Premium checkout stays paused on the production domain",
    });
  } else if (secretKey && mode === "encrypted") {
    findings.push({
      ok: true,
      level: "warn",
      message: "STRIPE_SECRET_KEY is encrypted in Vercel and cannot be inspected by the CLI; prove live mode with a live checkout proof",
    });
  }

  findings.push({
    ok: priceIdLooksValid(monthlyPriceId),
    level: priceIdLooksValid(monthlyPriceId) ? "pass" : "fail",
    message: "STRIPE_PREMIUM_MONTHLY_PRICE_ID is configured",
  });

  findings.push({
    ok: priceIdLooksValid(yearlyPriceId),
    level: priceIdLooksValid(yearlyPriceId) ? "pass" : "fail",
    message: "STRIPE_PREMIUM_YEARLY_PRICE_ID is configured",
  });

  findings.push({
    ok: webhookSecretLooksValid(webhookSecret),
    level: webhookSecretLooksValid(webhookSecret) ? "pass" : "fail",
    message: "STRIPE_WEBHOOK_SECRET is configured",
  });

  if (!supportWebhookUrl) {
    findings.push({
      ok: true,
      level: "warn",
      message: "ROLEFORGE_SUPPORT_WEBHOOK_URL is not configured; support requests save to Supabase but do not send ops notifications",
    });
  } else if (!supportWebhookUrlLooksValid(supportWebhookUrl)) {
    findings.push({
      ok: true,
      level: "warn",
      message: "ROLEFORGE_SUPPORT_WEBHOOK_URL should be an https webhook URL",
    });
  } else {
    findings.push({
      ok: true,
      level: "pass",
      message: "ROLEFORGE_SUPPORT_WEBHOOK_URL is configured for support request notifications",
    });
  }

  if (supportWebhookUrl && !supportWebhookSecret) {
    findings.push({
      ok: true,
      level: "warn",
      message: "ROLEFORGE_SUPPORT_WEBHOOK_SECRET is optional but recommended for verifying support notification webhooks",
    });
  } else if (supportWebhookSecret) {
    findings.push({
      ok: true,
      level: "pass",
      message: "ROLEFORGE_SUPPORT_WEBHOOK_SECRET is configured",
    });
  }

  const productionKeyReady = !liveKeyRequired || mode === "live" || mode === "encrypted";
  const checkoutReady = Boolean(secretKey && priceIdLooksValid(monthlyPriceId) && priceIdLooksValid(yearlyPriceId) && productionKeyReady);
  const webhookReady = Boolean(secretKey && webhookSecretLooksValid(webhookSecret) && productionKeyReady);
  const supportNotificationsReady = Boolean(supportWebhookUrlLooksValid(supportWebhookUrl));
  const ready = checkoutReady && webhookReady && valuePresent(env, "SUPABASE_SERVICE_ROLE_KEY") && valuePresent(env, "NEXT_PUBLIC_SITE_URL");

  return {
    liveKeyRequired,
    mode,
    checkoutReady,
    webhookReady,
    supportNotificationsReady,
    ready,
    findings,
  };
}

export function parseEnvFile(contents) {
  const env = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalsIndex = line.indexOf("=");
    if (equalsIndex < 0) continue;

    const name = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();
    if (!name) continue;

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[name] = value;
  }
  return env;
}

export function safeValueKind(name, value = "") {
  if (!value) return "missing";
  if (value === VERCEL_ENCRYPTED_VALUE) return "encrypted";
  if (name === "STRIPE_SECRET_KEY") return stripeKeyMode(value);
  if (name === "STRIPE_WEBHOOK_SECRET") return value.startsWith("whsec_") ? "webhook-secret" : "present";
  if (name === "ROLEFORGE_SUPPORT_WEBHOOK_SECRET") return "present";
  if (name.includes("PRICE_ID")) return value.startsWith("price_") ? "price" : "present";
  if (name.includes("URL")) return /^https?:\/\//i.test(value) ? "url" : "present";
  return "present";
}

function invokeVercel(args, { cwd = process.cwd() } = {}) {
  const command = process.platform === "win32" ? "cmd.exe" : "npx";
  const commandArgs = process.platform === "win32" ? ["/d", "/s", "/c", "npx", "vercel", ...args] : ["vercel", ...args];
  return execFileSync(command, commandArgs, { cwd, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
}

export function parseVercelEnvList(output = "") {
  const env = {};
  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("name ") || trimmed.startsWith("> ") || trimmed.startsWith("Vercel CLI")) continue;
    const name = trimmed.split(/\s+/)[0];
    if (VERCEL_PRODUCTION_NAMES.includes(name) && /\bEncrypted\b/.test(trimmed)) {
      env[name] = VERCEL_ENCRYPTED_VALUE;
    }
  }
  return env;
}

export function mergePulledAndListedVercelEnv(pulledEnv = {}, listedEnv = {}) {
  const merged = { ...pulledEnv };
  for (const [name, value] of Object.entries(listedEnv)) {
    if (!merged[name]?.trim()) {
      merged[name] = value;
    }
  }
  return merged;
}

function listVercelProductionEnv({ teamId = DEFAULT_VERCEL_TEAM_ID, cwd = process.cwd() } = {}) {
  return parseVercelEnvList(invokeVercel(["env", "ls", "production", "--scope", teamId], { cwd }));
}

function pullVercelProductionEnv({ teamId = DEFAULT_VERCEL_TEAM_ID, cwd = process.cwd(), tempFile = TEMP_VERCEL_ENV_FILE } = {}) {
  const tempPath = join(cwd, tempFile);
  if (existsSync(tempPath)) rmSync(tempPath, { force: true });

  try {
    invokeVercel(["env", "pull", tempFile, "--environment=production", "--scope", teamId], { cwd });
    const pulledEnv = parseEnvFile(readFileSync(tempPath, "utf8"));
    const listedEnv = listVercelProductionEnv({ teamId, cwd });
    return mergePulledAndListedVercelEnv(pulledEnv, listedEnv);
  } finally {
    if (existsSync(tempPath)) rmSync(tempPath, { force: true });
  }
}

function parseArgs(argv) {
  const options = { strict: false, vercelProduction: false, teamId: DEFAULT_VERCEL_TEAM_ID };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--strict") {
      options.strict = true;
      continue;
    }
    if (arg === "--vercel-production") {
      options.vercelProduction = true;
      continue;
    }
    if (arg === "--team" || arg === "--scope") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${arg} requires a Vercel team id or slug`);
      options.teamId = value;
      index += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function printHelp() {
  console.log(`RoleForge AI billing readiness

Usage:
  npm run check:billing
  npm run check:billing -- --strict
  npm run check:billing:vercel

Checks production Stripe/Supabase environment variables without printing secret values.
Use --strict before switching Premium back on with live Stripe keys.`);
}

function printFinding(finding) {
  const prefix = finding.level === "pass" ? "PASS" : finding.level === "warn" ? "WARN" : "FAIL";
  console.log(`${prefix} ${finding.message}`);
}

export function runBillingLaunchReadinessCli(argv = process.argv.slice(2), env = process.env) {
  const options = parseArgs(argv);
  if (options.help) {
    printHelp();
    return 0;
  }

  const effectiveEnv = options.vercelProduction ? pullVercelProductionEnv({ teamId: options.teamId }) : env;
  const result = evaluateBillingLaunchReadiness(effectiveEnv);
  console.log("RoleForge AI billing launch readiness");
  if (options.vercelProduction) {
    console.log(`Source: Vercel production env (${options.teamId})`);
    for (const name of VERCEL_PRODUCTION_NAMES) {
      console.log(`SAFE ${name}: ${safeValueKind(name, effectiveEnv[name])}`);
    }
    console.log("");
  }
  console.log(`Context: ${result.liveKeyRequired ? "production live key required" : "non-production or custom preview"}; Stripe key mode: ${result.mode}`);
  console.log("");

  for (const finding of result.findings) {
    printFinding(finding);
  }

  console.log("");
  if (result.ready) {
    console.log("PASS Premium checkout is ready with these live billing settings.");
    return 0;
  }

  console.log("WARN Premium checkout is not ready. The signed-in free workflow can stay open while billing is restored.");
  return options.strict ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = runBillingLaunchReadinessCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
