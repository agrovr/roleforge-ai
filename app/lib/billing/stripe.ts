import Stripe from "stripe";

export type BillingInterval = "month" | "year";

export const PREMIUM_PRICE = {
  monthly: 900,
  yearly: 7200,
  currency: "usd",
};

export const CHECKOUT_SESSION_ID_TEMPLATE = "{CHECKOUT_SESSION_ID}";

export type StripeKeyMode = "live" | "test" | "unknown";

export function stripeKeyMode(secretKey: string): StripeKeyMode {
  if (secretKey.startsWith("sk_live_")) return "live";
  if (secretKey.startsWith("sk_test_")) return "test";
  return secretKey ? "unknown" : "unknown";
}

export function productionRequiresLiveStripeKey() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().toLowerCase() ?? "";
  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim().toLowerCase() ?? "";
  return process.env.VERCEL_ENV === "production" || siteUrl.includes("roleforgeai.vercel.app") || productionUrl.includes("roleforgeai.vercel.app");
}

export function getStripeBillingConfig() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
  const monthlyPriceId = process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID?.trim() ?? "";
  const yearlyPriceId = process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID?.trim() ?? "";
  const keyMode = stripeKeyMode(secretKey);
  const liveKeyRequired = productionRequiresLiveStripeKey();
  const liveModeReady = !liveKeyRequired || keyMode === "live";

  return {
    secretKey,
    webhookSecret,
    monthlyPriceId,
    yearlyPriceId,
    keyMode,
    liveKeyRequired,
    liveModeReady,
    checkoutConfigured: Boolean(secretKey && monthlyPriceId && yearlyPriceId && liveModeReady),
    webhookConfigured: Boolean(secretKey && webhookSecret && liveModeReady),
  };
}

export function getStripeClient() {
  const { secretKey } = getStripeBillingConfig();

  if (!secretKey) {
    return null;
  }

  return new Stripe(secretKey, {
    appInfo: {
      name: "RoleForge AI",
      version: "0.1.0",
    },
  });
}

export function priceIdForInterval(interval: BillingInterval) {
  const config = getStripeBillingConfig();
  return interval === "year" ? config.yearlyPriceId : config.monthlyPriceId;
}

export function absoluteUrl(request: Request, path: string) {
  const configuredSiteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
  const origin = configuredSiteUrl || new URL(request.url).origin;
  return new URL(path, origin).toString();
}

export function checkoutSuccessUrl(request: Request) {
  const url = absoluteUrl(
    request,
    `/settings?billing=checkout-success&session_id=${CHECKOUT_SESSION_ID_TEMPLATE}`,
  );

  return url.replace(encodeURIComponent(CHECKOUT_SESSION_ID_TEMPLATE), CHECKOUT_SESSION_ID_TEMPLATE);
}
