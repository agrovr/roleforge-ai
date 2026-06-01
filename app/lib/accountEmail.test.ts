import assert from "node:assert/strict";
import test from "node:test";

import { normalizeAccountEmail, validateAccountEmail } from "./accountEmail";

test("normalizes account email input", () => {
  assert.equal(normalizeAccountEmail("  Avery+Work@Example.COM  "), "avery+work@example.com");
});

test("validates account email changes", () => {
  assert.deepEqual(validateAccountEmail("new@example.com", "old@example.com"), {
    ok: true,
    email: "new@example.com",
  });
  assert.deepEqual(validateAccountEmail("old@example.com", "old@example.com"), {
    ok: false,
    reason: "same",
    email: "old@example.com",
  });
  assert.deepEqual(validateAccountEmail("not-email", "old@example.com"), {
    ok: false,
    reason: "invalid",
    email: "not-email",
  });
});
