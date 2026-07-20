import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  deploymentCommitFromHtml,
  waitForVercelDeployment,
} from "./wait_for_vercel_status.mjs";

const SHA = "270fc07685e825e288e52b51946b532b8c9581a0";
const layout = readFileSync("app/layout.tsx", "utf8");
const workflow = readFileSync(".github/workflows/ci.yml", "utf8");

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload;
    },
  };
}

function htmlResponse(html, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return html;
    },
  };
}

test("production publishes the Vercel commit marker used by the CI fallback", () => {
  assert.match(layout, /process\.env\.VERCEL_GIT_COMMIT_SHA/);
  assert.match(layout, /"roleforge-deployment-commit":\s*deploymentCommit/);
  assert.match(workflow, /ROLEFORGE_SITE_URL:\s*https:\/\/roleforgeai\.vercel\.app/);
});

test("reads the exact Vercel commit marker regardless of meta attribute order", () => {
  assert.equal(
    deploymentCommitFromHtml(`<meta name="roleforge-deployment-commit" content="${SHA}">`),
    SHA,
  );
  assert.equal(
    deploymentCommitFromHtml(`<meta content='${SHA}' data-note="safe" name='roleforge-deployment-commit'>`),
    SHA,
  );
  assert.equal(deploymentCommitFromHtml("<meta name=\"description\" content=\"RoleForge\">"), null);
});

test("accepts the exact production marker when the Vercel commit status is absent", async () => {
  const messages = [];
  const result = await waitForVercelDeployment({
    repository: "agrovr/roleforge-ai",
    sha: SHA,
    token: "test-token",
    siteUrl: "https://roleforgeai.vercel.app",
    timeoutMs: 100,
    intervalMs: 1,
    fetchImpl: async (input) => String(input).includes("api.github.com")
      ? jsonResponse({ statuses: [] })
      : htmlResponse(`<meta name="roleforge-deployment-commit" content="${SHA}">`),
    sleepImpl: async () => {},
    now: () => 0,
    logger: {
      log(message) {
        messages.push(message);
      },
      warn(message) {
        messages.push(message);
      },
    },
  });

  assert.equal(result, "production-marker");
  assert.match(messages.join("\n"), /Production is serving deployment 270fc07/);
});

test("falls back to the production marker when GitHub status requests return 503", async () => {
  const result = await waitForVercelDeployment({
    repository: "agrovr/roleforge-ai",
    sha: SHA,
    token: "test-token",
    siteUrl: "https://roleforgeai.vercel.app",
    timeoutMs: 100,
    intervalMs: 1,
    fetchImpl: async (input) => String(input).includes("api.github.com")
      ? jsonResponse({}, 503)
      : htmlResponse(`<meta content="${SHA}" name="roleforge-deployment-commit">`),
    sleepImpl: async () => {},
    now: () => 0,
    logger: { log() {}, warn() {} },
  });

  assert.equal(result, "production-marker");
});

test("still fails immediately when Vercel reports a real deployment error", async () => {
  await assert.rejects(
    waitForVercelDeployment({
      repository: "agrovr/roleforge-ai",
      sha: SHA,
      token: "test-token",
      siteUrl: "https://roleforgeai.vercel.app",
      timeoutMs: 100,
      intervalMs: 1,
      fetchImpl: async () => jsonResponse({
        statuses: [{ context: "Vercel", state: "failure", description: "Build failed" }],
      }),
      sleepImpl: async () => {},
      now: () => 0,
      logger: { log() {}, warn() {} },
    }),
    /Vercel deployment failure: Build failed/,
  );
});
