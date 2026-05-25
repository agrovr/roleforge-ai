import { safeRedirectPath } from "./safeRedirect";

export function loginStatusRedirectPath(
  next: string | null | undefined,
  account: "account-not-configured" | "signin-error",
  authError?: string | null,
) {
  const url = new URL("/login", "https://roleforge.local");
  url.searchParams.set("next", safeRedirectPath(next ?? null));
  url.searchParams.set("account", account);

  const cleanAuthError = authError?.replace(/\s+/g, " ").trim();
  if (cleanAuthError) {
    url.searchParams.set("auth_error", cleanAuthError);
  }

  return `${url.pathname}${url.search}`;
}
