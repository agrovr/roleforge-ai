export function safeRedirectPath(value: FormDataEntryValue | string | null, fallback = "/app") {
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  return trimmed;
}
