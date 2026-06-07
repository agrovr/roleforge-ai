import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const script = readFileSync("scripts/live_billing_one_time_proof.ps1", "utf8");
const entitlementScript = readFileSync("scripts/live_checkout_entitlement_test.mjs", "utf8");
const stripeDocs = readFileSync("docs/stripe-billing-foundation.md", "utf8");
const operationsDocs = readFileSync("docs/operations-checklist.md", "utf8");

test("one-shot live billing proof supports non-interactive webhook polling", () => {
  assert.match(script, /\[switch\]\$AutoPoll/);
  assert.match(script, /if \(\$AutoPoll\) \{/);
  assert.match(script, /Waiting up to \$WaitSeconds seconds for Stripe webhook Premium activation/);
  assert.match(script, /Read-Host "Press Enter after Stripe Checkout returns to RoleForge"/);
});

test("one-shot live billing proof clears copied Stripe secrets", () => {
  assert.match(script, /\$script:SecretCameFromClipboard = \$true/);
  assert.match(script, /Clear-SecretClipboard \$clipboard/);
  assert.match(script, /Clear-SecretClipboard\s*\r?\n/);
  assert.match(script, /Remove-Item Env:\\STRIPE_SECRET_KEY/);
  assert.match(script, /Remove-Item Env:\\ROLEFORGE_STRIPE_SECRET_KEY/);
});

test("live proof cleanup refuses to orphan live Stripe subscriptions", () => {
  assert.match(entitlementScript, /if \(subscriptionId\) \{/);
  assert.match(entitlementScript, /!stripeSecretKey\?\.startsWith\("sk_live_"\)/);
  assert.match(entitlementScript, /Refusing to delete the proof user because a Stripe subscription exists/);
  assert.match(entitlementScript, /await stripe\.subscriptions\.cancel\(subscriptionId\)/);
  assert.match(entitlementScript, /await client\.auth\.admin\.deleteUser\(resolvedUserId\)/);
  assert.doesNotMatch(entitlementScript, /subscriptionCancelSkipped/);
});

test("cache-only mode writes the encrypted one-time Stripe cache", () => {
  assert.match(script, /roleforge-stripe-secret\.dpapi/);
  assert.match(script, /if \(\$CacheStripeSecretOnly\) \{/);
  assert.match(script, /Save-OneTimeStripeSecret \$secret/);
  assert.match(script, /ProtectedData\]::Protect/);
  assert.match(script, /ProtectedData\]::Unprotect/);
});

test("cache-only mode supports one-time Supabase admin credentials", () => {
  assert.match(script, /roleforge-supabase-admin\.dpapi/);
  assert.match(script, /\[switch\]\$CacheSupabaseCredentialOnly/);
  assert.match(script, /Save-OneTimeSupabaseCredential \$clipboard/);
  assert.match(script, /Save-OneTimeSupabaseCredential \$supabaseCredential\.Trim\(\)/);
  assert.match(script, /Read-OneTimeSupabaseCredential/);
  assert.match(script, /Clear-OneTimeSupabaseCredential/);
});

test("one-shot live billing proof can load server-only local proof secrets", () => {
  assert.match(script, /function Import-LocalProofEnv/);
  assert.match(script, /Join-Path \$RepoRoot ".env.local"/);
  assert.match(script, /"ROLEFORGE_STRIPE_SECRET_KEY"/);
  assert.match(script, /"ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY"/);
  assert.doesNotMatch(script, /NEXT_PUBLIC_[A-Z0-9_]*SERVICE_ROLE/);
});

test("live billing proof docs mention autopoll and promo-code clipboard handoff", () => {
  assert.match(stripeDocs, /-CopyPromoCode/);
  assert.match(stripeDocs, /-AutoPoll/);
  assert.match(operationsDocs, /-CopyPromoCode/);
  assert.match(operationsDocs, /-AutoPoll/);
});

test("successful live billing proof writes non-secret local evidence", () => {
  assert.match(script, /live-billing-proof\.json/);
  assert.match(script, /function Write-LiveBillingProofEvidence/);
  assert.match(script, /Premium entitlement is active for the proof user/);
  assert.match(script, /Write-LiveBillingProofEvidence -Proof \$proofEvidence -Cleanup \$cleanupEvidence -Interval \$Interval/);
  assert.match(script, /checkoutSessionPrefix/);
  assert.match(script, /cleanupUserDeleted/);
  assert.doesNotMatch(script, /sk_live_.*live-billing-proof/);
});
