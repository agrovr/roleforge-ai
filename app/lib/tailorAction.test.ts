import assert from "node:assert/strict";
import test from "node:test";

import { tailorActionState, type TailorActionInput } from "./tailorAction";

const readyInput: TailorActionInput = {
  accountConfigured: true,
  signedIn: true,
  limitReached: false,
  busy: false,
  readingResume: false,
  uploadFailed: false,
  restoredWithoutFile: false,
  hasResult: false,
  hasFile: true,
  hasTarget: true,
  targetInvalid: false,
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

test("requires a replacement after the resume upload fails", () => {
  assert.deepEqual(tailorActionState({ ...readyInput, uploadFailed: true }), {
    canRun: false,
    label: "Replace resume",
    disabledReason: "Replace the resume file before running Tailor.",
  });
});

test("blocks an invalid active job target", () => {
  assert.deepEqual(tailorActionState({ ...readyInput, targetInvalid: true }), {
    canRun: false,
    label: "Fix job target",
    disabledReason: "Fix the active job target before running Tailor.",
  });
  assert.deepEqual(tailorActionState({ ...readyInput, hasFile: false, targetInvalid: true }), {
    canRun: false,
    label: "Upload to run",
    disabledReason: "Upload a resume file before running Tailor.",
  });
  assert.equal(tailorActionState({ ...readyInput, signedIn: false, targetInvalid: true }).disabledReason, "Sign in before running the studio workflow.");
  assert.equal(tailorActionState({ ...readyInput, limitReached: true, targetInvalid: true }).disabledReason, "Your free monthly run limit is reached. Upgrade or wait for the next cycle.");
});

test("prioritizes account, usage, and busy blockers", () => {
  assert.equal(tailorActionState({ ...readyInput, signedIn: false }).label, "Sign in to run");
  assert.equal(tailorActionState({ ...readyInput, limitReached: true }).label, "Monthly limit reached");
  assert.equal(tailorActionState({ ...readyInput, busy: true }).label, "Tailoring...");
  assert.equal(tailorActionState({ ...readyInput, readingResume: true }).label, "Reading resume...");
  assert.equal(tailorActionState({ ...readyInput, uploadFailed: true }).label, "Replace resume");
  assert.equal(tailorActionState({ ...readyInput, targetInvalid: true }).label, "Fix job target");
});

test("uses customer-facing copy when tailoring is temporarily unavailable", () => {
  assert.deepEqual(tailorActionState({ ...readyInput, backendReady: false }), {
    canRun: false,
    label: "Run Tailor",
    disabledReason: "Resume tailoring is temporarily unavailable. Try again shortly.",
  });
});
