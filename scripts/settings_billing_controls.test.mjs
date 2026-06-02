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

test("settings billing panel explains portal, cancellation, and support paths", () => {
  assert.match(settingsPage, /billingControlItems/);
  assert.match(settingsPage, /settings-billing-control-list/);
  assert.match(settingsPage, /aria-label="Billing controls and access details"/);
  assert.match(settingsPage, /Subscription controls/);
  assert.match(settingsPage, /Manage billing opens Stripe for cancellation, invoices, and payment method changes\./);
  assert.match(settingsPage, /Access through period end/);
  assert.match(settingsPage, /DOCX, TXT, and unlimited runs stay available until \$\{premiumEndLabel\}\./);
  assert.match(settingsPage, /Support opens with this billing page attached/);
  assert.match(settingsPage, /Checkout opens in Stripe and Premium activates after the subscription syncs\./);
  assert.match(stylesheet, /\.settings-billing-control-list\s*\{(?=[^}]*display:\s*grid)(?=[^}]*border-block:\s*1px solid var\(--line\))[^}]*\}/s);
  assert.match(stylesheet, /\.settings-billing-control-item\s*\{(?=[^}]*grid-template-columns:\s*34px minmax\(0,\s*1fr\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-billing-control-item strong,\s*\.settings-billing-control-item small\s*\{(?=[^}]*overflow-wrap:\s*anywhere)[^}]*\}/s);
});

test("settings account panel includes an editable profile display name", () => {
  assert.match(settingsPage, /updateAccountProfileAction/);
  assert.match(settingsPage, /saveAccountProfile\(supabase,\s*user/);
  assert.match(settingsPage, /name="displayName"/);
  assert.match(settingsPage, /maxLength=\{80\}/);
  assert.match(settingsPage, /defaultValue=\{displayName\}/);
  assert.match(settingsPage, /Save name/);
  assert.match(settingsPage, /href="\/api\/account\/export"/);
  assert.match(settingsPage, /Download summary/);
  assert.match(stylesheet, /\.settings-profile-form\s*\{[^}]*max-width:\s*min\(100%,\s*560px\)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-profile-edit-row\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*minmax\(min\(100%,\s*138px\),\s*auto\)[^}]*\}/s);
});

test("settings account panel supports authenticated email changes", () => {
  assert.match(settingsPage, /updateAccountEmailAction/);
  assert.match(settingsPage, /validateAccountEmail\(formData\.get\("email"\),\s*user\.email\)/);
  assert.match(settingsPage, /supabase\.auth\.updateUser/);
  assert.match(settingsPage, /emailRedirectTo/);
  assert.match(settingsPage, /id="account-email"/);
  assert.match(settingsPage, /name="email"/);
  assert.match(settingsPage, /Update email/);
  assert.match(settingsPage, /confirmation links to your current and new email/);
  assert.match(settingsPage, /email-change-sent/);
});

test("settings security panel uses real Supabase account metadata", () => {
  assert.match(settingsPage, /accountSignInMethodLabel\(user\)/);
  assert.match(settingsPage, /accountEmailVerificationLabel\(user\)/);
  assert.match(settingsPage, /accountSecurityDateLabel\(user\.last_sign_in_at\)/);
  assert.match(settingsPage, /accountSecurityDateLabel\(user\.created_at\)/);
  assert.match(settingsPage, /id="security"/);
  assert.match(settingsPage, /Sign-in method/);
  assert.match(settingsPage, /Email status/);
  assert.match(settingsPage, /Last sign-in/);
  assert.match(settingsPage, /Account created/);
  assert.match(settingsPage, /Password, passkey, or 2FA controls appear here only after those account methods are enabled/);
});

test("settings account panel exposes guarded account deletion", () => {
  assert.match(settingsPage, /id="account-danger"/);
  assert.match(settingsPage, /action="\/api\/account\/delete"/);
  assert.match(settingsPage, /name="confirmation"/);
  assert.match(settingsPage, /Type DELETE/);
  assert.match(settingsPage, /Cancel Premium from Manage billing before deleting this account\./);
  assert.match(stylesheet, /\.settings-danger-zone\s*\{/);
  assert.match(stylesheet, /\.settings-danger-button\s*\{/);
});

test("inactive settings billing action does not animate like a clickable control", () => {
  assert.match(stylesheet, /\.settings-disabled-action\s*\{[^}]*cursor:\s*default[^}]*opacity:\s*0\.78[^}]*\}/s);
  assert.match(stylesheet, /\.settings-disabled-action:hover\s*\{[^}]*transform:\s*none[^}]*\}/s);
});
