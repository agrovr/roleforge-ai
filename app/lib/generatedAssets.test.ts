import assert from "node:assert/strict";
import test from "node:test";

import { formatInterviewPrepForClipboard } from "./generatedAssets";

test("formats interview prep for copying", () => {
  assert.equal(
    formatInterviewPrepForClipboard([
      {
        question: "How do you improve operations workflows?",
        answer_bullets: ["Mention reporting cadence.", "Tie process docs to fewer missed follow-ups."],
      },
      {
        question: "Why this role?",
        answer_bullets: ["Connect support, recruiting, and product coordination."],
      },
    ]),
    [
      "1. How do you improve operations workflows?",
      "- Mention reporting cadence.",
      "- Tie process docs to fewer missed follow-ups.",
      "",
      "2. Why this role?",
      "- Connect support, recruiting, and product coordination.",
    ].join("\n"),
  );
});

test("skips empty interview prep rows", () => {
  assert.equal(
    formatInterviewPrepForClipboard([
      { question: "  ", answer_bullets: ["  "] },
      { question: "Tell me about your process.", answer_bullets: [] },
    ]),
    "2. Tell me about your process.",
  );
});
