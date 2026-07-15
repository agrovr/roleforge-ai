import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const settingsPage = readFileSync("app/settings/page.tsx", "utf8");
const stylesheet = [readFileSync("app/globals.css", "utf8"), readFileSync("app/settings/settings.css", "utf8")].join("\n");

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

test("settings page summarizes workspace health from real account state", () => {
  assert.match(settingsPage, /accountHealthItems/);
  assert.match(settingsPage, /hasDisplayName/);
  assert.match(settingsPage, /settings-account-health/);
  assert.match(settingsPage, /aria-label="Workspace health"/);
  assert.match(settingsPage, /Account next steps/);
  assert.match(settingsPage, /checked from your current account state/);
  assert.match(settingsPage, /label:\s*"Profile"/);
  assert.match(settingsPage, /label:\s*"Projects"/);
  assert.match(settingsPage, /label:\s*"Exports"/);
  assert.match(settingsPage, /label:\s*"Billing"/);
  assert.match(settingsPage, /label:\s*"Support"/);
  assert.match(settingsPage, /projectCount \? `\$\{projectCount\} saved` : "Start first"/);
  assert.match(settingsPage, /entitlement\.exportFormats\.docx \? "PDF, DOCX, and TXT exports are available from completed runs\."/);
  assert.match(settingsPage, /latestSupportRequest \? latestSupportRequest\.referenceLabel/);
  assert.match(settingsPage, /className=\{`settings-account-health-card \$\{item\.tone\}`\}/);
});

test("settings page exposes recent account activity from real records", () => {
  assert.match(settingsPage, /latestProjectSummary = recentProjectSummaries\[0\] \?\? null/);
  assert.match(settingsPage, /latestDocumentSummary = recentDocumentSummaries\[0\] \?\? null/);
  assert.match(settingsPage, /settingsActivityItems/);
  assert.match(settingsPage, /aria-label="Recent account activity"/);
  assert.match(settingsPage, /What changed lately/);
  assert.match(settingsPage, /Projects, documents, usage, billing, and support are summarized from your current account records\./);
  assert.match(settingsPage, /label:\s*"Latest project"/);
  assert.match(settingsPage, /value:\s*latestProjectSummary\?\.title \?\? "No saved project yet"/);
  assert.match(settingsPage, /href:\s*latestProjectSummary\?\.href \?\? "\/app"/);
  assert.match(settingsPage, /label:\s*"Latest document"/);
  assert.match(settingsPage, /value:\s*latestDocumentSummary\?\.title \?\? documentReadyLabel/);
  assert.match(settingsPage, /href:\s*latestDocumentSummary\?\.url \?\? "#exports"/);
  assert.match(settingsPage, /documentCounts\.locked \? "warn" : "ready"/);
  assert.match(settingsPage, /Window resets \$\{usageResetLabel \|\| "at the next monthly reset"\}/);
  assert.match(settingsPage, /Stripe checkout is available from this account\./);
  assert.match(settingsPage, /latestSupportRequest\?\.referenceLabel \?\? "No recent request"/);
  assert.match(settingsPage, /className=\{`settings-activity-item \$\{item\.tone\}`\}/);
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

test("settings recent activity timeline is compact and dark-mode safe", () => {
  assert.match(stylesheet, /\.settings-activity-panel\s*\{(?=[^}]*display:\s*grid)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-activity-head\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*minmax\(0,\s*0\.8fr\)\s+minmax\(min\(100%,\s*390px\),\s*1fr\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-activity-list\s*\{(?=[^}]*display:\s*grid)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-activity-item\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*38px\s+minmax\(0,\s*1fr\)\s+minmax\(94px,\s*auto\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-activity-copy span,\s*\.settings-activity-copy strong,\s*\.settings-activity-copy small,\s*\.settings-activity-action\s*\{(?=[^}]*overflow-wrap:\s*anywhere)[^}]*\}/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*720px\)\s*\{[\s\S]*?\.settings-activity-head,\s*\.settings-account-health-head\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*720px\)\s*\{[\s\S]*?\.settings-activity-item\s*\{[^}]*grid-template-columns:\s*38px\s+minmax\(0,\s*1fr\)/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-activity-panel,\s*html\[data-theme="dark"\]\s+\.settings-activity-item/);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-activity-icon,\s*html\[data-theme="dark"\]\s+\.settings-activity-action/);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-activity-item\.warn/);
});

test("settings workspace health cards are compact and dark-mode safe", () => {
  assert.match(stylesheet, /\.settings-account-health\s*\{(?=[^}]*display:\s*grid)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-account-health-head\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*minmax\(0,\s*0\.85fr\)\s+minmax\(min\(100%,\s*360px\),\s*1fr\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-account-health-grid\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*210px\),\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-account-health-card\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*38px\s+minmax\(0,\s*1fr\))(?=[^}]*min-height:\s*142px)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-account-health-copy span,\s*\.settings-account-health-copy strong,\s*\.settings-account-health-copy small,\s*\.settings-account-health-action\s*\{(?=[^}]*overflow-wrap:\s*anywhere)[^}]*\}/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*720px\)\s*\{[\s\S]*?\.settings-account-health-head\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-account-health/);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-account-health-card\.good/);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-account-health-icon,\s*html\[data-theme="dark"\]\s+\.settings-account-health-action/);
});
