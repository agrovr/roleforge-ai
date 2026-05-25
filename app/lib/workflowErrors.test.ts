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
});

test("keeps unknown API messages and falls back when the response is not JSON", async () => {
  const known = await readApiError(new Response(JSON.stringify({
    error: { code: "invalid_resume", message: "Upload a readable PDF, DOCX, or TXT file." },
  }), { status: 400 }), "Fallback copy.");

  assert.equal(workflowErrorFromCaught(known, "Fallback copy.").message, "Upload a readable PDF, DOCX, or TXT file.");

  const unknown = await readApiError(new Response("not-json", { status: 500 }), "Fallback copy.");
  assert.equal(workflowErrorFromCaught(unknown, "Fallback copy.").message, "Fallback copy.");
});
