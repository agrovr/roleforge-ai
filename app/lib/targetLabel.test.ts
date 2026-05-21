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
    label: "Roleforge AI job target",
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
