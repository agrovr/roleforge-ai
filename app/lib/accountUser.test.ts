import assert from "node:assert/strict";
import test from "node:test";

import {
  accountAvatarUrl,
  accountDisplayName,
  accountEmailVerificationLabel,
  accountIdentityFromClaims,
  accountReference,
  accountSecurityDateLabel,
  accountSignInMethodLabel,
} from "./accountUser";

test("builds the public account identity from verified JWT claims", () => {
  assert.deepEqual(
    accountIdentityFromClaims({
      sub: "user-123",
      email: " person@example.com ",
      user_metadata: { full_name: "Avery Stone", picture: "https://example.com/avatar.png" },
      app_metadata: { provider: "google", providers: ["google"] },
    }),
    {
      id: "user-123",
      email: "person@example.com",
      user_metadata: {
        avatar_url: undefined,
        full_name: "Avery Stone",
        name: undefined,
        picture: "https://example.com/avatar.png",
      },
      app_metadata: {
        provider: "google",
        providers: ["google"],
      },
    },
  );
  assert.equal(accountIdentityFromClaims({ email: "person@example.com" }), null);
  assert.equal(accountIdentityFromClaims(null), null);
});

test("uses explicit account names before provider full names", () => {
  assert.equal(
    accountDisplayName({
      email: "person@example.com",
      user_metadata: { name: "Avery Stone", full_name: "Avery Google" },
    }),
    "Avery Stone",
  );
});

test("uses saved profile display names before provider metadata", () => {
  assert.equal(
    accountDisplayName(
      {
        email: "person@example.com",
        user_metadata: { name: "Avery Stone", full_name: "Avery Google" },
      },
      "  Saved   Account  ",
    ),
    "Saved Account",
  );
});

test("falls back to Google full_name metadata", () => {
  assert.equal(
    accountDisplayName({
      email: "person@example.com",
      user_metadata: { full_name: "Zero Kirisame" },
    }),
    "Zero Kirisame",
  );
});

test("trims noisy provider display names", () => {
  assert.equal(
    accountDisplayName({
      user_metadata: { full_name: "  Zero   Kirisame  " },
    }),
    "Zero Kirisame",
  );
});

test("returns an empty name when metadata is missing", () => {
  assert.equal(accountDisplayName({ email: "person@example.com" }), "");
  assert.equal(accountDisplayName(null), "");
});

test("builds a safe public account reference from provider ids", () => {
  assert.equal(accountReference("4adcd15a-769a-4c2f-939f-09df6e70a225"), "RF-ACCT-70A225");
  assert.equal(accountReference("RF-ACCT-70A225"), "RF-ACCT-70A225");
  assert.equal(accountReference("abc"), "RF-ACCT-000ABC");
  assert.equal(accountReference(""), "RF-ACCT-ACCOUNT");
});

test("reads safe provider avatar urls from account metadata", () => {
  assert.equal(
    accountAvatarUrl({ user_metadata: { avatar_url: "https://lh3.googleusercontent.com/avatar" } }),
    "https://lh3.googleusercontent.com/avatar",
  );
  assert.equal(
    accountAvatarUrl({ user_metadata: { picture: "https://example.com/profile.png" } }),
    "https://example.com/profile.png",
  );
});

test("rejects unsafe provider avatar urls", () => {
  assert.equal(accountAvatarUrl({ user_metadata: { avatar_url: "http://example.com/profile.png" } }), "");
  assert.equal(accountAvatarUrl({ user_metadata: { avatar_url: "javascript:alert(1)" } }), "");
  assert.equal(accountAvatarUrl({ user_metadata: { avatar_url: "not a url" } }), "");
});

test("labels account sign-in methods from trusted app metadata", () => {
  assert.equal(accountSignInMethodLabel({ app_metadata: { provider: "google", providers: ["google", "email"] } }), "Google + Email");
  assert.equal(accountSignInMethodLabel({ app_metadata: { provider: "github" } }), "GitHub");
  assert.equal(accountSignInMethodLabel({ email: "person@example.com" }), "Email");
  assert.equal(accountSignInMethodLabel({}), "Not recorded");
});

test("summarizes account email verification state", () => {
  assert.equal(accountEmailVerificationLabel({ email: "person@example.com", email_confirmed_at: "2026-01-02T00:00:00Z" }), "Confirmed");
  assert.equal(accountEmailVerificationLabel({ email: "person@example.com", confirmed_at: "2026-01-02T00:00:00Z" }), "Confirmed");
  assert.equal(accountEmailVerificationLabel({ email: "person@example.com" }), "Pending confirmation");
  assert.equal(accountEmailVerificationLabel({}), "No email");
});

test("formats account security dates defensively", () => {
  assert.match(accountSecurityDateLabel("2026-01-02T03:04:05Z"), /2026/);
  assert.equal(accountSecurityDateLabel("not a date"), "Not recorded");
  assert.equal(accountSecurityDateLabel(null), "Not recorded");
});
