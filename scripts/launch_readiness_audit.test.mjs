import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyBillingReadiness,
  classifySmokeReadiness,
  classifyVercelInspect,
  classifyWorkflowRun,
  parseArgs,
  parseWorkflowRuns,
  summarizeLaunchAudit,
} from "./launch_readiness_audit.mjs";

test("parses launch audit options", () => {
  assert.deepEqual(parseArgs(["--json", "--skip-live", "--scope", "team_123", "--production-url=https://example.com"]), {
    json: true,
    skipLive: true,
    teamId: "team_123",
    frontendRepo: "agrovr/roleforge-ai",
    backendRepo: "agrovr/roleforge-ai-backend",
    productionUrl: "https://example.com",
  });
  assert.throws(() => parseArgs(["--scope"]), /--scope requires a value/);
  assert.throws(() => parseArgs(["--unknown"]), /Unknown argument/);
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
