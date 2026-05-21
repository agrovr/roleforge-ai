import assert from "node:assert/strict";
import test from "node:test";

import { redirectPathWithParam, safeRedirectPath } from "./safeRedirect";

test("keeps redirects inside the app", () => {
  assert.equal(safeRedirectPath("/app"), "/app");
  assert.equal(safeRedirectPath("//example.com"), "/app");
  assert.equal(safeRedirectPath("https://example.com"), "/app");
  assert.equal(safeRedirectPath(null), "/app");
});

test("adds notice params without breaking existing query strings", () => {
  assert.equal(
    redirectPathWithParam("/login?next=%2Fapp", "account", "signed-out"),
    "/login?next=%2Fapp&account=signed-out",
  );
});

test("adds notice params before a hash fragment", () => {
  assert.equal(
    redirectPathWithParam("/settings#billing", "account", "signed-out"),
    "/settings?account=signed-out#billing",
  );
});
