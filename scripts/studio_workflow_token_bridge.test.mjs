import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const studioPage = await readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8");
const tokenRoute = await readFile(new URL("../app/api/auth/workflow-token/route.ts", import.meta.url), "utf8");

test("Studio requests a short-lived workflow token without shipping the Supabase browser SDK", () => {
  assert.doesNotMatch(studioPage, /createRoleForgeBrowserClient|supabaseClient\.auth\.getSession/);
  assert.match(studioPage, /fetch\("\/api\/auth\/workflow-token",\s*\{[\s\S]*?cache:\s*"no-store"[\s\S]*?credentials:\s*"include"/);
  assert.match(studioPage, /workflowAccessTokenRef/);
  assert.match(studioPage, /workflowTokenGenerationRef/);
  assert.match(studioPage, /accountSessionKey\s*=\s*`\$\{accountUser\?\.reference[\s\S]*?\|\$\{accountUser\?\.email/);
  assert.match(studioPage, /refreshBufferMs\s*=\s*60_000/);
  assert.match(studioPage, /generation\s*!==\s*workflowTokenGenerationRef\.current/);
  assert.match(studioPage, /workflowTokenRequestRef\.current\s*===\s*request/);
  assert.match(studioPage, /requestIdleCallback\(warmWorkflowSession,\s*\{\s*timeout:\s*1_800\s*\}\)/);
  assert.match(studioPage, /setTimeout\(warmWorkflowSession,\s*1_600\)/);
  assert.match(studioPage, /Authorization:\s*`Bearer \$\{token\.accessToken\}`/);
});

test("workflow token route validates claims, returns only the access token, and keeps responses private", () => {
  assert.match(tokenRoute, /supabase\.auth\.getClaims\(\)/);
  assert.match(tokenRoute, /claimsData\?\.claims\?\.sub/);
  assert.match(tokenRoute, /supabase\.auth\.getSession\(\)/);
  assert.match(tokenRoute, /accessToken:\s*session\.access_token/);
  assert.match(tokenRoute, /expiresAt:\s*session\.expires_at/);
  assert.match(tokenRoute, /withSupabaseCookies/);
  assert.doesNotMatch(tokenRoute, /refresh[_A-Za-z]*Token|refresh_token/);
});
