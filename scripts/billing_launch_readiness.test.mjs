import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { evaluateBillingLaunchReadiness, parseEnvFile, safeValueKind } from "./check_billing_launch_readiness.mjs";

const scriptPath = "scripts/check_billing_launch_readiness.mjs";

function baseEnv(overrides = {}) {
  return {
    PATH: process.env.PATH,
    NEXT_PUBLIC_SITE_URL: "https://roleforgeai.vercel.app",
    VERCEL_ENV: "production",
    SUPABASE_SERVICE_ROLE_KEY: "service_role_secret_value",
    STRIPE_WEBHOOK_SECRET: "whsec_live_webhook_secret_value",
    STRIPE_PREMIUM_MONTHLY_PRICE_ID: "price_live_monthly",
    STRIPE_PREMIUM_YEARLY_PRICE_ID: "price_live_yearly",
    ...overrides,
  };
}

test("billing readiness treats live production settings as ready", () => {
  const result = evaluateBillingLaunchReadiness(baseEnv({ STRIPE_SECRET_KEY: "sk_live_secret_value" }));
  assert.equal(result.liveKeyRequired, true);
  assert.equal(result.mode, "live");
  assert.equal(result.ready, true);
  assert.equal(result.checkoutReady, true);
  assert.equal(result.webhookReady, true);
});

test("billing readiness blocks test keys on the production domain", () => {
  const result = evaluateBillingLaunchReadiness(baseEnv({ STRIPE_SECRET_KEY: "sk_test_secret_value" }));
  assert.equal(result.mode, "test");
  assert.equal(result.ready, false);
  assert.equal(result.checkoutReady, false);
  assert.match(result.findings.map((finding) => finding.message).join("\n"), /Production requires STRIPE_SECRET_KEY/);
});

test("strict billing readiness fails closed without leaking secret values", () => {
  const secret = "sk_test_do_not_print_me";
  const result = spawnSync(process.execPath, [scriptPath, "--strict"], {
    cwd: process.cwd(),
    env: baseEnv({ STRIPE_SECRET_KEY: secret }),
    encoding: "utf8",
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /Premium checkout remains paused/);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, new RegExp(secret));
});

test("strict billing readiness passes with live production settings", () => {
  const result = spawnSync(process.execPath, [scriptPath, "--strict"], {
    cwd: process.cwd(),
    env: baseEnv({ STRIPE_SECRET_KEY: "sk_live_secret_value" }),
    encoding: "utf8",
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Premium checkout can be re-enabled/);
});

test("billing readiness parses pulled env files without exposing values", () => {
  const env = parseEnvFile([
    "# Vercel env",
    "NEXT_PUBLIC_SITE_URL=\"https://roleforgeai.vercel.app\"",
    "STRIPE_SECRET_KEY='sk_live_secret_value'",
    "STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_monthly_live",
    "STRIPE_PREMIUM_YEARLY_PRICE_ID=price_yearly_live",
    "STRIPE_WEBHOOK_SECRET=whsec_live_secret",
    "SUPABASE_SERVICE_ROLE_KEY=service_role_secret",
  ].join("\n"));

  assert.equal(env.STRIPE_SECRET_KEY, "sk_live_secret_value");
  assert.equal(safeValueKind("STRIPE_SECRET_KEY", env.STRIPE_SECRET_KEY), "live");
  assert.equal(safeValueKind("STRIPE_PREMIUM_MONTHLY_PRICE_ID", env.STRIPE_PREMIUM_MONTHLY_PRICE_ID), "price");
  assert.equal(evaluateBillingLaunchReadiness(env).ready, true);
});

test("safe value kinds never include secret values", () => {
  assert.equal(safeValueKind("STRIPE_SECRET_KEY", "sk_test_do_not_print"), "test");
  assert.equal(safeValueKind("STRIPE_WEBHOOK_SECRET", "whsec_do_not_print"), "webhook-secret");
  assert.equal(safeValueKind("SUPABASE_SERVICE_ROLE_KEY", "service_role_do_not_print"), "present");
});
