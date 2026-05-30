import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const studioPage = readFileSync("app/app/page.tsx", "utf8");
const settingsPage = readFileSync("app/settings/page.tsx", "utf8");

function signoutForms(source) {
  return [...source.matchAll(/<form\b[^>]*action="\/auth\/signout"[\s\S]*?<\/form>/g)].map(
    (match) => match[0],
  );
}

test("sign-out forms land on the signed-out login notice", () => {
  const forms = [...signoutForms(studioPage), ...signoutForms(settingsPage)];

  assert.ok(forms.length >= 2);
  forms.forEach((form) => {
    assert.match(form, /name="next"\s+value="\/login\?account=signed-out"/);
    assert.doesNotMatch(form, /name="next"\s+value="\/app"/);
  });
});
