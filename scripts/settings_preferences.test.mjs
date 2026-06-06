import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const settingsPage = readFileSync("app/settings/page.tsx", "utf8");
const stylesheet = readFileSync("app/globals.css", "utf8");

test("settings preferences save the default resume direction through the shared template cookie", () => {
  assert.match(settingsPage, /updateTemplatePreferenceAction/);
  assert.match(settingsPage, /isResumeTemplateSlug\(template\)/);
  assert.match(settingsPage, /cookieStore\.set\(RESUME_TEMPLATE_COOKIE,\s*template/);
  assert.match(settingsPage, /account=template-saved#preferences/);
  assert.match(settingsPage, /account=template-invalid#preferences/);
});

test("settings preferences save communication preferences through the profile record", () => {
  assert.match(settingsPage, /updateCommunicationPreferenceAction/);
  assert.match(settingsPage, /saveCommunicationPreferences\(supabase,\s*user/);
  assert.match(settingsPage, /formData\.get\("productUpdates"\)\s*===\s*"on"/);
  assert.match(settingsPage, /account=communication-saved#communication-preferences/);
  assert.match(settingsPage, /account=communication-unavailable#communication-preferences/);
});

test("settings preferences expose all resume templates as account controls", () => {
  assert.match(settingsPage, /id="preferences"/);
  assert.match(settingsPage, /RESUME_TEMPLATES\.map/);
  assert.match(settingsPage, /settings-template-grid/);
  assert.match(settingsPage, /settings-template-card/);
  assert.match(settingsPage, /name="template"/);
  assert.match(settingsPage, /Set default/);
  assert.match(settingsPage, /Open in studio/);
});

test("settings preferences expose communication controls without hiding required notices", () => {
  assert.match(settingsPage, /id="communication-preferences"/);
  assert.match(settingsPage, /name="productUpdates"/);
  assert.match(settingsPage, /Product updates/);
  assert.match(settingsPage, /Account and security notices/);
  assert.match(settingsPage, /Billing and subscription notices/);
  assert.match(settingsPage, /Support request follow-up/);
  assert.match(settingsPage, /Save communication preferences/);
});

test("settings preference cards are overflow-safe", () => {
  assert.match(stylesheet, /\.settings-template-grid\s*\{(?=[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*238px\),\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-template-card\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*overflow:\s*hidden)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-template-button\s*\{(?=[^}]*width:\s*100%)(?=[^}]*min-width:\s*0)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-communication-card\s*\{(?=[^}]*grid-template-columns:\s*minmax\(0,\s*0\.88fr\)\s+minmax\(280px,\s*1\.12fr\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-required-notices\s*\{(?=[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*170px\),\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-communication-card\s*\{/);
});
