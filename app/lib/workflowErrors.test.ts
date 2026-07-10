import assert from "node:assert/strict";
import test from "node:test";
import { readApiError, workflowErrorFromCaught } from "./workflowErrors";

test("maps backend rate limit errors to customer-friendly workflow copy", async () => {
  const response = new Response(JSON.stringify({
    error: {
      code: "rate_limited",
      message: "Too many tailoring requests. Try again in a minute.",
      request_id: "req_123",
      details: { retry_after: 60 },
    },
  }), { status: 429 });

  const error = await readApiError(response, "Fallback copy.");
  const state = workflowErrorFromCaught(error, "Fallback copy.");

  assert.equal(state.message, "Too many tailoring requests are running right now. Wait a minute, then try again.");
  assert.equal(state.code, "rate_limited");
  assert.equal(state.requestId, "req_123");
  assert.deepEqual(state.details, { retry_after: 60 });
});

test("maps account verification failures without exposing backend phrasing", async () => {
  const response = new Response(JSON.stringify({
    error: {
      code: "usage_verification_failed",
      message: "Could not verify account usage. Try again.",
    },
  }), { status: 503 });

  const error = await readApiError(response, "Fallback copy.");
  const state = workflowErrorFromCaught(error, "Fallback copy.");

  assert.equal(state.message, "We could not check your plan usage. Wait a moment, then try again.");

  const entitlement = await readApiError(new Response(JSON.stringify({
    error: {
      code: "entitlement_verification_failed",
      message: "Premium entitlement lookup failed upstream.",
    },
  }), { status: 503 }), "Fallback copy.");

  assert.equal(
    workflowErrorFromCaught(entitlement, "Fallback copy.").message,
    "We could not verify Premium access. Your plan was not changed. Wait a moment, then try the export again.",
  );
});

test("maps auth and stale workflow failures without setup-shaped copy", async () => {
  const auth = await readApiError(new Response(JSON.stringify({
    error: {
      code: "auth_not_configured",
      message: "Account verification is not ready yet.",
    },
  }), { status: 503 }), "Fallback copy.");

  assert.equal(
    workflowErrorFromCaught(auth, "Fallback copy.").message,
    "Account sign-in is temporarily unavailable. Try again shortly.",
  );

  const missingResume = await readApiError(new Response(JSON.stringify({
    error: {
      code: "resume_not_found",
      message: "resume_id not found or expired",
    },
  }), { status: 404 }), "Fallback copy.");

  assert.equal(
    workflowErrorFromCaught(missingResume, "Fallback copy.").message,
    "Upload the source resume again before re-running Tailor.",
  );
});

test("maps job URL and export ownership failures to recovery copy", async () => {
  const jobUrl = await readApiError(new Response(JSON.stringify({
    error: {
      code: "job_url_fetch_failed",
      message: "ConnectTimeout: private upstream detail",
    },
  }), { status: 502 }), "Fallback copy.");

  assert.equal(
    workflowErrorFromCaught(jobUrl, "Fallback copy.").message,
    "We could not read that job post. Paste the job description or try the link again.",
  );

  const exportForbidden = await readApiError(new Response(JSON.stringify({
    error: {
      code: "export_forbidden",
      message: "This export belongs to a different account.",
    },
  }), { status: 403 }), "Fallback copy.");

  assert.equal(
    workflowErrorFromCaught(exportForbidden, "Fallback copy.").message,
    "This export belongs to another signed-in account.",
  );
});

test("keeps unknown API messages and falls back when the response is not JSON", async () => {
  const known = await readApiError(new Response(JSON.stringify({
    error: { code: "invalid_resume", message: "Upload a readable PDF, DOCX, or TXT file." },
  }), { status: 400 }), "Fallback copy.");

  assert.equal(workflowErrorFromCaught(known, "Fallback copy.").message, "Upload a readable PDF, DOCX, or TXT file.");

  const unknown = await readApiError(new Response("not-json", { status: 500 }), "Fallback copy.");
  assert.equal(workflowErrorFromCaught(unknown, "Fallback copy.").message, "Fallback copy.");
});
