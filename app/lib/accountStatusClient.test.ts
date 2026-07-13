import assert from "node:assert/strict";
import test from "node:test";

import { clearAccountStatusCache, loadAccountStatus, readCachedAccountStatus } from "./accountStatusClient";

test("deduplicates account status reads and reuses a short-lived result", async () => {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  let release: (() => void) | undefined;

  globalThis.fetch = async () => {
    requests += 1;
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    return new Response(JSON.stringify({ user: { email: "avery@example.com" } }));
  };

  try {
    clearAccountStatusCache();
    const first = loadAccountStatus<{ user: { email: string } }>();
    const second = loadAccountStatus<{ user: { email: string } }>();
    assert.equal(requests, 1);
    release?.();

    const [firstResult, secondResult] = await Promise.all([first, second]);
    assert.equal(firstResult.user.email, "avery@example.com");
    assert.equal(secondResult, firstResult);
    assert.equal(readCachedAccountStatus(), firstResult);

    const cachedResult = await loadAccountStatus();
    assert.equal(cachedResult, firstResult);
    assert.equal(requests, 1);
  } finally {
    clearAccountStatusCache();
    globalThis.fetch = originalFetch;
  }
});

test("force refresh replaces the cache and failed reads are retryable", async () => {
  const originalFetch = globalThis.fetch;
  let requests = 0;

  globalThis.fetch = async () => {
    requests += 1;
    if (requests === 1) return new Response("Unavailable", { status: 503 });
    return new Response(JSON.stringify({ revision: requests }));
  };

  try {
    clearAccountStatusCache();
    await assert.rejects(loadAccountStatus(), /temporarily unavailable/);
    assert.equal(readCachedAccountStatus(), undefined);

    const recovered = await loadAccountStatus<{ revision: number }>();
    assert.equal(recovered.revision, 2);

    const refreshed = await loadAccountStatus<{ revision: number }>({ force: true });
    assert.equal(refreshed.revision, 3);
    assert.equal(readCachedAccountStatus<{ revision: number }>()?.revision, 3);
  } finally {
    clearAccountStatusCache();
    globalThis.fetch = originalFetch;
  }
});
