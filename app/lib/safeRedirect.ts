export function safeRedirectPath(value: FormDataEntryValue | string | null, fallback = "/app") {
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  return trimmed;
}

export function redirectPathWithParam(path: string, key: string, value: string) {
  const url = new URL(path, "https://roleforge.local");
  url.searchParams.set(key, value);

  return `${url.pathname}${url.search}${url.hash}`;
}
