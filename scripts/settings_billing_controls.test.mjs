import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const settingsPage = readFileSync("app/settings/page.tsx", "utf8");
const billingSubmitButton = readFileSync("app/settings/BillingSubmitButton.tsx", "utf8");
const actionSubmitButton = readFileSync("app/components/ActionSubmitButton.tsx", "utf8");
const nativeActionForm = readFileSync("app/components/NativeActionForm.tsx", "utf8");
const stylesheet = [readFileSync("app/globals.css", "utf8"), readFileSync("app/settings/settings.css", "utf8")].join("\n");

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
  assert.match(billingSubmitButton, /ActionSubmitButton/);
  assert.match(settingsPage, /<NativeActionForm action="\/api\/billing\/portal">/);
  assert.match(settingsPage, /<NativeActionForm action="\/api\/billing\/checkout">/);
  assert.match(nativeActionForm, /onSubmit/);
  assert.match(actionSubmitButton, /useFormStatus/);
  assert.match(actionSubmitButton, /aria-busy=\{activeSubmission \? "true" : undefined\}/);
  assert.match(actionSubmitButton, /disabled=\{disabled \|\| formPending\}/);
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

test("ending subscriptions show the access deadline beside the plan", () => {
  assert.match(settingsPage, /Premium access remains available until \$\{premiumEndLabel\}/);
});

test("billing groups plan information and controls under the billing section", () => {
  assert.match(settingsPage, /id="billing"[\s\S]*?planInformationItems\.map[\s\S]*?billingControlItems\.map/);
});

test("settings status pills keep readable contrast in dark mode", () => {
  assert.match(stylesheet, /\.settings-status-pill\s*\{(?=[^}]*display:\s*inline-flex)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-status-pill\s*\{(?=[^}]*color:\s*#e8dfce)[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-status-pill\.muted\s*\{(?=[^}]*border-color:\s*rgba\(255,\s*247,\s*233,\s*0\.26\))(?=[^}]*background:\s*rgba\(255,\s*247,\s*233,\s*0\.09\))(?=[^}]*color:\s*#d9d2bd)[^}]*\}/s);
});

test("settings account panel includes an editable profile display name", () => {
  assert.match(settingsPage, /SettingsDraftField fieldKey="displayName"/);
  assert.match(settingsPage, /maxLength=\{80\}/);
  assert.match(settingsPage, /Save name/);
  assert.match(settingsPage, /href="\/api\/account\/export"/);
  assert.match(settingsPage, /Export account record/);
  assert.match(settingsPage, /className="settings-profile-actions"[\s\S]*?Export account record/);
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

test("settings security panel gives actionable account review steps", () => {
  assert.match(settingsPage, /securityReviewItems/);
  assert.match(settingsPage, /aria-label="Security review checklist"/);
  assert.match(settingsPage, /settings-security-review/);
  assert.match(settingsPage, /Email confirmation/);
  assert.match(settingsPage, /Supabase marks this email as confirmed/);
  assert.match(settingsPage, /Use a fresh confirmation link or update the email/);
  assert.match(settingsPage, /Sign-in method/);
  assert.match(settingsPage, /Provider metadata is unavailable/);
  assert.match(settingsPage, /Account record/);
  assert.match(settingsPage, /Download account, project, run, and support-reference details before major account changes/);
  assert.match(settingsPage, /Security support/);
  assert.match(settingsPage, /Open an account-linked request if sign-in or email access looks wrong/);
  assert.match(settingsPage, /securityReviewItems\.map/);
  assert.match(stylesheet, /\.settings-security-review\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*224px\),\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-security-item\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*34px\s+minmax\(0,\s*1fr\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-security-copy\s+span,\s*\.settings-security-copy\s+strong,\s*\.settings-security-copy\s+small,\s*\.settings-security-action\s*\{(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-security-action\s*\{(?=[^}]*grid-column:\s*1\s*\/\s*-1)(?=[^}]*max-width:\s*100%)[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-security-item/);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-security-item\.warn/);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-security-copy\s+strong/);
});

test("settings data privacy panel exposes exports, policies, support, and guarded deletion", () => {
  assert.match(settingsPage, /id="data-privacy"/);
  assert.match(settingsPage, /dataPrivacyItems/);
  assert.match(settingsPage, /settings-data-privacy-grid/);
  assert.match(settingsPage, /aria-label="Data and privacy actions"/);
  assert.match(settingsPage, /Export account record/);
  assert.match(settingsPage, /href:\s*"\/api\/account\/export"/);
  assert.match(settingsPage, /Privacy policy/);
  assert.match(settingsPage, /href:\s*"\/privacy"/);
  assert.match(settingsPage, /Terms/);
  assert.match(settingsPage, /href:\s*"\/terms"/);
  assert.match(settingsPage, /Privacy support/);
  assert.match(settingsPage, /category:\s*"privacy"/);
  assert.match(settingsPage, /Privacy or data request/);
  assert.match(settingsPage, /contextUrl:\s*"\/settings#data-privacy"/);
  assert.match(settingsPage, /id="account-danger"/);
  assert.match(settingsPage, /action="\/api\/account\/delete"/);
  assert.match(settingsPage, /name="confirmation"/);
  assert.match(settingsPage, /Type DELETE/);
  assert.match(settingsPage, /Cancel Premium from Manage billing before deleting this account\./);
  assert.match(stylesheet, /\.settings-danger-zone\s*\{/);
  assert.match(stylesheet, /\.settings-danger-button\s*\{/);
  assert.match(stylesheet, /\.settings-data-privacy-grid\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*230px\),\s*1fr\)\))[^}]*\}/s);
  assert.match(stylesheet, /\.settings-data-privacy-item\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*36px minmax\(0,\s*1fr\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-data-privacy-copy strong,\s*\.settings-data-privacy-copy small,\s*\.settings-data-privacy-action\s*\{(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-data-privacy-item/);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-data-privacy-copy strong/);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-data-privacy-copy small/);
});

test("inactive settings billing action does not animate like a clickable control", () => {
  assert.match(stylesheet, /\.settings-disabled-action\s*\{[^}]*cursor:\s*default[^}]*opacity:\s*0\.78[^}]*\}/s);
  assert.match(stylesheet, /\.settings-disabled-action:hover\s*\{[^}]*transform:\s*none[^}]*\}/s);
});
