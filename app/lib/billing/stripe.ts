import Stripe from "stripe";

export type BillingInterval = "month" | "year";

export const PREMIUM_PRICE = {
  monthly: 900,
  yearly: 7200,
  currency: "usd",
};

export const CHECKOUT_SESSION_ID_TEMPLATE = "{CHECKOUT_SESSION_ID}";

export function getStripeBillingConfig() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
  const monthlyPriceId = process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID?.trim() ?? "";
  const yearlyPriceId = process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID?.trim() ?? "";

  return {
    secretKey,
    webhookSecret,
    monthlyPriceId,
    yearlyPriceId,
    checkoutConfigured: Boolean(secretKey && monthlyPriceId && yearlyPriceId),
    webhookConfigured: Boolean(secretKey && webhookSecret),
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
