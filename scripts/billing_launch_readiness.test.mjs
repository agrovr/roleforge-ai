import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  evaluateBillingLaunchReadiness,
  mergePulledAndListedVercelEnv,
  parseEnvFile,
  parseVercelEnvList,
  safeValueKind,
} from "./check_billing_launch_readiness.mjs";

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
  assert.equal(result.supportNotificationsReady, false);
  assert.match(result.findings.map((finding) => finding.message).join("\n"), /support requests save to Supabase but do not send ops notifications/);
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
  assert.match(result.stdout, /Premium checkout is not ready/);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, new RegExp(secret));
});

test("strict billing readiness passes with live production settings", () => {
  const result = spawnSync(process.execPath, [scriptPath, "--strict"], {
    cwd: process.cwd(),
    env: baseEnv({ STRIPE_SECRET_KEY: "sk_live_secret_value" }),
    encoding: "utf8",
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Premium checkout is ready/);
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
    "ROLEFORGE_SUPPORT_WEBHOOK_URL=https://hooks.example.com/roleforge",
    "ROLEFORGE_SUPPORT_WEBHOOK_SECRET=do_not_print",
  ].join("\n"));

  assert.equal(env.STRIPE_SECRET_KEY, "sk_live_secret_value");
  assert.equal(safeValueKind("STRIPE_SECRET_KEY", env.STRIPE_SECRET_KEY), "live");
  assert.equal(safeValueKind("STRIPE_PREMIUM_MONTHLY_PRICE_ID", env.STRIPE_PREMIUM_MONTHLY_PRICE_ID), "price");
  assert.equal(safeValueKind("ROLEFORGE_SUPPORT_WEBHOOK_URL", env.ROLEFORGE_SUPPORT_WEBHOOK_URL), "url");
  assert.equal(safeValueKind("ROLEFORGE_SUPPORT_WEBHOOK_SECRET", env.ROLEFORGE_SUPPORT_WEBHOOK_SECRET), "present");
  assert.equal(evaluateBillingLaunchReadiness(env).ready, true);
  assert.equal(evaluateBillingLaunchReadiness(env).supportNotificationsReady, true);
});

test("billing readiness treats Vercel encrypted production vars as configured without exposing values", () => {
  const env = parseVercelEnvList(`
 name                                       value               environments                        created
 STRIPE_SECRET_KEY                          Encrypted           Production                          2h ago
 STRIPE_PREMIUM_YEARLY_PRICE_ID             Encrypted           Production                          3d ago
 STRIPE_PREMIUM_MONTHLY_PRICE_ID            Encrypted           Production                          3d ago
 STRIPE_WEBHOOK_SECRET                      Encrypted           Production                          3d ago
 SUPABASE_SERVICE_ROLE_KEY                  Encrypted           Production                          3d ago
 NEXT_PUBLIC_SITE_URL                       Encrypted           Production                          18d ago
 ROLEFORGE_SUPPORT_WEBHOOK_URL              Encrypted           Production                          5m ago
 ROLEFORGE_SUPPORT_WEBHOOK_SECRET           Encrypted           Production                          5m ago
`);

  const result = evaluateBillingLaunchReadiness(env);
  assert.equal(safeValueKind("STRIPE_SECRET_KEY", env.STRIPE_SECRET_KEY), "encrypted");
  assert.equal(safeValueKind("ROLEFORGE_SUPPORT_WEBHOOK_URL", env.ROLEFORGE_SUPPORT_WEBHOOK_URL), "encrypted");
  assert.equal(result.mode, "encrypted");
  assert.equal(result.ready, true);
  assert.equal(result.supportNotificationsReady, true);
  assert.match(result.findings.map((finding) => finding.message).join("\n"), /prove live mode with a live checkout proof/);
});

test("billing readiness fills blank pulled Vercel secrets from encrypted env listing", () => {
  const pulled = parseEnvFile([
    "NEXT_PUBLIC_SITE_URL=https://roleforgeai.vercel.app",
    "STRIPE_SECRET_KEY=",
    "STRIPE_PREMIUM_MONTHLY_PRICE_ID=",
    "STRIPE_PREMIUM_YEARLY_PRICE_ID=",
    "STRIPE_WEBHOOK_SECRET=",
    "SUPABASE_SERVICE_ROLE_KEY=",
  ].join("\n"));
  const listed = parseVercelEnvList(`
 STRIPE_SECRET_KEY                          Encrypted           Production                          2h ago
 STRIPE_PREMIUM_YEARLY_PRICE_ID             Encrypted           Production                          3d ago
 STRIPE_PREMIUM_MONTHLY_PRICE_ID            Encrypted           Production                          3d ago
 STRIPE_WEBHOOK_SECRET                      Encrypted           Production                          3d ago
 SUPABASE_SERVICE_ROLE_KEY                  Encrypted           Production                          3d ago
`);
  const merged = mergePulledAndListedVercelEnv(pulled, listed);

  assert.equal(merged.NEXT_PUBLIC_SITE_URL, "https://roleforgeai.vercel.app");
  assert.equal(safeValueKind("STRIPE_SECRET_KEY", merged.STRIPE_SECRET_KEY), "encrypted");
  assert.equal(evaluateBillingLaunchReadiness(merged).ready, true);
});

test("safe value kinds never include secret values", () => {
  assert.equal(safeValueKind("STRIPE_SECRET_KEY", "sk_test_do_not_print"), "test");
  assert.equal(safeValueKind("STRIPE_WEBHOOK_SECRET", "whsec_do_not_print"), "webhook-secret");
  assert.equal(safeValueKind("ROLEFORGE_SUPPORT_WEBHOOK_SECRET", "support_secret_do_not_print"), "present");
  assert.equal(safeValueKind("SUPABASE_SERVICE_ROLE_KEY", "service_role_do_not_print"), "present");
});

test("support notification readiness warns for invalid optional webhook configuration", () => {
  const result = evaluateBillingLaunchReadiness(baseEnv({
    STRIPE_SECRET_KEY: "sk_live_secret_value",
    ROLEFORGE_SUPPORT_WEBHOOK_URL: "http://hooks.example.com/not-secure",
  }));

  assert.equal(result.ready, true);
  assert.equal(result.supportNotificationsReady, false);
  assert.match(result.findings.map((finding) => finding.message).join("\n"), /should be an https webhook URL/);
});
