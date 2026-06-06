import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const helpPage = readFileSync("app/help/page.tsx", "utf8");
const landingPage = readFileSync("app/page.tsx", "utf8");
const legalPage = readFileSync("app/components/LegalPage.tsx", "utf8");
const robotsRoute = readFileSync("app/robots.ts", "utf8");
const sitemapRoute = readFileSync("app/sitemap.ts", "utf8");
const stylesheet = readFileSync("app/globals.css", "utf8");

test("help page covers account, exports, billing, and saved project guidance", () => {
  assert.match(helpPage, /title: "Help Center"/);
  assert.match(helpPage, /canonical: "\/help"/);
  assert.match(helpPage, /Use RoleForge with fewer surprises/);
  assert.match(helpPage, /Start a resume run/);
  assert.match(helpPage, /Account and profile/);
  assert.match(helpPage, /manage optional product update email/);
  assert.match(helpPage, /Saved projects/);
  assert.match(helpPage, /Exports and templates/);
  assert.match(helpPage, /Premium and billing/);
  assert.match(helpPage, /When something looks stuck/);
  assert.match(helpPage, /HelpSearch/);
  assert.match(helpPage, /quickLinks=\{quickLinks\}/);
  assert.match(helpPage, /helpSections=\{helpSections\}/);
  assert.match(helpPage, /Free accounts can export PDF/);
  assert.match(helpPage, /Premium accounts unlock DOCX and TXT/);
  assert.match(helpPage, /href: "\/status"/);
  assert.match(helpPage, /System status/);
  assert.match(helpPage, /supportRequestHref/);
  assert.match(helpPage, /Workflow or export issue/);
  assert.match(helpPage, /Contact support/);
  assert.match(helpPage, /href: "\/updates"/);
  assert.match(helpPage, /Product updates/);
});

test("help page routes common issues to self-service and prefilled support", () => {
  assert.match(helpPage, /type HelpActionRoute/);
  assert.match(helpPage, /const helpActionRoutes/);
  assert.match(helpPage, /id="try-first"/);
  assert.match(helpPage, /Route the issue to the right place/);
  assert.match(helpPage, /Workflow is stuck/);
  assert.match(helpPage, /href: "\/status"/);
  assert.match(helpPage, /category:\s*"workflow"/);
  assert.match(helpPage, /Export is missing/);
  assert.match(helpPage, /href: "\/settings#exports"/);
  assert.match(helpPage, /category:\s*"exports"/);
  assert.match(helpPage, /Premium looks out of sync/);
  assert.match(helpPage, /href: "\/settings#billing"/);
  assert.match(helpPage, /category:\s*"billing"/);
  assert.match(helpPage, /Saved work is missing/);
  assert.match(helpPage, /href: "\/settings#projects"/);
  assert.match(helpPage, /category:\s*"saved-projects"/);
  assert.match(helpPage, /Open check/);
  assert.match(helpPage, /Ask support/);
});

test("help page is discoverable from public navigation and crawler metadata", () => {
  assert.match(landingPage, /href="\/help"/);
  assert.match(legalPage, /href="\/help"/);
  assert.match(robotsRoute, /"\/help"/);
  assert.match(sitemapRoute, /`\$\{siteUrl\}\/help`/);
  assert.match(robotsRoute, /"\/status"/);
  assert.match(sitemapRoute, /`\$\{siteUrl\}\/status`/);
  assert.match(robotsRoute, /"\/support"/);
  assert.match(sitemapRoute, /`\$\{siteUrl\}\/support`/);
  assert.match(robotsRoute, /"\/updates"/);
  assert.match(sitemapRoute, /`\$\{siteUrl\}\/updates`/);
});

test("help quick links are compact and overflow-safe", () => {
  assert.match(stylesheet, /\.help-action-routes\s*\{(?=[^}]*display:\s*grid)(?=[^}]*overflow:\s*hidden)(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.help-action-head\s*\{(?=[^}]*grid-template-columns:\s*minmax\(0,\s*0\.9fr\)\s+minmax\(260px,\s*0\.72fr\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.help-action-grid\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(min\(100%,\s*220px\),\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.help-action-card\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*38px\s+minmax\(0,\s*1fr\))(?=[^}]*overflow:\s*hidden)[^}]*\}/s);
  assert.match(stylesheet, /\.help-action-card\s+strong,\s*\.help-action-card\s+p,\s*\.help-action-card\s+small\s*\{(?=[^}]*overflow-wrap:\s*anywhere)[^}]*\}/s);
  assert.match(stylesheet, /\.help-action-buttons\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.help-action-buttons\s+\.btn\s*\{(?=[^}]*width:\s*100%)(?=[^}]*white-space:\s*normal)[^}]*\}/s);
  assert.match(stylesheet, /\.help-search-card\s*\{/);
  assert.match(stylesheet, /\.help-search-field\s+input\s*\{/);
  assert.match(stylesheet, /\.help-quick-grid\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*220px\),\s*1fr\)\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.help-quick-link\s*\{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*38px\s+minmax\(0,\s*1fr\))(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.help-quick-link\s+strong,\s*\.help-quick-link\s+small\s*\{(?=[^}]*overflow-wrap:\s*anywhere)[^}]*\}/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.help-action-head,[\s\S]*?\.help-action-grid\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*620px\)\s*\{[\s\S]*?\.help-action-buttons\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.help-action-routes/);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.help-action-card/);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.help-quick-link/);
});
