import assert from "node:assert/strict";
import test from "node:test";

import { accountExportFilename, buildAccountExportPayload } from "./accountExport";
import { FREE_ENTITLEMENT } from "./entitlements";

const usage = {
  currentPeriodStart: "2026-06-01T00:00:00.000Z",
  currentPeriodEnd: "2026-07-01T00:00:00.000Z",
  monthlyRuns: 2,
  monthlyRunLimit: 5,
  remainingRuns: 3,
  runLimited: false,
};

test("builds a safe account summary export without protected URLs or Stripe ids", () => {
  const payload = buildAccountExportPayload({
    user: {
      id: "user_123",
      email: "avery@example.com",
      user_metadata: { name: "Provider Name" },
      created_at: "2026-05-01T00:00:00.000Z",
    },
    profile: {
      displayName: "Avery Stone",
      email: "avery@example.com",
      updatedAt: "2026-06-01T12:00:00.000Z",
    },
    entitlement: FREE_ENTITLEMENT,
    usage,
    generatedAt: "2026-06-01T18:00:00.000Z",
    projects: [{
      id: "project_1",
      title: "Product Manager",
      status: "exported",
      source_filename: "resume.pdf",
      source_name: "resume.pdf",
      target_title: "PM",
      target_source: "url",
      last_target_summary: "Role summary",
      latest_run_id: "run_1",
      created_at: "2026-06-01T00:00:00.000Z",
      updated_at: "2026-06-01T01:00:00.000Z",
    }],
    runs: [{
      id: "run_1",
      project_id: "project_1",
      client_history_id: "local_1",
      source_resume_name: "resume.pdf",
      job_target: "PM",
      company_url: "https://example.com",
      mode: "balanced",
      fit_score: 91,
      ats_score: 88,
      keyword_match_count: 12,
      read_time_seconds: 35,
      download_format: "pdf",
      download_filename: "tailored.pdf",
      export_template: "classic",
      created_at: "2026-06-01T01:00:00.000Z",
    }],
  });

  assert.equal(payload.account.displayName, "Avery Stone");
  assert.equal(payload.savedProjects[0].title, "Product Manager");
  assert.equal(payload.tailoringRuns[0].downloadFilename, "tailored.pdf");
  assert.equal(JSON.stringify(payload).includes("stripe_"), false);
  assert.equal(JSON.stringify(payload).includes("downloadUrl"), false);
});

test("creates filesystem-safe account export filenames", () => {
  assert.equal(
    accountExportFilename("Avery+Test@Example.COM", new Date("2026-06-01T00:00:00.000Z")),
    "roleforge-account-summary-avery-test-at-example.com-2026-06-01.json",
  );
});
