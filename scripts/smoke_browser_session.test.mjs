import assert from "node:assert/strict";
import test from "node:test";

import { browserCookiesFromHeader, installBrowserSession } from "./smoke_browser_session.mjs";

test("browser session cookies preserve Supabase chunks and encoded values", () => {
  const cookies = browserCookiesFromHeader(
    "sb-project-auth-token.0=base64-first==; sb-project-auth-token.1=second_part; theme=dark",
    "https://roleforgeai.vercel.app",
  );

  assert.deepEqual(cookies, [
    {
      name: "sb-project-auth-token.0",
      value: "base64-first==",
      url: "https://roleforgeai.vercel.app/",
      secure: true,
      sameSite: "Lax",
    },
    {
      name: "sb-project-auth-token.1",
      value: "second_part",
      url: "https://roleforgeai.vercel.app/",
      secure: true,
      sameSite: "Lax",
    },
    {
      name: "theme",
      value: "dark",
      url: "https://roleforgeai.vercel.app/",
      secure: true,
      sameSite: "Lax",
    },
  ]);
});

test("browser session cookies remain usable for local HTTP smoke", () => {
  const [cookie] = browserCookiesFromHeader("sb-project-auth-token=session", "http://127.0.0.1:3011/path");

  assert.equal(cookie.url, "http://127.0.0.1:3011/");
  assert.equal(cookie.secure, false);
});

test("browser session installation clears stale state and writes the cookie jar", async () => {
  const calls = [];
  const send = async (method, params) => {
    calls.push({ method, params });
    return {};
  };

  const installed = await installBrowserSession(
    send,
    "https://roleforgeai.vercel.app",
    "sb-project-auth-token.0=first; sb-project-auth-token.1=second",
  );

  assert.equal(installed, 2);
  assert.equal(calls[0].method, "Network.clearBrowserCookies");
  assert.equal(calls[1].method, "Network.setCookies");
  assert.equal(calls[1].params.cookies.length, 2);
});

test("browser session installation fails before layout checks on invalid state", async () => {
  await assert.rejects(
    installBrowserSession(async () => ({}), "https://roleforgeai.vercel.app", ""),
    /empty browser session cookie/,
  );

  await assert.rejects(
    installBrowserSession(
      async (method) => (method === "Network.setCookies" ? { error: { message: "invalid cookie" } } : {}),
      "https://roleforgeai.vercel.app",
      "sb-project-auth-token=session",
    ),
    /Installing the rendered-smoke browser session failed: invalid cookie/,
  );
});
