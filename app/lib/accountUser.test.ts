import assert from "node:assert/strict";
import test from "node:test";

import { accountAvatarUrl, accountDisplayName } from "./accountUser";

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
