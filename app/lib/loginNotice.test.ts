import assert from "node:assert/strict";
import test from "node:test";

import { loginNoticeCopy, loginNoticeTone } from "./loginNotice";

test("formats login status notices for auth redirects", () => {
  assert.equal(loginNoticeCopy("signin-required"), "Sign in to start tailoring resumes and keep saved projects tied to your account.");
  assert.equal(loginNoticeCopy("check-email"), "Check your email for the secure sign-in link.");
  assert.equal(loginNoticeCopy("signed-out"), "You are signed out.");
  assert.equal(loginNoticeCopy("signin-error"), "Sign-in could not finish. Try Google or send a new email link.");
  assert.equal(loginNoticeCopy("unknown"), "Choose Google or a secure email link to continue to the studio.");
});

test("treats missing auth configuration as an error notice", () => {
  assert.equal(loginNoticeCopy("account-not-configured"), "Sign-in is unavailable right now. Try again shortly.");
  assert.equal(loginNoticeTone("account-not-configured"), "error");
});

test("assigns customer-facing tones to login statuses", () => {
  assert.equal(loginNoticeTone("check-email"), "success");
  assert.equal(loginNoticeTone("signin-error"), "error");
  assert.equal(loginNoticeTone("signed-out"), "neutral");
  assert.equal(loginNoticeTone("signin-required"), "info");
});
