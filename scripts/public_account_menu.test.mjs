import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const publicAccountMenu = readFileSync("app/components/PublicAccountMenu.tsx", "utf8");
const authStatusRoute = readFileSync("app/api/auth/status/route.ts", "utf8");
const helpPage = readFileSync("app/help/page.tsx", "utf8");
const statusPage = readFileSync("app/status/page.tsx", "utf8");
const supportPage = readFileSync("app/support/page.tsx", "utf8");
const updatesPage = readFileSync("app/updates/page.tsx", "utf8");
const stylesheet = readFileSync("app/globals.css", "utf8");

test("public account menu turns static topbars into signed-in command centers", () => {
  assert.match(publicAccountMenu, /"use client"/);
  assert.match(publicAccountMenu, /fetch\("\/api\/auth\/status"/);
  assert.match(publicAccountMenu, /credentials:\s*"same-origin"/);
  assert.match(publicAccountMenu, /currentPagePath/);
  assert.match(publicAccountMenu, /window\.location\.pathname/);
  assert.match(publicAccountMenu, /window\.location\.search/);
  assert.match(publicAccountMenu, /window\.location\.hash/);
  assert.match(publicAccountMenu, /encodeURIComponent\(currentPagePath\(\)\)/);
  assert.match(publicAccountMenu, /window\.location\.assign/);
  assert.match(publicAccountMenu, /AccountAvatar/);
  assert.match(publicAccountMenu, /data-account-menu="true"/);
  assert.match(publicAccountMenu, /aria-label="Open account menu"/);
  assert.match(publicAccountMenu, /Public page account summary/);
  assert.match(publicAccountMenu, /href="\/settings#billing"/);
  assert.match(publicAccountMenu, /href="\/settings#exports"/);
  assert.match(publicAccountMenu, /href="\/settings#usage"/);
  assert.match(publicAccountMenu, /href="\/settings#support"/);
  assert.match(publicAccountMenu, /href="\/settings#projects"/);
  assert.match(publicAccountMenu, /href="\/templates"/);
  assert.match(publicAccountMenu, /href="\/status"/);
  assert.match(publicAccountMenu, /href="\/updates"/);
  assert.match(publicAccountMenu, /href=\{supportHref\}/);
  assert.match(publicAccountMenu, /href="\/api\/account\/export"/);
  assert.match(publicAccountMenu, /Export account record/);
  assert.match(publicAccountMenu, /Support history/);
  assert.match(publicAccountMenu, /savedProjectCount/);
  assert.match(publicAccountMenu, /supportRequestCount/);
  assert.match(publicAccountMenu, /countLabel/);
  assert.match(publicAccountMenu, /action="\/auth\/signout"/);
  assert.match(publicAccountMenu, /href="\/login\?next=\/app&account=signin-required"/);
  assert.match(publicAccountMenu, /Sign in/);
});

test("auth status exposes safe account counts for public menus", () => {
  assert.match(authStatusRoute, /countAccountRows/);
  assert.match(authStatusRoute, /table:\s*"resume_projects"\s*\|\s*"support_requests"/);
  assert.match(authStatusRoute, /\.select\("id",\s*\{\s*count:\s*"exact",\s*head:\s*true\s*\}\)/);
  assert.match(authStatusRoute, /\.eq\("user_id",\s*userId\)/);
  assert.match(authStatusRoute, /countAccountRows\(supabase,\s*"resume_projects",\s*user\.id\)/);
  assert.match(authStatusRoute, /countAccountRows\(supabase,\s*"support_requests",\s*user\.id\)/);
  assert.match(authStatusRoute, /accountSummary/);
  assert.match(authStatusRoute, /savedProjectCount/);
  assert.match(authStatusRoute, /supportRequestCount/);
});

test("help status support and updates mount the public account menu", () => {
  for (const source of [helpPage, statusPage, supportPage, updatesPage]) {
    assert.match(source, /PublicAccountMenu/);
    assert.match(source, /supportHref=\{supportRequestHref\(/);
  }
  assert.match(helpPage, /subject:\s*"Help center question"/);
  assert.match(statusPage, /subject:\s*"Status page question"/);
  assert.match(supportPage, /subject:\s*"Support page question"/);
  assert.match(updatesPage, /subject:\s*"Product updates question"/);
});

test("public account menu topbar layout is overflow safe", () => {
  assert.match(stylesheet, /\.public-account-menu\s*\{(?=[^}]*z-index:\s*32)[^}]*\}/s);
  assert.match(stylesheet, /\.public-account-signin\s*\{(?=[^}]*flex:\s*0\s+0\s+auto)[^}]*\}/s);
  assert.match(stylesheet, /\.public-topbar-avatar\s*\{(?=[^}]*width:\s*40px)(?=[^}]*height:\s*40px)[^}]*\}/s);
  assert.match(stylesheet, /\.public-account-popover\s*\{(?=[^}]*width:\s*min\(420px,\s*calc\(100vw\s*-\s*30px\)\))[^}]*\}/s);
  assert.match(stylesheet, /\.public-account-shortcuts,\s*\.public-account-utilities\s*\{(?=[^}]*min-width:\s*0)[^}]*\}/s);
  assert.match(stylesheet, /\.public-account-shortcuts\s+a,\s*\.public-account-utilities\s+a\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s);
});
