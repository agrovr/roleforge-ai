import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const script = readFileSync("scripts/live_billing_one_time_proof.ps1", "utf8");
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

test("live billing proof docs mention autopoll and promo-code clipboard handoff", () => {
  assert.match(stripeDocs, /-CopyPromoCode/);
  assert.match(stripeDocs, /-AutoPoll/);
  assert.match(operationsDocs, /-CopyPromoCode/);
  assert.match(operationsDocs, /-AutoPoll/);
});
