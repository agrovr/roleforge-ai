import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const landingPage = readFileSync("app/page.tsx", "utf8");
const stylesheet = readFileSync("app/globals.css", "utf8");

test("landing nav exposes a signed-in account menu from real account data", () => {
  assert.match(landingPage, /import \{ AccountAvatar \}/);
  assert.match(landingPage, /accountDisplayName\(user,\s*profile\?\.displayName\)/);
  assert.match(landingPage, /accountAvatarUrl\(user\)/);
  assert.match(landingPage, /loadAccountProfile\(supabase,\s*user\.id\)/);
  assert.match(landingPage, /className="landing-account-menu"/);
  assert.match(landingPage, /aria-label="Open account menu"/);
  assert.match(landingPage, /aria-label="Landing account summary"/);
  assert.match(landingPage, /href="\/settings#billing"/);
  assert.match(landingPage, /href="\/status"/);
  assert.match(landingPage, /href="\/updates"/);
  assert.match(landingPage, /href="\/api\/account\/export"/);
  assert.match(landingPage, /System status/);
  assert.match(landingPage, /Updates/);
  assert.match(landingPage, /action="\/auth\/signout"/);
});

test("landing account menu stays compact in the nav", () => {
  assert.match(stylesheet, /\.landing-account-menu\s*\{(?=[^}]*position:\s*relative)(?=[^}]*display:\s*inline-flex)[^}]*\}/s);
  assert.match(stylesheet, /\.landing-account-button\s*\{(?=[^}]*width:\s*42px)(?=[^}]*height:\s*42px)[^}]*\}/s);
  assert.match(stylesheet, /\.landing-account-popover\s*\{(?=[^}]*width:\s*min\(430px,\s*calc\(100vw\s*-\s*36px\)\))[^}]*\}/s);
  assert.match(stylesheet, /\.landing-account-insights\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*620px\)\s*\{[\s\S]*?\.landing-account-popover\s*\{(?=[^}]*right:\s*0)(?=[^}]*width:\s*min\(360px,\s*calc\(100vw\s*-\s*24px\)\))[^}]*\}/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.landing-account-popover\s*\{(?=[^}]*right:\s*-12px)(?=[^}]*width:\s*min\(340px,\s*calc\(100vw\s*-\s*18px\)\))[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.landing-account-button/);
});
