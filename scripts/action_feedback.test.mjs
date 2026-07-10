import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const actionButton = readFileSync("app/components/ActionSubmitButton.tsx", "utf8");
const nativeActionForm = readFileSync("app/components/NativeActionForm.tsx", "utf8");
const loginPage = readFileSync("app/login/page.tsx", "utf8");
const settingsPage = readFileSync("app/settings/page.tsx", "utf8");
const stylesheet = readFileSync("app/globals.css", "utf8");

test("shared action buttons expose the active submission without allowing duplicate submits", () => {
  assert.match(actionButton, /useFormStatus\(\)/);
  assert.match(actionButton, /data\?\.get\(name\) === value/);
  assert.match(actionButton, /useNativeActionFormStatus\(\)/);
  assert.match(actionButton, /const submitKey = useId\(\)/);
  assert.match(actionButton, /nativeStatus\.submitKey === submitKey/);
  assert.match(actionButton, /data-submit-key=\{submitKey\}/);
  assert.match(nativeActionForm, /onSubmit=\{\(event\) =>/);
  assert.match(nativeActionForm, /event\.nativeEvent as SubmitEvent/);
  assert.match(nativeActionForm, /flushSync/);
  assert.match(actionButton, /aria-busy=\{activeSubmission \? "true" : undefined\}/);
  assert.match(actionButton, /disabled=\{disabled \|\| formPending\}/);
  assert.match(stylesheet, /\.action-submit-spinner\s*\{[^}]*animation:\s*action-submit-spin/s);
  assert.match(stylesheet, /\.action-submit\.is-pending:disabled\s*\{(?=[^}]*cursor:\s*progress)(?=[^}]*opacity:\s*0\.86)[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.primary-button\.action-submit\.is-pending:disabled/);
  assert.match(stylesheet, /prefers-reduced-motion:\s*reduce[\s\S]*?\.action-submit-spinner\s*\{[^}]*animation:\s*none/s);
});

test("email sign-in reports that the secure link request is in progress", () => {
  assert.match(loginPage, /ActionSubmitButton/);
  assert.match(loginPage, /<NativeActionForm className="studio-account-form" action="\/auth\/signin">/);
  assert.match(loginPage, /label="Send sign-in link"/);
  assert.match(loginPage, /pendingLabel="Sending secure link…"/);
  assert.match(loginPage, /action="\/auth\/signin"/);
});

test("settings account and preference forms report pending work", () => {
  assert.match(settingsPage, /pendingLabel="Saving name…"/);
  assert.match(settingsPage, /pendingLabel="Sending confirmation…"/);
  assert.match(settingsPage, /pendingLabel="Saving direction…"/);
  assert.match(settingsPage, /pendingLabel="Saving preferences…"/);
  assert.match(settingsPage, /pendingLabel="Deleting account…"/);
});

test("saved project controls identify only the submitted operation as pending", () => {
  assert.match(settingsPage, /name="status"[\s\S]*?pendingLabel="Updating…"[\s\S]*?value=\{option\.status\}/);
  assert.match(settingsPage, /<ActionSubmitButton label="Save" pendingLabel="Saving…" \/>/);
  assert.match(settingsPage, /<ActionSubmitButton label="Remove" pendingLabel="Removing…" \/>/);
  assert.match(stylesheet, /\.settings-project-stage-controls button:disabled:not\(\.active\):not\(\.is-pending\)/);
});

test("settings results are placed beside the anchor-targeted section", () => {
  assert.match(settingsPage, /function accountNoticeArea/);
  assert.match(settingsPage, /profileNoticeArea === "account"/);
  assert.match(settingsPage, /profileNoticeArea === "data-privacy"/);
  assert.match(settingsPage, /profileNoticeArea === "preferences"/);
  assert.match(settingsPage, /profileNoticeArea === "projects"/);
  assert.match(settingsPage, /settings-section-panel settings-billing-panel[\s\S]*?\{notice \? \(/);
  assert.match(settingsPage, /settings-action-notice[^>]*role="status" aria-live="polite"/);
});
