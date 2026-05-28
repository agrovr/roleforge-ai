import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildSmokeSavedRunPayload,
  checkSignedInBackendWorkflowBridge,
  cookieHeaderFromSession,
  createCookieChunks,
  mergeSetCookieHeaders,
  parseSmokeArgs,
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

test("builds a cleanup-safe saved-project smoke payload", () => {
  const payload = buildSmokeSavedRunPayload({
    id: "roleforge-smoke-fixed",
    createdAt: "2026-05-26T18:00:00.000Z",
  });

  assert.equal(payload.id, "roleforge-smoke-fixed");
  assert.equal(payload.mode, "balanced");
  assert.equal(payload.downloadUrl, "/api/workflow/download/roleforge-smoke-tailored-resume.pdf");
  assert.equal(payload.downloadFormat, "pdf");
  assert.equal(payload.payload.studioSnapshot.result.tailored_text, "Smoke tailored draft");
  assert.equal(payload.payload.studioSnapshot.downloads.pdf, payload.downloadUrl);
  assert.equal(payload.payload.studioSnapshot.templateSlug, "classic");
});

test("parses frontend smoke CLI target options", () => {
  assert.deepEqual(
    parseSmokeArgs([
      "--base-url",
      "http://127.0.0.1:3036",
      "--backend-url=https://roleforge-api.example.run.app",
      "--canonical-url",
      "https://roleforgeai.vercel.app",
      "--require-signed-in-smoke",
      "--expect-premium-access",
      "--require-backend-workflow-smoke",
    ]),
    {
      baseUrl: "http://127.0.0.1:3036",
      backendUrl: "https://roleforge-api.example.run.app",
      canonicalUrl: "https://roleforgeai.vercel.app",
      requireSignedInSmoke: true,
      expectPremiumAccess: true,
      requireBackendWorkflowSmoke: true,
    },
  );
});

test("rejects unknown frontend smoke CLI options", () => {
  assert.throws(() => parseSmokeArgs(["--not-real"]), /Unknown argument/);
  assert.throws(() => parseSmokeArgs(["--base-url"]), /requires a value/);
});

test("backend workflow smoke bridges backend export through protected frontend download and saved projects", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  let savedVisible = true;

  globalThis.fetch = async (url, options = {}) => {
    const target = String(url);
    calls.push({ url: target, method: options.method || "GET", headers: options.headers || {}, body: options.body });

    if (target === "https://roleforge-api.example.run.app/upload") {
      assert.equal(options.method, "POST");
      assert.equal(options.headers.Authorization, "Bearer access-token");
      assert.ok(options.body instanceof FormData);
      return new Response(JSON.stringify({
        resume_id: "resume-123",
        filename: "roleforge-smoke-resume.txt",
        format: "txt",
        character_count: 320,
        text_preview: "Avery Stone\nProduct Operations Manager",
        text_preview_truncated: false,
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (target === "https://roleforge-api.example.run.app/export") {
      assert.equal(options.method, "POST");
      assert.equal(options.headers.Authorization, "Bearer access-token");
      const payload = JSON.parse(options.body);
      assert.equal(payload.format, "pdf");
      assert.equal(payload.template, "engineer");
      return new Response(JSON.stringify({
        download_filename: "run-123-roleforge-smoke-tailored-resume-engineer.pdf",
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (target === "https://roleforge.example/api/workflow/download/run-123-roleforge-smoke-tailored-resume-engineer.pdf") {
      assert.equal(options.headers.Cookie, "sb-project-auth-token=cookie");
      return new Response(options.method === "HEAD" ? null : "%PDF-1.4\n", {
        status: 200,
        headers: { "Content-Type": "application/pdf" },
      });
    }

    if (target === "https://roleforge.example/api/saved-runs" && options.method === "POST") {
      const payload = JSON.parse(options.body);
      assert.equal(payload.downloadUrl, "/api/workflow/download/run-123-roleforge-smoke-tailored-resume-engineer.pdf");
      assert.equal(payload.payload.studioSnapshot.templateSlug, "engineer");
      return new Response(JSON.stringify({ projectId: "project-123", runId: payload.id }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (target === "https://roleforge.example/api/saved-runs" && (!options.method || options.method === "GET")) {
      return new Response(JSON.stringify({
        runs: savedVisible
          ? [{
              id: calls.find((call) => call.url === "https://roleforge.example/api/saved-runs" && call.method === "POST")
                ? JSON.parse(calls.find((call) => call.url === "https://roleforge.example/api/saved-runs" && call.method === "POST").body).id
                : "roleforge-smoke-workflow-test",
              projectId: "project-123",
              downloadUrl: "/api/workflow/download/run-123-roleforge-smoke-tailored-resume-engineer.pdf",
              snapshot: {
                result: {
                  tailored_text: [
                    "Avery Stone",
                    "Product Operations Manager",
                    "avery@example.com",
                    "",
                    "Professional Summary",
                    "Product operations lead with launch planning, stakeholder communication, and execution-readiness experience.",
                    "",
                    "Experience",
                    "Project Lead, Operations",
                    "- Coordinated roadmap reviews across product, design, and engineering teams.",
                    "- Improved launch readiness with clearer risks, owners, and next steps.",
                    "",
                    "Skills",
                    "Roadmapping, Launch Planning, Stakeholder Communication",
                  ].join("\n"),
                },
              },
            }]
          : [],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (target === "https://roleforge.example/api/saved-runs/project-123" && options.method === "DELETE") {
      savedVisible = false;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected smoke request: ${options.method || "GET"} ${target}`);
  };

  try {
    const nextCookie = await checkSignedInBackendWorkflowBridge(
      "https://roleforge.example",
      "https://roleforge-api.example.run.app",
      "sb-project-auth-token=cookie",
      "access-token",
      { requireBackendWorkflowSmoke: true },
    );

    assert.equal(nextCookie, "sb-project-auth-token=cookie");
    assert.equal(calls.some((call) => call.method === "HEAD" && call.url.includes("/api/workflow/download/")), true);
    assert.equal(calls.some((call) => call.method === "DELETE" && call.url.endsWith("/api/saved-runs/project-123")), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
