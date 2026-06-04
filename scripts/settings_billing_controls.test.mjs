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
  assert.match(settingsPage, /inactiveBillingActionLabel\s*=\s*premiumActive\s*\?\s*"Billing unavailable right now"\s*:\s*"Premium checkout unavailable"/);
  assert.match(settingsPage, /\{inactiveBillingActionLabel\}/);
  assert.match(settingsPage, /aria-disabled="true"/);
  assert.match(settingsPage, /Billing management is unavailable right now\./);
  assert.match(settingsPage, /Premium checkout is unavailable right now\./);
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

test("settings billing panel surfaces plan renewal and status information", () => {
  assert.match(settingsPage, /planInformationItems/);
  assert.match(settingsPage, /formatPlanDate\(entitlement\.currentPeriodEnd\)/);
  assert.match(settingsPage, /billingDateTitle\s*=\s*premiumEnding\s*\?\s*"Access ends"\s*:\s*premiumActive\s*\?\s*"Next renewal"\s*:\s*"Billing date"/);
  assert.match(settingsPage, /aria-label="Plan information"/);
  assert.match(settingsPage, /Premium features stay available through this date\./);
  assert.match(settingsPage, /Stripe manages renewal, invoices, and payment methods\./);
  assert.match(settingsPage, /No renewal date while this account is on Free\./);
  assert.match(settingsPage, /detail:\s*billingDetail/);
  assert.match(stylesheet, /\.settings-plan-info\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\))[^}]*\}/s);
  assert.match(stylesheet, /\.settings-plan-info-item\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*border:\s*1px solid var\(--line\))[^}]*\}/s);
  assert.match(stylesheet, /\.settings-plan-info-item span,\s*\.settings-plan-info-item strong,\s*\.settings-plan-info-item small\s*\{(?=[^}]*overflow-wrap:\s*anywhere)[^}]*\}/s);
});

test("settings billing panel audits current plan access", () => {
  assert.match(settingsPage, /premiumDocumentExportsActive\s*=\s*entitlement\.exportFormats\.docx\s*&&\s*entitlement\.exportFormats\.txt/);
  assert.match(settingsPage, /planAccessItems/);
  assert.match(settingsPage, /aria-label="Plan access checklist"/);
  assert.match(settingsPage, /Access checklist/);
  assert.match(settingsPage, /What is active right now/);
  assert.match(settingsPage, /label:\s*"Tailoring runs"/);
  assert.match(settingsPage, /label:\s*"PDF export"/);
  assert.match(settingsPage, /label:\s*"DOCX and TXT"/);
  assert.match(settingsPage, /label:\s*"Billing path"/);
  assert.match(settingsPage, /value:\s*usage\.monthlyRunLimit === null \? "Unlimited"/);
  assert.match(settingsPage, /Completed runs can export PDF from Studio, History, and Settings\./);
  assert.match(settingsPage, /Upgrade to unlock DOCX and TXT exports for completed runs\./);
  assert.match(settingsPage, /Stripe billing management can open from this panel\./);
  assert.match(settingsPage, /className=\{`settings-plan-access-item \$\{item\.tone\}`\}/);
  assert.match(stylesheet, /\.settings-plan-access\s*\{(?=[^}]*display:\s*grid)(?=[^}]*border:\s*1px solid color-mix\(in srgb,\s*var\(--brand\) 22%,\s*var\(--line\)\))[^}]*\}/s);
  assert.match(stylesheet, /\.settings-plan-access-grid\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*178px\),\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-plan-access-item\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*34px minmax\(0,\s*1fr\))(?=[^}]*min-height:\s*128px)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-plan-access-item > div,\s*\.settings-plan-access-item span:not\(\.settings-plan-access-icon\),\s*\.settings-plan-access-item strong,\s*\.settings-plan-access-item small\s*\{(?=[^}]*overflow-wrap:\s*anywhere)[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-plan-access/);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-plan-access-item\.good/);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-plan-access-item\.warn/);
});

test("settings account panel includes an editable profile display name", () => {
  assert.match(settingsPage, /updateAccountProfileAction/);
  assert.match(settingsPage, /saveAccountProfile\(supabase,\s*user/);
  assert.match(settingsPage, /name="displayName"/);
  assert.match(settingsPage, /maxLength=\{80\}/);
  assert.match(settingsPage, /defaultValue=\{displayName\}/);
  assert.match(settingsPage, /Save name/);
  assert.match(settingsPage, /href="\/api\/account\/export"/);
  assert.match(settingsPage, /Export account record/);
  assert.match(settingsPage, /Download account, project, run, and support-reference details\./);
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
