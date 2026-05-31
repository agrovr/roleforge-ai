#!/usr/bin/env node

import { pathToFileURL } from "node:url";

const LIVE_SITE_HOST = "roleforgeai.vercel.app";

export function stripeKeyMode(secretKey = "") {
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
  return value.startsWith("price_");
}

function webhookSecretLooksValid(value = "") {
  return value.startsWith("whsec_");
}

export function evaluateBillingLaunchReadiness(env = process.env) {
  const secretKey = env.STRIPE_SECRET_KEY?.trim() || "";
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET?.trim() || "";
  const monthlyPriceId = env.STRIPE_PREMIUM_MONTHLY_PRICE_ID?.trim() || "";
  const yearlyPriceId = env.STRIPE_PREMIUM_YEARLY_PRICE_ID?.trim() || "";
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

  if (secretKey && liveKeyRequired && mode !== "live") {
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

  const checkoutReady = Boolean(secretKey && priceIdLooksValid(monthlyPriceId) && priceIdLooksValid(yearlyPriceId) && (!liveKeyRequired || mode === "live"));
  const webhookReady = Boolean(secretKey && webhookSecretLooksValid(webhookSecret) && (!liveKeyRequired || mode === "live"));
  const ready = checkoutReady && webhookReady && valuePresent(env, "SUPABASE_SERVICE_ROLE_KEY") && valuePresent(env, "NEXT_PUBLIC_SITE_URL");

  return {
    liveKeyRequired,
    mode,
    checkoutReady,
    webhookReady,
    ready,
    findings,
  };
}

function parseArgs(argv) {
  const options = { strict: false };
  for (const arg of argv) {
    if (arg === "--strict") {
      options.strict = true;
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

  const result = evaluateBillingLaunchReadiness(env);
  console.log("RoleForge AI billing launch readiness");
  console.log(`Context: ${result.liveKeyRequired ? "production live key required" : "non-production or custom preview"}; Stripe key mode: ${result.mode}`);
  console.log("");

  for (const finding of result.findings) {
    printFinding(finding);
  }

  console.log("");
  if (result.ready) {
    console.log("PASS Premium checkout can be re-enabled after deploy with these live billing settings.");
    return 0;
  }

  console.log("WARN Premium checkout remains paused. The signed-in free workflow can stay open while billing is prepared.");
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
