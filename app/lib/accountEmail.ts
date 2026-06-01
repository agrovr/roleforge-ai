const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeAccountEmail(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, "").trim().toLowerCase();
}

export function validateAccountEmail(value: unknown, currentEmail?: string | null) {
  const email = normalizeAccountEmail(value);
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { ok: false as const, reason: "invalid" as const, email };
  }

  if (currentEmail && email === normalizeAccountEmail(currentEmail)) {
    return { ok: false as const, reason: "same" as const, email };
  }

  return { ok: true as const, email };
}
