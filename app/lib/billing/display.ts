import type { BillingStatus } from "../entitlements";

export function billingStatusLabel(status: BillingStatus) {
  switch (status) {
    case "none":
      return "No subscription";
    case "trialing":
      return "Trial active";
    case "active":
      return "Active";
    case "past_due":
      return "Payment issue";
    case "canceled":
      return "Canceled";
    case "incomplete":
      return "Payment incomplete";
    case "incomplete_expired":
      return "Checkout expired";
    case "unpaid":
      return "Unpaid";
    case "paused":
      return "Paused";
    default:
      return "Plan status";
  }
}

export function billingStatusDetail(status: BillingStatus) {
  switch (status) {
    case "none":
      return "Premium checkout is available when you need more exports or runs.";
    case "trialing":
    case "active":
      return "Premium access is active for this account.";
    case "past_due":
      return "Update billing in Stripe to restore Premium access.";
    case "canceled":
      return "Your subscription has ended. You can start Premium again anytime.";
    case "incomplete":
      return "Checkout started but payment has not been completed.";
    case "incomplete_expired":
      return "That checkout session expired. Start checkout again when ready.";
    case "unpaid":
      return "Stripe marked the subscription unpaid. Update billing to restore access.";
    case "paused":
      return "The subscription is paused. Manage billing to review it.";
    default:
      return "Review billing in Stripe for the latest plan status.";
  }
}

export function billingStatusTone(status: BillingStatus) {
  switch (status) {
    case "trialing":
    case "active":
      return "good";
    case "past_due":
    case "incomplete":
    case "unpaid":
    case "paused":
      return "warn";
    case "none":
    case "canceled":
    case "incomplete_expired":
    default:
      return "muted";
  }
}
