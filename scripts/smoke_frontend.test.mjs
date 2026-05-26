import assert from "node:assert/strict";
import { test } from "node:test";

import {
  cookieHeaderFromSession,
  createCookieChunks,
  mergeSetCookieHeaders,
  parseCookieHeader,
  supabaseStorageKey,
} from "./smoke_frontend.mjs";

function buildSession(overrides = {}) {
  return {
    access_token: "access-token",
    refresh_token: "refresh-token",
    expires_in: 3600,
    expires_at: 1_800_000_000,
    token_type: "bearer",
    user: {
      id: "user-id",
      aud: "authenticated",
      email: "smoke@example.com",
      app_metadata: {},
      user_metadata: {},
    },
    ...overrides,
  };
}

test("derives the Supabase SSR auth cookie storage key from the project URL", () => {
  assert.equal(
    supabaseStorageKey("https://ijdspodwpkuhwszmvqip.supabase.co"),
    "sb-ijdspodwpkuhwszmvqip-auth-token",
  );
});

test("builds the same base64-prefixed cookie shape used by Supabase SSR", () => {
  const cookie = cookieHeaderFromSession("https://ijdspodwpkuhwszmvqip.supabase.co", buildSession());
  const jar = parseCookieHeader(cookie);
  const value = jar.get("sb-ijdspodwpkuhwszmvqip-auth-token");

  assert.ok(value?.startsWith("base64-"));

  const payload = JSON.parse(Buffer.from(value.slice("base64-".length), "base64url").toString("utf8"));
  assert.equal(payload.access_token, "access-token");
  assert.equal(payload.refresh_token, "refresh-token");
  assert.equal(payload.user.id, "user-id");
});

test("chunks large Supabase cookie values using numbered cookie names", () => {
  const chunks = createCookieChunks("sb-project-auth-token", `base64-${"a".repeat(7000)}`);

  assert.equal(chunks.length, 3);
  assert.deepEqual(
    chunks.map((chunk) => chunk.name),
    ["sb-project-auth-token.0", "sb-project-auth-token.1", "sb-project-auth-token.2"],
  );
  assert.ok(chunks.every((chunk) => encodeURIComponent(chunk.value).length <= 3180));
});

test("merges refreshed Set-Cookie values into an existing smoke cookie jar", () => {
  const response = new Response(null, {
    headers: {
      "set-cookie": "sb-project-auth-token=refreshed; Path=/; HttpOnly",
    },
  });

  const merged = mergeSetCookieHeaders("sb-project-auth-token=old; theme=dark", response);
  const jar = parseCookieHeader(merged);

  assert.equal(jar.get("sb-project-auth-token"), "refreshed");
  assert.equal(jar.get("theme"), "dark");
});

test("removes expired Set-Cookie values from the smoke cookie jar", () => {
  const response = new Response(null, {
    headers: {
      "set-cookie": "sb-project-auth-token=; Path=/; Max-Age=0",
    },
  });

  const merged = mergeSetCookieHeaders("sb-project-auth-token=old; theme=dark", response);
  const jar = parseCookieHeader(merged);

  assert.equal(jar.has("sb-project-auth-token"), false);
  assert.equal(jar.get("theme"), "dark");
});
