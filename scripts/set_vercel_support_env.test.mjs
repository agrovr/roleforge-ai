import assert from "node:assert/strict";
import test from "node:test";

import { validateSupportEnvValue } from "./set_vercel_support_env.mjs";

test("accepts valid support notification env values", () => {
  assert.equal(validateSupportEnvValue("ROLEFORGE_SUPPORT_WEBHOOK_URL", "https://hooks.example.com/roleforge"), true);
  assert.equal(validateSupportEnvValue("ROLEFORGE_SUPPORT_WEBHOOK_SECRET", "support-secret-value"), true);
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
    () => validateSupportEnvValue("STRIPE_SECRET_KEY", "sk_live_example"),
    /Unsupported support environment variable/,
  );
});
