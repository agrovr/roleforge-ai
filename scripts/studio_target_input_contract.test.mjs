import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const capabilities = readFileSync("app/lib/workflowCapabilities.ts", "utf8");
const studioPage = readFileSync("app/app/page.tsx", "utf8");
const smoke = readFileSync("scripts/smoke_frontend.mjs", "utf8");

test("studio consumes the backend job-description limit with a safe fallback", () => {
  assert.match(capabilities, /max_job_description_chars:\s*number/);
  assert.match(capabilities, /DEFAULT_MAX_JOB_DESCRIPTION_CHARS = 30000/);
  assert.match(capabilities, /max_job_description_chars:\s*readPositiveInteger\(record\?\.max_job_description_chars, DEFAULT_MAX_JOB_DESCRIPTION_CHARS\)/);
  assert.match(studioPage, /const maxJobDescriptionChars = capabilities\?\.max_job_description_chars \?\? DEFAULT_MAX_JOB_DESCRIPTION_CHARS/);
  assert.match(studioPage, /maxJobDescriptionChars,/);
  assert.match(smoke, /Number\.isSafeInteger\(payload\.max_job_description_chars\) && payload\.max_job_description_chars > 0/);
});

test("studio blocks invalid active targets and keeps inactive target state out of payloads", () => {
  assert.match(studioPage, /const targetInvalid = targetInput\.invalid/);
  assert.match(studioPage, /hasTarget && !targetInvalid/);
  assert.match(studioPage, /targetInvalid,/);
  assert.match(studioPage, /const runDisabledReason = targetInvalid && tailorAction\.label === "Fix job target"\s*\? targetInput\.disabledReason\s*:\s*tailorAction\.disabledReason/s);
  assert.match(studioPage, /Object\.assign\(payload, activeTargetPayload/);
  assert.doesNotMatch(studioPage, /if \(jdText\.trim\(\)\) payload\.jd_text/);
  assert.doesNotMatch(studioPage, /if \(normalizedJobUrl\) payload\.jd_url/);
});
