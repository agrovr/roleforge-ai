import assert from "node:assert/strict";
import test from "node:test";

import { activeTargetPayload, deriveTargetInputState } from "./targetInput";

test("treats only the active target mode as ready", () => {
  const textMode = deriveTargetInputState({
    mode: "text",
    jdText: "Product manager role",
    jdUrl: "not-a-url",
    normalizedJobUrl: null,
    maxJobDescriptionChars: 30000,
  });
  const urlMode = deriveTargetInputState({
    mode: "url",
    jdText: "Stale pasted description",
    jdUrl: "jobs.example.com/role",
    normalizedJobUrl: "https://jobs.example.com/role",
    maxJobDescriptionChars: 30000,
  });

  assert.equal(textMode.hasTarget, true);
  assert.equal(textMode.invalid, false);
  assert.equal(urlMode.hasTarget, true);
  assert.equal(urlMode.invalid, false);
});

test("reports an actionable over-limit state without truncating text", () => {
  const state = deriveTargetInputState({
    mode: "text",
    jdText: "a".repeat(30001),
    jdUrl: "",
    normalizedJobUrl: null,
    maxJobDescriptionChars: 30000,
  });

  assert.equal(state.hasTarget, true);
  assert.equal(state.invalid, true);
  assert.equal(state.descriptionTooLong, true);
  assert.equal(state.countLabel, "30,001 / 30,000 characters");
  assert.equal(state.disabledReason, "1 character over the 30,000 character limit. Shorten the pasted description to continue.");
  assert.equal(state.activeValue.length, 30001);
});

test("builds a payload from only the active target mode", () => {
  assert.deepEqual(activeTargetPayload({
    mode: "text",
    jdText: "  Pasted role  ",
    normalizedJobUrl: "https://jobs.example.com/ignored",
  }), { jd_text: "Pasted role" });
  assert.deepEqual(activeTargetPayload({
    mode: "url",
    jdText: "Ignored text",
    normalizedJobUrl: "https://jobs.example.com/role",
  }), { jd_url: "https://jobs.example.com/role" });
});
