import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { stylesFor } from "./style_sources.mjs";

const globals = stylesFor("login/login.css");
const loginPage = readFileSync("app/login/page.tsx", "utf8");

test("login gateway keeps real auth actions while using a polished shell", () => {
  assert.match(loginPage, /href=\{`\/auth\/oauth\?provider=google&next=/);
  assert.match(loginPage, /action="\/auth\/signin"/);
  assert.match(loginPage, /const showStatus = shouldShowLoginStatus\(account\)/);
  assert.match(loginPage, /showStatus \? \(/);
  assert.match(loginPage, /role=\{tone === "error" \? "alert" : "status"\}/);
  assert.match(loginPage, /aria-live=\{tone === "error" \? "assertive" : "polite"\}/);
  assert.match(globals, /\.login-shell\s*\{(?=[^}]*position:\s*relative)(?=[^}]*isolation:\s*isolate)(?=[^}]*background-size:\s*38px 38px,\s*38px 38px)[^}]*\}/s);
  assert.match(globals, /\.login-shell::before,\s*\.login-shell::after\s*\{/);
});

test("login gateway topbar and sign-in card use refined product surfaces", () => {
  assert.match(globals, /\.login-nav\s*\{(?=[^}]*width:\s*min\(1180px,\s*calc\(100% - clamp\(0px,\s*2vw,\s*28px\)\)\))(?=[^}]*border-radius:\s*clamp\(22px,\s*2\.2vw,\s*30px\))(?=[^}]*backdrop-filter:\s*blur\(20px\) saturate\(1\.08\))[^}]*\}/s);
  assert.match(globals, /\.login-card\s*\{(?=[^}]*position:\s*relative)(?=[^}]*overflow:\s*hidden)[^}]*\}/s);
  assert.match(globals, /\.login-card::before,\s*\.login-card::after\s*\{/);
  assert.match(globals, /\.login-card > \*\s*\{(?=[^}]*z-index:\s*1)[^}]*\}/s);
});

test("collapsed login layouts place authentication before secondary proof", () => {
  const introIndex = loginPage.indexOf('className="login-copy"');
  const cardIndex = loginPage.indexOf('className="login-card"');
  const supportingIndex = loginPage.indexOf('className="login-supporting"');

  assert.ok(introIndex >= 0 && introIndex < cardIndex);
  assert.ok(cardIndex < supportingIndex);
  assert.match(globals, /\.login-panel\s*\{(?=[^}]*grid-template-areas:\s*"copy card"\s*"supporting card")(?=[^}]*row-gap:\s*18px)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*1040px\)[\s\S]*?\.login-panel\s*\{(?=[^}]*grid-template-areas:\s*"copy"\s*"card"\s*"supporting")(?=[^}]*row-gap:\s*28px)[^}]*\}/s);
  assert.match(globals, /@media\s*\(max-width:\s*760px\)[\s\S]*?\.login-studio-preview,\s*\.login-session-strip\s*\{[^}]*display:\s*none[^}]*\}/s);
});

test("login protected preview avoids decorative rails and keeps dark mode support", () => {
  assert.doesNotMatch(globals, /\.login-studio-preview::after\s*\{/);
  assert.doesNotMatch(globals, /\.login-preview-sheet div::before\s*\{/);
  assert.doesNotMatch(globals, /@keyframes\s+login-preview-meter/);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.login-nav\s*\{/);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.login-card::after\s*\{/);
  assert.match(globals, /html\[data-theme="dark"\]\s+\.login-preview-sheet div\s*\{[^}]*border-color:/s);
});
