import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const studioPage = readFileSync("app/app/page.tsx", "utf8");
const stylesheet = readFileSync("app/globals.css", "utf8");

test("studio exposes a workflow preflight checklist from real state", () => {
  assert.match(studioPage, /preflightItems:\s*Array/);
  assert.match(studioPage, /label:\s*"Account"/);
  assert.match(studioPage, /value:\s*signedIn \? "Signed in" : "Needed"/);
  assert.match(studioPage, /label:\s*"Resume"/);
  assert.match(studioPage, /value:\s*previewUploadState === "reading" \? "Reading" : fileSelected \? "Ready" : "Needed"/);
  assert.match(studioPage, /label:\s*"Target"/);
  assert.match(studioPage, /value:\s*hasTarget \? "Ready" : "Needed"/);
  assert.match(studioPage, /label:\s*"Usage"/);
  assert.match(studioPage, /value:\s*limitReached \? "Limit reached" : usageSummary\.monthlyRunLimit === null \? "Unlimited" : usageLabel/);
  assert.match(studioPage, /label:\s*"Export"/);
  assert.match(studioPage, /value:\s*selectedExportAllowed \? `\$\{selectedFormatLabel\} ready` : `\$\{selectedFormatLabel\} locked`/);
  assert.match(studioPage, /preflightReadyCount = preflightItems\.filter/);
  assert.match(studioPage, /preflightStatusLabel = canRun \? "Ready to tailor" : "Preflight needed"/);
  assert.match(studioPage, /aria-label="Workflow preflight"/);
  assert.match(studioPage, /className=\{`rf-preflight-item \$\{item\.tone\}`\}/);
  assert.match(studioPage, /: "#assets"/);
});

test("studio exposes export readiness from real entitlement and draft state", () => {
  assert.match(studioPage, /const hasTailoredDraft = Boolean\(result\?\.tailored_text\?\.trim\(\)\)/);
  assert.match(studioPage, /exportReadinessItems:\s*Array/);
  assert.match(studioPage, /label:\s*"Format"/);
  assert.match(studioPage, /value:\s*selectedExportAllowed \? `\$\{selectedFormatLabel\} available` : `\$\{selectedFormatLabel\} locked`/);
  assert.match(studioPage, /label:\s*"Draft"/);
  assert.match(studioPage, /value:\s*hasTailoredDraft \? "Ready" : "Run needed"/);
  assert.match(studioPage, /label:\s*"Template"/);
  assert.match(studioPage, /value:\s*selectedTemplate\.name/);
  assert.match(studioPage, /label:\s*"Delivery"/);
  assert.match(studioPage, /value:\s*selectedDownloadReady \? "Download ready"/);
  assert.match(studioPage, /aria-label="Export readiness"/);
  assert.match(studioPage, /className=\{`export-readiness-item \$\{item\.tone\}`\}/);
  assert.match(studioPage, /View Premium access/);
  assert.match(studioPage, /href="\/settings#billing"/);
});

test("studio preflight checklist is responsive and dark-mode safe", () => {
  assert.match(stylesheet, /\.rf-preflight-panel\s*\{(?=[^}]*grid-column:\s*1\s*\/\s*-1)(?=[^}]*display:\s*grid)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.rf-preflight-head\s*\{(?=[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.rf-preflight-list\s*\{(?=[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*168px\),\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.rf-preflight-item\s*\{(?=[^}]*grid-template-columns:\s*34px\s+minmax\(0,\s*1fr\))(?=[^}]*min-height:\s*104px)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.rf-preflight-copy span,\s*\.rf-preflight-copy strong,\s*\.rf-preflight-copy small\s*\{(?=[^}]*overflow-wrap:\s*anywhere)[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.rf-preflight-panel,\s*html\[data-theme="dark"\]\s+\.rf-preflight-item/);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.rf-preflight-score\.ready/);
  assert.match(stylesheet, /@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.rf-preflight-head\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.rf-preflight-score\s*\{[^}]*justify-self:\s*start/s);
});

test("studio export readiness panel is compact and dark-mode safe", () => {
  assert.match(stylesheet, /\.export-readiness-panel\s*\{(?=[^}]*flex:\s*1\s+0\s+100%)(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*188px\),\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.export-readiness-item\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*30px\s+minmax\(0,\s*1fr\))(?=[^}]*min-height:\s*94px)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.export-readiness-copy,\s*\.export-readiness-copy span,\s*\.export-readiness-copy strong,\s*\.export-readiness-copy small\s*\{(?=[^}]*overflow-wrap:\s*anywhere)[^}]*\}/s);
  assert.match(stylesheet, /\.export-readiness-action\s*\{(?=[^}]*min-height:\s*42px)(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.export-readiness-panel/);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.export-readiness-item\.good/);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.export-readiness-item\.warn/);
});

test("studio exposes workflow recovery actions from real error state", () => {
  assert.match(studioPage, /workflowRecoveryTitle/);
  assert.match(studioPage, /workflowRecoveryDetail/);
  assert.match(studioPage, /workflowRecoverySteps/);
  assert.match(studioPage, /aria-label="Workflow recovery"/);
  assert.match(studioPage, /Recovery checklist/);
  assert.match(studioPage, /Retry workflow/);
  assert.match(studioPage, /href="\/status"/);
  assert.match(studioPage, /href="\/help#try-first"/);
  assert.match(studioPage, /href=\{workflowSupportHref\}/);
  assert.match(studioPage, /Request \{workflowError\.requestId\}/);
});

test("studio workflow recovery panel is responsive and dark-mode safe", () => {
  assert.match(stylesheet, /\.rf-recovery-card\s*\{(?=[^}]*display:\s*grid)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.rf-recovery-head\s*\{(?=[^}]*grid-template-columns:\s*42px\s+minmax\(0,\s*1fr\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.rf-recovery-steps\s*\{(?=[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(min\(100%,\s*168px\),\s*1fr\)\))[^}]*\}/s);
  assert.match(stylesheet, /\.rf-recovery-actions\s*\{(?=[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(min\(100%,\s*132px\),\s*1fr\)\))[^}]*\}/s);
  assert.match(stylesheet, /\.rf-recovery-actions\s+\.primary-button,\s*\.rf-recovery-actions\s+\.ghost-button\s*\{(?=[^}]*white-space:\s*normal)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.rf-recovery-card/);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.rf-recovery-detail/);
  assert.match(stylesheet, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.rf-recovery-actions\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.rf-recovery-head,[\s\S]*?\.rf-recovery-steps,[\s\S]*?\.rf-recovery-actions\s*\{[^}]*grid-template-columns:\s*1fr/s);
});
