import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyBillingReadiness,
  classifyLiveBillingProofEvidence,
  classifySmokeReadiness,
  classifySupportInbox,
  classifyVercelInspect,
  classifyWorkflowRun,
  parseArgs,
  parseSupportInboxSummary,
  parseWorkflowRuns,
  summarizeLiveBillingProofEvidence,
  summarizeLaunchAudit,
} from "./launch_readiness_audit.mjs";

test("parses launch audit options", () => {
  assert.deepEqual(parseArgs(["--json", "--skip-live", "--skip-support-inbox", "--proof-evidence=.tmp/proof.json", "--proof-fresh-days=7", "--scope", "team_123", "--production-url=https://example.com"]), {
    json: true,
    skipLive: true,
    skipSupportInbox: true,
    proofEvidencePath: ".tmp/proof.json",
    proofFreshDays: 7,
    teamId: "team_123",
    frontendRepo: "agrovr/roleforge-ai",
    backendRepo: "agrovr/roleforge-ai-backend",
    productionUrl: "https://example.com",
  });
  assert.throws(() => parseArgs(["--scope"]), /--scope requires a value/);
  assert.throws(() => parseArgs(["--proof-fresh-days", "0"]), /--proof-fresh-days/);
  assert.throws(() => parseArgs(["--unknown"]), /Unknown argument/);
});

test("classifies local live checkout proof evidence", () => {
  const now = new Date("2026-06-07T00:00:00.000Z");
  const freshEvidence = {
    completedAt: "2026-06-06T23:00:00.000Z",
    productionUrl: "https://roleforgeai.vercel.app",
    checkoutMode: "live",
    checkoutSessionPrefix: "cs_live_123456789",
    premiumActive: true,
    webhookVerified: true,
    cleanupUserDeleted: true,
    cleanupSubscriptionCanceled: true,
  };

  assert.deepEqual(summarizeLiveBillingProofEvidence(freshEvidence, { now, freshDays: 14 }), {
    completedAt: "2026-06-06T23:00:00.000Z",
    ageDays: 0.04,
    fresh: true,
    checkoutMode: "live",
    productionUrl: "https://roleforgeai.vercel.app",
    premiumActive: true,
    webhookVerified: true,
    cleanupUserDeleted: true,
    cleanupSubscriptionCanceled: true,
    checkoutSessionPrefix: "cs_live_1234",
  });

  assert.equal(classifyLiveBillingProofEvidence(freshEvidence, { now, freshDays: 14 }).status, "pass");
  assert.equal(classifyLiveBillingProofEvidence(null, { now, freshDays: 14 }).status, "warn");
  assert.match(
    classifyLiveBillingProofEvidence({ ...freshEvidence, premiumActive: false }, { now, freshDays: 14 }).detail,
    /incomplete/,
  );
  assert.match(
    classifyLiveBillingProofEvidence({ ...freshEvidence, completedAt: "2026-05-01T00:00:00.000Z" }, { now, freshDays: 14 }).detail,
    /older than 14 days/,
  );
  assert.doesNotMatch(JSON.stringify(classifyLiveBillingProofEvidence(freshEvidence, { now, freshDays: 14 })), /sk_live_|sb_secret_|checkout-proof-/);
});

test("classifies support inbox summaries without ticket content", () => {
  assert.deepEqual(parseSupportInboxSummary([
    "Support requests: 3",
    "Newest: 2026-06-06T12:00:00.000Z",
    "By status: open=1, reviewing=2",
    "By category: billing=1, privacy=2",
  ].join("\n")), {
    count: 3,
    newestCreatedAt: "2026-06-06T12:00:00.000Z",
    byStatus: { open: 1, reviewing: 2 },
    byCategory: { billing: 1, privacy: 2 },
  });

  assert.deepEqual(classifySupportInbox([
    "Support requests: 0",
    "Newest: none",
    "By status: none",
    "By category: none",
  ].join("\n")), {
    status: "pass",
    detail: "Support inbox has no saved requests.",
    supportInbox: {
      count: 0,
      newestCreatedAt: "none",
      byStatus: {},
      byCategory: {},
    },
  });

  const open = classifySupportInbox([
    "Support requests: 1",
    "Newest: 2026-06-06T12:00:00.000Z",
    "By status: open=1",
    "By category: billing=1",
  ].join("\n"));
  assert.equal(open.status, "warn");
  assert.match(open.detail, /1 open support request/);
  assert.doesNotMatch(JSON.stringify(open), /person@example\.com|Checkout completed/);
});

test("classifies smoke and billing readiness output", () => {
  assert.equal(classifySmokeReadiness("Smoke readiness is complete.").status, "pass");
  assert.equal(classifySmokeReadiness("missing credentials").status, "fail");

  const billing = classifyBillingReadiness([
    "PASS Premium checkout is ready with these live billing settings.",
    "WARN STRIPE_SECRET_KEY is encrypted in Vercel and cannot be inspected by the CLI; prove live mode with a live checkout proof",
    "WARN ROLEFORGE_SUPPORT_WEBHOOK_URL is not configured; support requests save to Supabase but do not send ops notifications",
  ].join("\n"));

  assert.equal(billing.status, "pass");
  assert.equal(billing.supportNotifications, "missing");
  assert.equal(billing.warnings.length, 2);
});

test("parses and classifies workflow runs", () => {
  const run = parseWorkflowRuns(JSON.stringify({
    workflow_runs: [
      { name: "Other", status: "completed", conclusion: "failure", head_sha: "bad", html_url: "https://example.com/bad" },
      { name: "Frontend CI", status: "completed", conclusion: "success", head_sha: "abcdef123456", html_url: "https://example.com/good" },
    ],
  }), "Frontend CI");

  assert.deepEqual(run, {
    name: "Frontend CI",
    status: "completed",
    conclusion: "success",
    headSha: "abcdef123456",
    url: "https://example.com/good",
    createdAt: "",
  });
  assert.deepEqual(classifyWorkflowRun(run, "Frontend CI"), {
    status: "pass",
    detail: "Frontend CI passed at abcdef1.",
    url: "https://example.com/good",
  });
});

test("classifies Vercel inspect output and launch summary", () => {
  assert.equal(classifyVercelInspect("status   ● Ready\nhttps://roleforgeai.vercel.app").status, "pass");
  assert.equal(classifyVercelInspect("status   ● Ready").status, "warn");
  assert.equal(classifyVercelInspect("status   ● Error").status, "fail");

  assert.deepEqual(
    summarizeLaunchAudit([
      { name: "A", status: "pass", warnings: ["soft warning"] },
      { name: "B", status: "warn", detail: "manual follow-up" },
      { name: "C", status: "fail" },
    ]),
    {
      ready: false,
      failures: ["C"],
      warnings: ["soft warning", "manual follow-up"],
    },
  );
});
