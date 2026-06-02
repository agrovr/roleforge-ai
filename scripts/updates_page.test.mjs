import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const updatesPage = readFileSync("app/updates/page.tsx", "utf8");
const landingPage = readFileSync("app/page.tsx", "utf8");
const helpPage = readFileSync("app/help/page.tsx", "utf8");
const statusPage = readFileSync("app/status/page.tsx", "utf8");
const studioPage = readFileSync("app/app/page.tsx", "utf8");
const settingsPage = readFileSync("app/settings/page.tsx", "utf8");
const templatesPage = readFileSync("app/templates/page.tsx", "utf8");
const legalPage = readFileSync("app/components/LegalPage.tsx", "utf8");
const robotsRoute = readFileSync("app/robots.ts", "utf8");
const sitemapRoute = readFileSync("app/sitemap.ts", "utf8");
const stylesheet = readFileSync("app/globals.css", "utf8");
const smokeFrontend = readFileSync("scripts/smoke_frontend.mjs", "utf8");
const smokeLayout = readFileSync("scripts/smoke_layout.mjs", "utf8");

test("updates page is a factual public product log", () => {
  assert.match(updatesPage, /title: "Product Updates"/);
  assert.match(updatesPage, /canonical: "\/updates"/);
  assert.match(updatesPage, /What changed in RoleForge/);
  assert.match(updatesPage, /A factual log of shipped workflow, account, export, and billing improvements/);
  assert.match(updatesPage, /June 2, 2026/);
  assert.match(updatesPage, /Profile controls now follow you across the site/);
  assert.match(updatesPage, /System status is public/);
  assert.match(updatesPage, /Settings is now an account workspace/);
  assert.match(updatesPage, /Free and Premium export rules are explicit/);
  assert.match(updatesPage, /Free accounts keep PDF export/);
  assert.match(updatesPage, /Premium access unlocks DOCX and TXT/);
  assert.match(updatesPage, /No fake launch stats or unsupported roadmap promises/);
  assert.doesNotMatch(updatesPage, /trusted by|customers|guaranteed|ATS pass|human coach|live roadmap/i);
});

test("updates page is discoverable from public and signed-in surfaces", () => {
  assert.match(landingPage, /href="\/updates"/);
  assert.match(helpPage, /href="\/updates"/);
  assert.match(statusPage, /href="\/updates"/);
  assert.match(studioPage, /href="\/updates"/);
  assert.match(settingsPage, /href="\/updates"/);
  assert.match(templatesPage, /href="\/updates"/);
  assert.match(legalPage, /href="\/updates"/);
  assert.match(robotsRoute, /"\/updates"/);
  assert.match(sitemapRoute, /`\$\{siteUrl\}\/updates`/);
  assert.match(smokeFrontend, /sitemap\.text\.includes\(`\$\{canonicalUrl\}\/updates`\)/);
  assert.match(smokeLayout, /path: "\/updates"/);
});

test("updates timeline has overflow-safe responsive cards", () => {
  assert.match(stylesheet, /\.updates-timeline\s*\{(?=[^}]*display:\s*grid)(?=[^}]*gap:\s*14px)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.updates-card\s*\{(?=[^}]*container:\s*updates-card\s*\/\s*inline-size)(?=[^}]*grid-template-columns:\s*52px\s+minmax\(0,\s*1fr\))(?=[^}]*overflow:\s*hidden)[^}]*\}/s);
  assert.match(stylesheet, /\.updates-card-meta\s*\{(?=[^}]*display:\s*flex)(?=[^}]*flex-wrap:\s*wrap)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.updates-card\s+h2\s*\{(?=[^}]*font-size:\s*clamp\(1\.65rem,\s*6cqi,\s*2\.32rem\))(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)[^}]*\}/s);
  assert.match(stylesheet, /\.updates-card\s+li\s*\{(?=[^}]*grid-template-columns:\s*18px\s+minmax\(0,\s*1fr\))(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*pretty)[^}]*\}/s);
  assert.match(stylesheet, /@container\s+updates-card\s+\(max-width:\s*520px\)/);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.updates-card/);
});
