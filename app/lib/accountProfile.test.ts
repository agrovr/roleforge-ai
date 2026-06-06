import assert from "node:assert/strict";
import test from "node:test";

import { normalizeCommunicationPreferences, normalizeProfileDisplayName } from "./accountProfile";

test("normalizes saved profile display names", () => {
  assert.equal(normalizeProfileDisplayName("  Avery   Stone  "), "Avery Stone");
  assert.equal(normalizeProfileDisplayName(""), "");
  assert.equal(normalizeProfileDisplayName(null), "");
});

test("limits profile display names to a compact account label", () => {
  assert.throws(
    () => normalizeProfileDisplayName("a".repeat(81)),
    /80 characters or fewer/,
  );
});

test("normalizes communication preferences defensively", () => {
  assert.deepEqual(normalizeCommunicationPreferences({ productUpdates: true }), {
    productUpdates: true,
  });
  assert.deepEqual(normalizeCommunicationPreferences({ productUpdates: "true" }), {
    productUpdates: false,
  });
  assert.deepEqual(normalizeCommunicationPreferences(null), {
    productUpdates: false,
  });
});
