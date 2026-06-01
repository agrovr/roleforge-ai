import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const studioPage = readFileSync("app/app/page.tsx", "utf8");
const settingsPage = readFileSync("app/settings/page.tsx", "utf8");
const globalsCss = readFileSync("app/globals.css", "utf8");

test("studio account menu acts as a workspace command center", () => {
  assert.match(studioPage, /AccountAvatar/);
  assert.match(studioPage, /imageUrl\?: string/);
  assert.match(studioPage, /studio-account-identity/);
  assert.match(studioPage, /studio-account-insights/);
  assert.match(studioPage, /Account status summary/);
  assert.match(studioPage, /href="\/templates"/);
  assert.match(studioPage, /href="\/settings#billing"/);
  assert.match(studioPage, /Saved projects/);
  assert.match(studioPage, /DOCX and TXT/);
  assert.match(studioPage, /recentAccountProjects/);
  assert.match(studioPage, /studio-account-recent/);
  assert.match(studioPage, /Recent projects/);
  assert.match(studioPage, /savedRunHistoryHref/);
  assert.match(studioPage, /studio-account-sync-actions/);
  assert.match(studioPage, /syncableLocalHistoryCount\s*\?/);
  assert.match(studioPage, /void syncLocalHistoryToAccount\(\)/);
  assert.match(studioPage, /Save browser/);
});

test("account menu layout has responsive status cards", () => {
  assert.match(globalsCss, /\.account-avatar-photo\s*\{/);
  assert.match(globalsCss, /\.account-avatar-initials\s*\{/);
  assert.match(globalsCss, /\.studio-account-insights\s*\{/);
  assert.match(globalsCss, /@container studio-account-popover \(max-width: 360px\)/);
  assert.match(globalsCss, /html\[data-theme="dark"\] \.studio-account-insights a/);
  assert.match(globalsCss, /\.studio-account-recent\s*\{(?=[^}]*display:\s*grid)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(globalsCss, /\.studio-account-recent-link\s*\{(?=[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(globalsCss, /\.studio-account-recent-link\s+strong\s*\{(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s);
  assert.match(globalsCss, /\.studio-account-sync-actions\s*\{(?=[^}]*display:\s*grid)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(globalsCss, /\.studio-account-sync-actions\s+button\s*\{(?=[^}]*width:\s*100%)(?=[^}]*min-width:\s*0)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s);
});

test("settings topbar exposes account, project, usage, and billing controls", () => {
  assert.match(settingsPage, /AccountAvatar/);
  assert.match(settingsPage, /accountAvatarUrl\(user\)/);
  assert.match(settingsPage, /settings-account-menu/);
  assert.match(settingsPage, /aria-label="Open account menu"/);
  assert.match(settingsPage, /recentProjectSummaries/);
  assert.match(settingsPage, /settings-account-recent/);
  assert.match(settingsPage, /Recent projects/);
  assert.match(settingsPage, /recentProjectSummaries\.map/);
  assert.match(settingsPage, /href=\{project\.href\}/);
  assert.match(settingsPage, /href="#security"/);
  assert.match(settingsPage, /href="#preferences"/);
  assert.match(settingsPage, /href="#projects"/);
  assert.match(settingsPage, /href="#usage"/);
  assert.match(settingsPage, /href="#billing"/);
  assert.match(settingsPage, /href="\/app#history"/);
  assert.match(settingsPage, /action="\/auth\/signout"/);
});

test("settings account recent projects inherit overflow-safe menu layout", () => {
  assert.match(globalsCss, /\.settings-account-recent\s*\{(?=[^}]*display:\s*grid)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(globalsCss, /\.settings-account-recent-link\s*\{(?=[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(globalsCss, /\.settings-account-recent-link\s+strong\s*\{(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s);
});
