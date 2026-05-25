import assert from "node:assert/strict";
import test from "node:test";

import { loginStatusRedirectPath } from "./authRedirect";

test("routes auth failures to login while preserving the intended destination", () => {
  assert.equal(
    loginStatusRedirectPath("/app?template=modern", "signin-error"),
    "/login?next=%2Fapp%3Ftemplate%3Dmodern&account=signin-error",
  );
});

test("keeps auth error details readable and same-origin", () => {
  assert.equal(
    loginStatusRedirectPath("https://example.com", "signin-error", "OAuth provider denied access"),
    "/login?next=%2Fapp&account=signin-error&auth_error=OAuth+provider+denied+access",
  );
});

test("supports account configuration failures", () => {
  assert.equal(
    loginStatusRedirectPath("/settings#billing", "account-not-configured"),
    "/login?next=%2Fsettings%23billing&account=account-not-configured",
  );
});
