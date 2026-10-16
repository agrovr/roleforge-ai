import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const settingsPage = readFileSync("app/settings/page.tsx", "utf8");
const actions = readFileSync("app/settings/actions.ts", "utf8");
const drafts = readFileSync("app/settings/SettingsDrafts.tsx", "utf8");
const validation = readFileSync("app/lib/settingsDrafts.ts", "utf8");
const stylesheet = [readFileSync("app/globals.css", "utf8"), readFileSync("app/settings/settings.css", "utf8")].join("\n");

test("settings draft preferences keep shared cookie and authenticated profile persistence", () => {
  assert.match(actions, /supabase.auth.getUser/);
  assert.match(actions, /set\(RESUME_TEMPLATE_COOKIE, String\(value\)/);
  assert.match(validation, /isResumeTemplateSlug\(value\)/);
  assert.match(actions, /saveCommunicationPreferences\(supabase, user/);
  assert.match(settingsPage, /fieldKey="productUpdates"/);
});

test("settings directions use the catalog with explicit per-field saves", () => {
  assert.match(drafts, /RESUME_TEMPLATES.map/);
  assert.match(drafts, /save\(\["template"\]\)/);
  assert.match(drafts, /saved for this browser/);
  assert.match(settingsPage, /Account, billing, security, and support notices are unaffected/);
});

test("settings preference cards are overflow-safe", () => {
  assert.match(stylesheet, /\.settings-template-grid\s*\{(?=[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*238px\),\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-template-card\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*overflow:\s*hidden)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-template-button\s*\{(?=[^}]*width:\s*100%)(?=[^}]*min-width:\s*0)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-communication-card\s*\{(?=[^}]*grid-template-columns:\s*minmax\(0,\s*0\.88fr\)\s+minmax\(280px,\s*1\.12fr\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-required-notices\s*\{(?=[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*170px\),\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-communication-card\s*\{/);
});
