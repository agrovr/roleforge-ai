import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { validateSupportEnvValue } from "./set_vercel_support_env.mjs";

const script = readFileSync("scripts/set_vercel_support_env.mjs", "utf8");

test("accepts valid support notification env values", () => {
  assert.equal(validateSupportEnvValue("ROLEFORGE_SUPPORT_WEBHOOK_URL", "https://hooks.example.com/roleforge"), true);
  assert.equal(validateSupportEnvValue("ROLEFORGE_SUPPORT_WEBHOOK_SECRET", "support-secret-value"), true);
  assert.equal(validateSupportEnvValue("ROLEFORGE_SUPPORT_EMAIL_TO", "owner@example.com, support@example.com"), true);
  assert.equal(validateSupportEnvValue("ROLEFORGE_SUPPORT_EMAIL_FROM", "RoleForge Support <support@roleforgeai.com>"), true);
  assert.equal(validateSupportEnvValue("RESEND_API_KEY", "re_secret_value_123"), true);
  assert.equal(validateSupportEnvValue("ROLEFORGE_ADMIN_EMAILS", "owner@example.com, support@example.com"), true);
});

test("rejects unsafe support notification env values", () => {
  assert.throws(
    () => validateSupportEnvValue("ROLEFORGE_SUPPORT_WEBHOOK_URL", "http://hooks.example.com/roleforge"),
    /HTTPS support notification webhook URL/,
  );
  assert.throws(
    () => validateSupportEnvValue("ROLEFORGE_SUPPORT_WEBHOOK_URL", "javascript:alert(1)"),
    /HTTPS support notification webhook URL/,
  );
  assert.throws(
    () => validateSupportEnvValue("ROLEFORGE_SUPPORT_WEBHOOK_SECRET", "short"),
    /support webhook verification secret/,
  );
  assert.throws(
    () => validateSupportEnvValue("ROLEFORGE_SUPPORT_EMAIL_TO", "not-an-email"),
    /support notification recipient email/,
  );
  assert.throws(
    () => validateSupportEnvValue("ROLEFORGE_SUPPORT_EMAIL_FROM", "not-an-email"),
    /verified Resend sender email/,
  );
  assert.throws(
    () => validateSupportEnvValue("RESEND_API_KEY", "bad"),
    /Resend API key/,
  );
  assert.throws(
    () => validateSupportEnvValue("ROLEFORGE_ADMIN_EMAILS", "not-an-email"),
    /support admin email allow-list/,
  );
  assert.throws(
    () => validateSupportEnvValue("STRIPE_SECRET_KEY", "sk_live_example"),
    /Unsupported support environment variable/,
  );
});

test("support env setter can create or overwrite one value without a remove step", () => {
  assert.match(script, /"env",\s*"add",\s*name,\s*environment,\s*"--force",\s*"--yes"/);
  assert.doesNotMatch(script, /"env",\s*"rm",\s*name/);
  assert.match(script, /Pipe exactly one value on stdin/);
});
