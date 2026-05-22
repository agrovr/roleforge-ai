import assert from "node:assert/strict";
import test from "node:test";

import { accountDisplayName } from "./accountUser";

test("uses explicit account names before provider full names", () => {
  assert.equal(
    accountDisplayName({
      email: "person@example.com",
      user_metadata: { name: "Avery Stone", full_name: "Avery Google" },
    }),
    "Avery Stone",
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

