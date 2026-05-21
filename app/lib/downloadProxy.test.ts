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

test("falls back for empty or non-json upstream responses", async () => {
  const payload = await readDownloadProxyError(new Response("", { status: 402 }));

  assert.deepEqual(payload, {
    error: "This export could not be downloaded.",
  });
});
