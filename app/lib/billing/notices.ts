export type BillingNotice = {
  tone: "success" | "neutral";
  text: string;
};

export function billingNotice(value: string | undefined, options?: { premiumActive?: boolean }): BillingNotice | null {
  switch (value) {
    case "checkout-success":
      return {
        tone: "success",
        text: options?.premiumActive
          ? "Checkout is complete. Premium access is active for this account."
          : "Checkout is complete. Premium access will appear here as soon as the subscription syncs.",
      };
    case "checkout-canceled":
      return {
        tone: "neutral",
        text: "Checkout was canceled. Your current plan is unchanged.",
      };
    case "portal-return":
      return {
        tone: "success",
        text: "Billing details refreshed. Plan changes can take a moment to sync.",
      };
    case "no-customer":
      return {
        tone: "neutral",
        text: "Start Premium first, then billing management will open here.",
      };
    case "already-premium":
      return {
        tone: "neutral",
        text: "Premium is already active for this account. Use Manage billing for plan changes.",
      };
    case "temporarily-unavailable":
      return {
        tone: "neutral",
        text: "Billing is taking a moment to connect. Try again shortly.",
      };
    default:
      return null;
  }
}
