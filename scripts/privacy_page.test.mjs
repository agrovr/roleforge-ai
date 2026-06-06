import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const privacyPage = readFileSync("app/privacy/page.tsx", "utf8");

test("privacy page covers profile and communication preference records", () => {
  assert.match(privacyPage, /title: "Privacy Policy"/);
  assert.match(privacyPage, /canonical: "\/privacy"/);
  assert.match(privacyPage, /saved display name, and communication preference choices/);
  assert.match(privacyPage, /optional product update email is enabled/);
  assert.match(privacyPage, /Account, billing, security, and support messages may still be sent/);
  assert.match(privacyPage, /including profile and communication preference records/);
});
