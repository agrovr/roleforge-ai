import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const helpPage = readFileSync("app/help/page.tsx", "utf8");
const helpSearch = readFileSync("app/help/HelpSearch.tsx", "utf8");
const stylesheet = readFileSync("app/globals.css", "utf8");

test("help center has client-side search over topics and actions", () => {
  assert.match(helpPage, /HelpSearch/);
  assert.match(helpPage, /quickLinks=\{quickLinks\}/);
  assert.match(helpPage, /helpSections=\{helpSections\}/);
  assert.match(helpSearch, /"use client"/);
  assert.match(helpSearch, /type="search"/);
  assert.match(helpSearch, /Search billing, exports, saved projects, account/);
  assert.match(helpSearch, /normalizedQuery/);
  assert.match(helpSearch, /matchingLinks/);
  assert.match(helpSearch, /matchingSections/);
  assert.match(helpSearch, /topics and/);
  assert.match(helpSearch, /actions match/);
  assert.match(helpSearch, /No matching help topic/);
  assert.match(helpSearch, /Contact support/);
});

test("help search keeps existing topics and quick actions searchable", () => {
  assert.match(helpPage, /export type HelpSection/);
  assert.match(helpPage, /export type HelpQuickLink/);
  assert.match(helpPage, /Start a resume run/);
  assert.match(helpPage, /Account and profile/);
  assert.match(helpPage, /Saved projects/);
  assert.match(helpPage, /Exports and templates/);
  assert.match(helpPage, /Premium and billing/);
  assert.match(helpPage, /When something looks stuck/);
  assert.match(helpPage, /Open studio/);
  assert.match(helpPage, /Browse templates/);
  assert.match(helpPage, /Account settings/);
  assert.match(helpPage, /Contact support/);
  assert.match(helpPage, /System status/);
  assert.match(helpPage, /Product updates/);
});

test("help search layout is responsive and overflow safe", () => {
  assert.match(stylesheet, /\.help-search-shell\s*\{(?=[^}]*display:\s*grid)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.help-search-card\s*\{(?=[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+max-content)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.help-search-field\s*\{(?=[^}]*display:\s*grid)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.help-search-field\s+input\s*\{(?=[^}]*width:\s*100%)(?=[^}]*min-width:\s*0)(?=[^}]*overflow-wrap:\s*anywhere)[^}]*\}/s);
  assert.match(stylesheet, /\.help-search-meta\s*\{(?=[^}]*display:\s*inline-flex)(?=[^}]*min-width:\s*0)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s);
  assert.match(stylesheet, /\.help-search-empty\s*\{(?=[^}]*display:\s*grid)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*620px\)\s*\{[\s\S]*\.help-search-card\s*\{(?=[^}]*grid-template-columns:\s*1fr)[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.help-search-card/);
});
