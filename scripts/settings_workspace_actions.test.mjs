import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const settingsPage = readFileSync("app/settings/page.tsx", "utf8");
const stylesheet = [readFileSync("app/globals.css", "utf8"), readFileSync("app/settings/settings.css", "utf8")].join("\n");

test("workspace actions remain reachable from the profile and section navigation", () => {
  assert.match(settingsPage, /<SettingsSectionNav/);
  assert.match(settingsPage, /className="settings-profile-actions"[\s\S]*?href="\/app"[\s\S]*?href="\/api\/account\/export"/);
  for (const section of ["projects", "billing", "support"]) assert.ok(settingsPage.includes(`id="${section}"`));
});

test("settings workspace quick actions are compact and overflow-safe", () => {
  assert.match(stylesheet, /\.settings-workspace-actions\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*178px\),\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-workspace-action\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*34px\s+minmax\(0,\s*1fr\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-workspace-action\s+strong\s*\{(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-workspace-action\s+small\s*\{(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*pretty)[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\] \.settings-workspace-action/);
});
