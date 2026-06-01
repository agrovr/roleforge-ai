#!/usr/bin/env node

import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";

import Stripe from "stripe";

const DEFAULT_PRODUCT_NAME = "RoleForge AI Premium";
const DEFAULT_EXPIRES_HOURS = 24;

function stripeKeyMode(secretKey = "") {
  if (secretKey.startsWith("sk_live_")) return "live";
  if (secretKey.startsWith("sk_test_")) return "test";
  return secretKey ? "unknown" : "missing";
}

function firstNonEmptyEnv(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

function parsePositiveInteger(value, name) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

function generatedCode() {
  return `ROLEFORGE-FREE-${randomBytes(3).toString("hex").toUpperCase()}`;
}

function parseArgs(argv) {
  const options = {
    code: "",
    duration: "forever",
    durationMonths: null,
    expiresHours: DEFAULT_EXPIRES_HOURS,
    maxRedemptions: 1,
    productName: DEFAULT_PRODUCT_NAME,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const equalsIndex = arg.indexOf("=");
    const name = equalsIndex >= 0 ? arg.slice(0, equalsIndex) : arg;
    const inlineValue = equalsIndex >= 0 ? arg.slice(equalsIndex + 1) : undefined;

    if (name === "--help" || name === "-h") {
      options.help = true;
      continue;
    }
    if (["--code", "--duration", "--duration-months", "--expires-hours", "--max-redemptions", "--product-name"].includes(name)) {
      const value = inlineValue ?? argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
      if (name === "--code") options.code = value.trim().toUpperCase();
      if (name === "--duration") {
        if (value !== "once" && value !== "forever" && value !== "repeating") {
          throw new Error("--duration must be once, forever, or repeating.");
        }
        options.duration = value;
      }
      if (name === "--duration-months") options.durationMonths = parsePositiveInteger(value, "--duration-months");
      if (name === "--expires-hours") options.expiresHours = parsePositiveInteger(value, "--expires-hours");
      if (name === "--max-redemptions") options.maxRedemptions = parsePositiveInteger(value, "--max-redemptions");
      if (name === "--product-name") options.productName = value.trim();
      if (inlineValue === undefined) index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`RoleForge AI live promotion code creator

Usage:
  STRIPE_SECRET_KEY=sk_live_... node scripts/create_live_promo_code.mjs
  STRIPE_SECRET_KEY=sk_live_... node scripts/create_live_promo_code.mjs --code ROLEFORGE-FREE-1

Options:
  --code <value>             Promotion code to create. Defaults to ROLEFORGE-FREE-XXXXXX.
  --duration <once|forever|repeating>
                             Coupon duration. Default: forever.
  --duration-months <number> Required when --duration repeating. Use 12 for one year free.
  --expires-hours <number>   Expiration window. Default: ${DEFAULT_EXPIRES_HOURS}.
  --max-redemptions <number> Maximum redemptions. Default: 1.
  --product-name <name>      Stripe product to restrict the coupon to. Default: ${DEFAULT_PRODUCT_NAME}.

The script requires a live Stripe secret key and creates a 100% off, one-use
promotion code for no-charge Premium entitlement testing. It never prints the secret key.`);
}

async function findLiveProduct(stripe, productName) {
  const products = await stripe.products.list({ active: true, limit: 100 });
  return products.data.find((product) => product.name === productName) || null;
}

export function validatePromoCodeOptions({
  secretKey,
  duration = "forever",
  durationMonths = null,
  expiresHours = DEFAULT_EXPIRES_HOURS,
  maxRedemptions = 1,
  productName = DEFAULT_PRODUCT_NAME,
} = {}) {
  const mode = stripeKeyMode(secretKey || "");
  if (mode !== "live") throw new Error("A live Stripe secret key (sk_live_...) is required.");
  if (duration !== "once" && duration !== "forever" && duration !== "repeating") {
    throw new Error("duration must be once, forever, or repeating.");
  }
  if (duration === "repeating") {
    parsePositiveInteger(String(durationMonths), "durationMonths");
  } else if (durationMonths !== null && durationMonths !== undefined) {
    throw new Error("durationMonths is only supported when duration is repeating.");
  }
  parsePositiveInteger(String(expiresHours), "expiresHours");
  parsePositiveInteger(String(maxRedemptions), "maxRedemptions");
  if (!productName?.trim()) throw new Error("productName is required.");
  return true;
}

export async function createLivePromotionCode({
  secretKey = firstNonEmptyEnv("STRIPE_SECRET_KEY", "ROLEFORGE_STRIPE_SECRET_KEY"),
  code,
  duration = "forever",
  durationMonths = null,
  expiresHours = DEFAULT_EXPIRES_HOURS,
  maxRedemptions = 1,
  productName = DEFAULT_PRODUCT_NAME,
} = {}) {
  validatePromoCodeOptions({ secretKey, duration, durationMonths, expiresHours, maxRedemptions, productName });
  const promotionCodeValue = code?.trim() ? code.trim().toUpperCase() : generatedCode();

  const stripe = new Stripe(secretKey, {
    appInfo: {
      name: "RoleForge AI live promotion code creator",
      version: "0.1.0",
    },
  });
  const product = await findLiveProduct(stripe, productName);
  if (!product) throw new Error(`Could not find an active Stripe product named "${productName}".`);

  const expiresAt = Math.floor(Date.now() / 1000) + expiresHours * 60 * 60;
  const couponDurationLabel = duration === "repeating" ? `${durationMonths} months` : duration;
  const coupon = await stripe.coupons.create({
    percent_off: 100,
    duration,
    ...(duration === "repeating" ? { duration_in_months: durationMonths } : {}),
    name: `RoleForge free (${couponDurationLabel})`,
    applies_to: {
      products: [product.id],
    },
    metadata: {
      app: "roleforge-ai",
      purpose: "no-charge-live-checkout-test",
      duration_months: duration === "repeating" ? String(durationMonths) : "",
    },
  });
  const promotionCode = await stripe.promotionCodes.create({
    promotion: {
      type: "coupon",
      coupon: coupon.id,
    },
    code: promotionCodeValue,
    expires_at: expiresAt,
    max_redemptions: maxRedemptions,
    metadata: {
      app: "roleforge-ai",
      purpose: "no-charge-live-checkout-test",
      duration_months: duration === "repeating" ? String(durationMonths) : "",
    },
  });

  return {
    code: promotionCode.code,
    couponId: coupon.id,
    promotionCodeId: promotionCode.id,
    productId: product.id,
    duration,
    durationMonths: duration === "repeating" ? durationMonths : null,
    expiresAt,
    maxRedemptions,
  };
}

export async function runCreateLivePromotionCodeCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printHelp();
    return 0;
  }

  const result = await createLivePromotionCode(options);
  console.log(JSON.stringify(result, null, 2));
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await runCreateLivePromotionCodeCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
