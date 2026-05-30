import assert from "node:assert/strict";
import test from "node:test";

import { buildReviewSuggestionCards } from "./reviewSuggestions";

test("builds review cards from generated change notes and suggestions", () => {
  const cards = buildReviewSuggestionCards({
    changes: [" Updated the summary for product scope. ", "", "Added metrics to experience."],
    suggestions: ["Mention launch ownership.", "Keep formatting simple."],
  });

  assert.equal(cards.length, 4);
  assert.deepEqual(
    cards.map((card) => card.kind),
    ["change", "change", "suggestion", "suggestion"],
  );
  assert.equal(cards[0].label, "Change note");
  assert.equal(cards[2].meta, "Review suggestion 1");
  assert.equal(cards[0].after, "Updated the summary for product scope.");
  assert.match(cards[0].id, /^change-1-/);
});

test("limits review cards for a compact studio panel", () => {
  const cards = buildReviewSuggestionCards({
    changes: ["one", "two", "three"],
    suggestions: ["four", "five", "six"],
    limit: 4,
  });

  assert.deepEqual(cards.map((card) => card.after), ["one", "two", "three", "four"]);
});
