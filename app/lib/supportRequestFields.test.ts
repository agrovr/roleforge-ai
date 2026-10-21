import assert from "node:assert/strict";
import test from "node:test";
import { parseSupportRequestInput, supportRequestFieldErrors } from "./supportRequests";

test("support form reports every invalid required field at once", () => {
  assert.deepEqual(Object.keys(supportRequestFieldErrors({ category: "invalid", subject: " ", message: "short" })), ["category", "subject", "message"]);
});

test("support client and server validate normalized text consistently", () => {
  const input = { category: "billing", subject: "  Billing   question ", message: "  I need help understanding the available billing options.  " };
  assert.deepEqual(supportRequestFieldErrors(input), {});
  const result = parseSupportRequestInput(input);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.input.subject, "Billing question");
  const tooShort = { ...input, subject: "a  b" };
  assert.ok(supportRequestFieldErrors(tooShort).subject);
  assert.equal(parseSupportRequestInput(tooShort).ok, false);
});

test("support bounds reject excessive text without changing optional context behavior", () => {
  assert.ok(supportRequestFieldErrors({ category: "workflow", subject: "s".repeat(121), message: "m".repeat(2001) }).subject);
  const result = parseSupportRequestInput({ category: "workflow", subject: "Valid subject", message: "A sufficiently detailed support message.", contextUrl: "not a valid context" });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.input.contextUrl, null);
});
