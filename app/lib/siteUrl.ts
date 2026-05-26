const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

function normalizeOrigin(value: string | undefined) {
  if (!value) return null;

  const withProtocol = value.startsWith("http") ? value : `https://${value}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
}

export function getConfiguredSiteOrigin(fallback = "https://roleforgeai.vercel.app") {
  return (
    normalizeOrigin(process.env.ROLEFORGE_SITE_URL) ??
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) ??
    normalizeOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    normalizeOrigin(process.env.VERCEL_URL) ??
    fallback
  );
}

export function getRequestOrigin(requestUrl: string) {
  const requestOrigin = new URL(requestUrl).origin;
  const configuredOrigin = getConfiguredSiteOrigin("");

  if (configuredOrigin && !localhostPattern.test(requestOrigin)) {
    return configuredOrigin;
  }

  return requestOrigin;
}
