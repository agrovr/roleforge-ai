import type { BillingStatus } from "../entitlements";

type BillingConfigForReadiness = {
  secretKey: string;
  checkoutConfigured: boolean;
};

export function billingReadiness(
  config: BillingConfigForReadiness,
  options: { hasServiceRole: boolean; billingStatus: BillingStatus },
) {
  const billingServiceReady = Boolean(config.secretKey && options.hasServiceRole);

  return {
    checkoutReady: Boolean(config.checkoutConfigured && billingServiceReady),
    portalReady: Boolean(billingServiceReady && options.billingStatus !== "none"),
  };
}
