import test from "node:test";
import assert from "node:assert/strict";

import { parseTargetUrl } from "./targetLabel";

test("uses company slugs from common job boards", () => {
  assert.deepEqual(parseTargetUrl("https://job-boards.greenhouse.io/affirm/jobs/7675533003"), {
    host: "job-boards.greenhouse.io",
    label: "Affirm job target",
  });

  assert.deepEqual(parseTargetUrl("https://jobs.lever.co/stripe/123"), {
    host: "jobs.lever.co",
    label: "Stripe job target",
  });

  assert.deepEqual(parseTargetUrl("https://jobs.ashbyhq.com/roleforge-ai/example"), {
    host: "jobs.ashbyhq.com",
    label: "RoleForge AI job target",
  });

  assert.deepEqual(parseTargetUrl("https://jobs.smartrecruiters.com/affirm/744000063770175"), {
    host: "jobs.smartrecruiters.com",
    label: "Affirm job target",
  });

  assert.deepEqual(parseTargetUrl("https://apply.workable.com/roleforge-ai/j/1234567890"), {
    host: "apply.workable.com",
    label: "RoleForge AI job target",
  });
});

test("preserves common acronym and brand casing in readable URL labels", () => {
  assert.deepEqual(parseTargetUrl("https://www.roleforge-ai.com/careers"), {
    host: "roleforge-ai.com",
    label: "RoleForge AI job target",
  });

  assert.deepEqual(parseTargetUrl("https://api-first.dev/jobs"), {
    host: "api-first.dev",
    label: "API First job target",
  });
});

test("falls back to readable domains for normal career sites", () => {
  assert.deepEqual(parseTargetUrl("https://www.dropbox.jobs/en/jobs/7421121"), {
    host: "dropbox.jobs",
    label: "Dropbox job target",
  });
});

test("ignores pasted job descriptions that are not URLs", () => {
  assert.equal(parseTargetUrl("Senior engineer role with API ownership"), null);
});
