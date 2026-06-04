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
