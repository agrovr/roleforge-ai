import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const settingsPage = readFileSync("app/settings/page.tsx", "utf8");
const stylesheet = readFileSync("app/globals.css", "utf8");

test("settings page exposes an account overview strip", () => {
  assert.match(settingsPage, /settings-account-overview/);
  assert.match(settingsPage, /aria-label="Account overview"/);
  assert.match(settingsPage, /settings-overview-identity/);
  assert.match(settingsPage, /settings-overview-status/);
  assert.match(settingsPage, /settings-overview-actions/);
  assert.match(settingsPage, /displayName \|\| "RoleForge user"/);
  assert.match(settingsPage, /settingsAccountExportValue/);
  assert.match(settingsPage, /settingsAccountUsageCaption/);
  assert.match(settingsPage, /href="#account"/);
  assert.match(settingsPage, /href="#billing"/);
  assert.match(settingsPage, /href="#projects"/);
  assert.match(settingsPage, /href=\{resumeTemplateStudioHref\(selectedTemplate\.slug\)\}/);
});

test("settings account overview is compact and overflow-safe", () => {
  assert.match(stylesheet, /\.settings-overview-frame\s*\{(?=[^}]*container:\s*settings-overview\s*\/\s*inline-size)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-account-overview\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*minmax\(0,\s*1\.05fr\)\s+minmax\(min\(100%,\s*360px\),\s*0\.95fr\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-overview-identity\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*58px\s+minmax\(0,\s*1fr\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-overview-status\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-overview-status\s+strong\s*\{(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-overview-actions\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*132px\),\s*1fr\)\))[^}]*\}/s);
  assert.match(stylesheet, /@container\s+settings-overview\s*\(max-width:\s*720px\)\s*\{[\s\S]*?\.settings-account-overview\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(stylesheet, /html\[data-theme="dark"\] \.settings-account-overview/);
});
