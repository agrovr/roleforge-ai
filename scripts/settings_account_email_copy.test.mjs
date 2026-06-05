import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const settingsPage = readFileSync("app/settings/page.tsx", "utf8");
const accountEmailCopyButton = readFileSync("app/settings/AccountEmailCopyButton.tsx", "utf8");
const accountReferenceCopyButton = readFileSync("app/settings/AccountReferenceCopyButton.tsx", "utf8");
const stylesheet = readFileSync("app/globals.css", "utf8");

test("settings account panel can copy the signed-in email and safe account reference", () => {
  assert.match(settingsPage, /AccountEmailCopyButton/);
  assert.match(settingsPage, /AccountReferenceCopyButton/);
  assert.match(settingsPage, /accountReference\(user\.id\)/);
  assert.match(settingsPage, /Account ref \{accountReferenceLabel\}/);
  assert.match(settingsPage, /className="settings-account-email-line"/);
  assert.match(settingsPage, /className="settings-account-email-line settings-account-reference-line"/);
  assert.match(settingsPage, /<AccountEmailCopyButton email=\{user\.email\} \/>/);
  assert.match(settingsPage, /<AccountReferenceCopyButton referenceLabel=\{accountReferenceLabel\} \/>/);
  assert.match(accountEmailCopyButton, /writeClipboardText\(email\)/);
  assert.match(accountEmailCopyButton, /aria-label=\{`Copy account email \$\{email\}`\}/);
  assert.match(accountEmailCopyButton, /Copy email/);
  assert.match(accountEmailCopyButton, /Copy failed/);
  assert.match(accountEmailCopyButton, /RoleForgeIcon name=\{copyState === "copied" \? "check" : "copy"\}/);
  assert.match(accountReferenceCopyButton, /writeClipboardText\(referenceLabel\)/);
  assert.match(accountReferenceCopyButton, /aria-label=\{`Copy account reference \$\{referenceLabel\}`\}/);
  assert.match(accountReferenceCopyButton, /Copy ref/);
  assert.match(accountReferenceCopyButton, /settings-account-reference-copy/);
});

test("settings account email copy control is compact and dark-mode safe", () => {
  assert.match(stylesheet, /\.settings-account-email-line\s*\{(?=[^}]*display:\s*flex)(?=[^}]*flex-wrap:\s*wrap)(?=[^}]*min-width:\s*0)(?=[^}]*max-width:\s*100%)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-account-email-line\s*>\s*span\s*\{(?=[^}]*min-width:\s*0)(?=[^}]*max-width:\s*100%)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-account-reference-line\s*\{(?=[^}]*margin-top:\s*6px)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-account-reference-line\s*>\s*span\s*\{(?=[^}]*font-size:\s*0\.82rem)(?=[^}]*font-weight:\s*850)[^}]*\}/s);
  assert.match(stylesheet, /\.settings-account-email-copy\s*\{(?=[^}]*display:\s*inline-flex)(?=[^}]*min-width:\s*0)(?=[^}]*min-height:\s*30px)(?=[^}]*overflow-wrap:\s*anywhere)(?=[^}]*text-wrap:\s*balance)(?=[^}]*white-space:\s*normal)[^}]*\}/s);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-account-email-copy\s*\{/);
  assert.match(stylesheet, /html\[data-theme="dark"\]\s+\.settings-account-email-copy:hover,\s*html\[data-theme="dark"\]\s+\.settings-account-email-copy:focus-visible\s*\{/);
});
