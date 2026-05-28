import assert from "node:assert/strict";
import test from "node:test";

import { tailorActionState, type TailorActionInput } from "./tailorAction";

const readyInput: TailorActionInput = {
  accountConfigured: true,
  signedIn: true,
  limitReached: false,
  busy: false,
  readingResume: false,
  restoredWithoutFile: false,
  hasResult: false,
  hasFile: true,
  hasTarget: true,
  backendReady: true,
};

test("allows a complete signed-in workflow to run", () => {
  assert.deepEqual(tailorActionState(readyInput), {
    canRun: true,
    label: "Run Tailor",
    disabledReason: "",
  });
});

test("tells users to upload before the first run", () => {
  assert.deepEqual(tailorActionState({ ...readyInput, hasFile: false, hasTarget: false }), {
    canRun: false,
    label: "Upload to run",
    disabledReason: "Upload a resume file before running Tailor.",
  });
});

test("tells users to add a target after selecting a resume", () => {
  assert.deepEqual(tailorActionState({ ...readyInput, hasTarget: false }), {
    canRun: false,
    label: "Add target to run",
    disabledReason: "Add a job target before running Tailor.",
  });
});

test("distinguishes restored runs that need the source file again", () => {
  assert.deepEqual(tailorActionState({ ...readyInput, hasFile: false, hasResult: true, restoredWithoutFile: true }), {
    canRun: false,
    label: "Upload to re-tailor",
    disabledReason: "Upload the source resume again before re-tailoring this restored run.",
  });
});

test("keeps re-tailor available after a completed run when source and target are present", () => {
  assert.deepEqual(tailorActionState({ ...readyInput, hasResult: true }), {
    canRun: true,
    label: "Re-tailor",
    disabledReason: "",
  });
});

test("prioritizes account, usage, and busy blockers", () => {
  assert.equal(tailorActionState({ ...readyInput, signedIn: false }).label, "Sign in to run");
  assert.equal(tailorActionState({ ...readyInput, limitReached: true }).label, "Monthly limit reached");
  assert.equal(tailorActionState({ ...readyInput, busy: true }).label, "Tailoring...");
  assert.equal(tailorActionState({ ...readyInput, readingResume: true }).label, "Reading resume...");
});

test("uses customer-facing copy when tailoring is temporarily unavailable", () => {
  assert.deepEqual(tailorActionState({ ...readyInput, backendReady: false }), {
    canRun: false,
    label: "Run Tailor",
    disabledReason: "Resume tailoring is temporarily unavailable. Try again shortly.",
  });
});
