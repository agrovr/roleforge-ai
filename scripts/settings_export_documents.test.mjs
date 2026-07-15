import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const settingsPage = readFileSync("app/settings/page.tsx", "utf8");
const settingsProjects = readFileSync("app/lib/settingsProjects.ts", "utf8");
const stylesheet = [readFileSync("app/globals.css", "utf8"), readFileSync("app/settings/settings.css", "utf8")].join("\n");

test("settings exports include a real recent document hub", () => {
  assert.match(settingsProjects, /settingsDocumentSummaries/);
  assert.match(settingsProjects, /settingsDocumentCounts/);
  assert.match(settingsProjects, /historyDownloadEntries\(run as HistoryItem,\s*entitlement\)/);
  assert.match(settingsProjects, /lockedHistoryDownloadFormats\(run as HistoryItem,\s*entitlement\)/);
  assert.match(settingsProjects, /seen = new Set/);
  assert.match(settingsProjects, /savedRunHistoryHref\(run,\s*\{ restore: savedRunCanRestore\(run\) \}\)/);
  assert.match(settingsPage, /settingsDocumentSummaries\(recentSavedRuns,\s*entitlement\)/);
  assert.match(settingsPage, /settingsDocumentCounts\(recentSavedRuns,\s*entitlement\)/);
  assert.match(settingsPage, /settings-document-hub/);
  assert.match(settingsPage, /aria-label="Recent export documents"/);
  assert.match(settingsPage, /Recent documents/);
  assert.match(settingsPage, /documentReadyLabel/);
  assert.match(settingsPage, /documentLockedLabel/);
  assert.match(settingsPage, /recentDocumentSummaries\.map/);
  assert.match(settingsPage, /href=\{document\.url\}/);
  assert.match(settingsPage, /href=\{document\.projectHref\}/);
  assert.match(settingsPage, /No download-ready documents yet/);
});

test("settings document hub is compact and dark-mode safe", () => {
  assert.match(stylesheet, /\.settings-document-hub\s*\{(?=[^}]*display:\s*grid)(?=[^}]*min-width:\s*0)(?=[^}]*border:)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-document-hub-head\s*\{(?=[^}]*display:\s*flex)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-document-item\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*52px\s+minmax\(0,\s*1fr\)\s+minmax\(min\(100%,\s*190px\),\s*auto\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-document-item\s+strong,\s*\.settings-document-item\s+small\s*\{(?=[^}]*overflow-wrap:\s*anywhere)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-document-actions\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-document-actions\s+\.btn\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s);
  assert.match(stylesheet, /@container\s+settings-section\s+\(max-width:\s*720px\)\s*\{[\s\S]*?\.settings-document-item\s*\{[^}]*grid-template-columns:\s*52px\s+minmax\(0,\s*1fr\)/s);
  assert.match(stylesheet, /@container\s+\(max-width:\s*430px\)\s*\{[\s\S]*?\.settings-document-actions\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-document-hub/);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-document-format/);
});
