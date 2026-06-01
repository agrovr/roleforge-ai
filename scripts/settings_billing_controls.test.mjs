import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const settingsPage = readFileSync("app/settings/page.tsx", "utf8");
const billingSubmitButton = readFileSync("app/settings/BillingSubmitButton.tsx", "utf8");
const stylesheet = readFileSync("app/globals.css", "utf8");

test("settings billing action distinguishes active portals from inactive billing state", () => {
  assert.match(settingsPage, /portalReady\s*\?\s*\(/);
  assert.match(settingsPage, /showCheckoutHeaderAction\s*=\s*!premiumActive\s*&&\s*checkoutReady/);
  assert.match(settingsPage, /action="\/api\/billing\/portal"/);
  assert.match(settingsPage, /action="\/api\/billing\/checkout"/);
  assert.match(settingsPage, /readyLabel="Manage billing"/);
  assert.match(settingsPage, /readyLabel="Start Premium"/);
  assert.match(settingsPage, /inactiveBillingActionLabel\s*=\s*premiumActive\s*\?\s*"Billing unavailable right now"\s*:\s*"Premium billing unavailable"/);
  assert.match(settingsPage, /\{inactiveBillingActionLabel\}/);
  assert.match(settingsPage, /aria-disabled="true"/);
  assert.match(settingsPage, /Billing management is unavailable right now\./);
  assert.match(settingsPage, /Premium billing is not accepting payments right now\./);
  assert.match(settingsPage, /Premium billing is paused while payments are prepared/);
  assert.doesNotMatch(settingsPage, /No billing portal yet/);
  assert.doesNotMatch(settingsPage, /type="submit"\s+disabled=\{!portalReady\}/);
});

test("settings billing submit buttons show progress while Stripe opens", () => {
  assert.match(billingSubmitButton, /useFormStatus/);
  assert.match(billingSubmitButton, /aria-busy=\{pending \? "true" : undefined\}/);
  assert.match(billingSubmitButton, /disabled=\{disabled\}/);
  assert.match(settingsPage, /pendingLabel="Opening checkout\.\.\."/);
  assert.match(settingsPage, /pendingLabel="Opening billing\.\.\."/);
});

test("settings account panel includes an editable profile display name", () => {
  assert.match(settingsPage, /updateAccountProfileAction/);
  assert.match(settingsPage, /saveAccountProfile\(supabase,\s*user/);
  assert.match(settingsPage, /name="displayName"/);
  assert.match(settingsPage, /maxLength=\{80\}/);
  assert.match(settingsPage, /defaultValue=\{displayName\}/);
  assert.match(settingsPage, /Save name/);
  assert.match(stylesheet, /\.settings-profile-form\s*\{[^}]*max-width:\s*min\(100%,\s*560px\)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-profile-edit-row\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*minmax\(min\(100%,\s*138px\),\s*auto\)[^}]*\}/s);
});

test("inactive settings billing action does not animate like a clickable control", () => {
  assert.match(stylesheet, /\.settings-disabled-action\s*\{[^}]*cursor:\s*default[^}]*opacity:\s*0\.78[^}]*\}/s);
  assert.match(stylesheet, /\.settings-disabled-action:hover\s*\{[^}]*transform:\s*none[^}]*\}/s);
});
