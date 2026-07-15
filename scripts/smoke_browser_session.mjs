import { parseCookieHeader } from "./smoke_frontend.mjs";

export function browserCookiesFromHeader(cookieHeader, baseUrl) {
  const target = new URL(baseUrl);
  const url = `${target.origin}/`;

  return Array.from(parseCookieHeader(cookieHeader).entries()).map(([name, value]) => ({
    name,
    value,
    url,
    secure: target.protocol === "https:",
    sameSite: "Lax",
  }));
}

function assertCdpSuccess(response, action) {
  if (response?.error) {
    throw new Error(`${action} failed: ${response.error.message || "Chrome returned an unknown protocol error"}`);
  }
}

export async function installBrowserSession(send, baseUrl, cookieHeader) {
  const cookies = browserCookiesFromHeader(cookieHeader, baseUrl);
  if (!cookies.length) {
    throw new Error("Signed-in layout smoke received an empty browser session cookie");
  }

  const clearResult = await send("Network.clearBrowserCookies");
  assertCdpSuccess(clearResult, "Clearing the rendered-smoke browser cookie jar");

  const setResult = await send("Network.setCookies", { cookies });
  assertCdpSuccess(setResult, "Installing the rendered-smoke browser session");

  return cookies.length;
}
