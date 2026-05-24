import assert from "node:assert/strict";
import test from "node:test";

import { downloadProxyErrorPayload, readDownloadProxyError } from "./downloadProxy";

test("preserves backend download error code and message", () => {
  assert.deepEqual(
    downloadProxyErrorPayload({
      error: {
        code: "premium_required",
        message: "DOCX and TXT exports require premium access.",
      },
    }),
    {
      error: "DOCX and TXT exports require premium access.",
      code: "premium_required",
    },
  );
});

test("keeps string download errors compatible", () => {
  assert.deepEqual(downloadProxyErrorPayload({ error: "Sign in again to download this export." }), {
    error: "Sign in again to download this export.",
  });
});

test("uses status-aware fallbacks for empty or non-json upstream responses", async () => {
  const payload = await readDownloadProxyError(new Response("", { status: 402 }));

  assert.deepEqual(payload, {
    error: "This export requires an active Premium plan.",
    code: "premium_required",
  });

  assert.deepEqual(await readDownloadProxyError(new Response("", { status: 404 })), {
    error: "This export file is no longer available.",
    code: "export_not_found",
  });
});

test("keeps backend messages but fills missing codes from status", () => {
  assert.deepEqual(downloadProxyErrorPayload({ error: { message: "Premium required." } }, 402), {
    error: "Premium required.",
    code: "premium_required",
  });
});
