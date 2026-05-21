import Link from "next/link";
import { redirect } from "next/navigation";

import { Brand } from "../components/Brand";
import { RoleForgeIcon } from "../components/RoleForgeIcons";
import { ThemeToggle } from "../components/ThemeToggle";
import { billingStatusDetail, billingStatusLabel, billingStatusTone } from "../lib/billing/display";
import { reconcileUserSubscriptionEntitlement } from "../lib/billing/entitlements";
import { getStripeBillingConfig, PREMIUM_PRICE } from "../lib/billing/stripe";
import { loadAccountEntitlement } from "../lib/entitlements";
import { createRoleForgeServerClient } from "../lib/supabase/server";
import { loadAccountUsage } from "../lib/usage";
import { SettingsSectionNav } from "./SettingsSectionNav";

type CountResult = { count: number | null; error: unknown };
type ExportRow = {
  label: "PDF" | "DOCX" | "TXT";
  enabled: boolean;
  included: string;
  locked: string;
};
type SettingsSearchParams = Promise<Record<string, string | string[] | undefined>>;

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function billingNotice(value: string | undefined) {
  switch (value) {
    case "checkout-success":
      return {
        tone: "success",
        text: "Checkout is complete. Premium access will appear here as soon as the subscription syncs.",
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
    default:
      return null;
  }
}

function formatPlanDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

async function countRows(
  supabase: NonNullable<Awaited<ReturnType<typeof createRoleForgeServerClient>>>,
  table: "resume_projects" | "tailor_runs",
) {
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true }) as CountResult;
  return error ? 0 : count ?? 0;
}

export default async function SettingsPage({ searchParams }: { searchParams: SettingsSearchParams }) {
  const params = await searchParams;
  const notice = billingNotice(getParam(params.billing));
  const supabase = await createRoleForgeServerClient();

  if (!supabase) {
    redirect("/login?next=/settings&account=signin-required");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings&account=signin-required");
  }

  const [projectCount, runCount] = await Promise.all([
    countRows(supabase, "resume_projects"),
    countRows(supabase, "tailor_runs"),
    reconcileUserSubscriptionEntitlement(user.id).catch(() => false),
  ]);
  const entitlement = await loadAccountEntitlement(supabase, user.id);
  const usage = await loadAccountUsage(supabase, entitlement);
  const billingConfig = getStripeBillingConfig();
  const billingReady = billingConfig.checkoutConfigured && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  const premiumActive = entitlement.plan === "premium" && ["active", "trialing"].includes(entitlement.billingStatus);
  const planLabel = premiumActive ? "Premium" : "Free";
  const billingLabel = billingStatusLabel(entitlement.billingStatus);
  const billingDetail = billingStatusDetail(entitlement.billingStatus);
  const billingTone = billingStatusTone(entitlement.billingStatus);
  const premiumEnding = premiumActive && entitlement.cancelAtPeriodEnd;
  const premiumEndLabel = formatPlanDate(entitlement.cancelAt || entitlement.currentPeriodEnd);
  const usageResetLabel = formatPlanDate(usage.currentPeriodEnd);
  const displayPlanLabel = premiumEnding ? "Premium ending" : `${planLabel} plan`;
  const displayName =
    typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : "";
  const planFeatures = premiumActive
    ? ["Unlimited runs", "DOCX and TXT exports", premiumEnding && premiumEndLabel ? `Access until ${premiumEndLabel}` : "Saved projects"]
    : ["5 runs each month", "PDF export", "Saved projects"];
  const exportRows: ExportRow[] = [
    { label: "PDF", enabled: entitlement.exportFormats.pdf, included: "Included", locked: "Unavailable" },
    { label: "DOCX", enabled: entitlement.exportFormats.docx, included: "Included with Premium", locked: "Premium" },
    { label: "TXT", enabled: entitlement.exportFormats.txt, included: "Included with Premium", locked: "Premium" },
  ];

  return (
    <main className="settings-page-shell">
      <header className="settings-page-topbar">
        <Brand href="/" label="RoleForge AI home" />
        <div className="settings-page-actions">
          <Link className="btn btn-soft btn-sm" href="/app">Studio</Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="settings-page-layout">
        <SettingsSectionNav />

        <section className="settings-page-main">
          <div className="settings-page-hero">
            <div>
              <div className="eyebrow">Workspace settings</div>
              <h1>Settings</h1>
              <p>Manage your account, saved projects, export access, and plan state.</p>
            </div>
            <div className="settings-hero-status">
              <span className={`settings-status-pill ${premiumEnding ? "ready" : premiumActive ? "good" : "ready"}`}>{displayPlanLabel}</span>
              <div className="settings-plan-includes" aria-label={`${planLabel} plan includes`}>
                {planFeatures.map((feature) => (
                  <span key={feature}>{feature}</span>
                ))}
              </div>
            </div>
          </div>

          {notice ? (
            <div className={`settings-billing-alert ${notice.tone}`} role="status">
              <RoleForgeIcon name={notice.tone === "success" ? "check" : "settings"} size={16} />
              <span>{notice.text}</span>
            </div>
          ) : null}

          <section className="settings-section" id="account">
            <div className="settings-section-copy">
              <h2>Account</h2>
              <p>Your studio access is tied to this signed-in account.</p>
            </div>
            <div className="settings-section-panel">
              <div className="settings-profile-row">
                <div className="studio-account-button settings-profile-avatar" aria-hidden="true">
                  {(displayName || user.email || "RF").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <strong>{displayName || "RoleForge user"}</strong>
                  <span>{user.email}</span>
                </div>
              </div>
              <div className="settings-metric-row">
                <div className="settings-metric">
                  <strong>{premiumEnding ? "Ending" : planLabel}</strong>
                  <span>Current plan</span>
                </div>
                <div className="settings-metric">
                  <strong>{billingLabel}</strong>
                  <span>Billing state</span>
                </div>
                <div className="settings-metric">
                  <strong>{usage.monthlyRunLimit === null ? "Unlimited" : usage.remainingRuns}</strong>
                  <span>{usage.monthlyRunLimit === null ? "Runs available" : "Runs left"}</span>
                </div>
              </div>
              <p className="settings-billing-note">{billingDetail}</p>
              <form action="/auth/signout" method="post">
                <input type="hidden" name="next" value="/login?account=signed-out" />
                <button className="ghost-button" type="submit">Sign out</button>
              </form>
            </div>
          </section>

          <section className="settings-section" id="projects">
            <div className="settings-section-copy">
              <h2>Saved projects</h2>
              <p>Completed runs are stored with your account and can be restored from History.</p>
            </div>
            <div className="settings-section-panel">
              <div className="settings-metric-row">
                <div className="settings-metric">
                  <strong>{projectCount}</strong>
                  <span>Projects</span>
                </div>
                <div className="settings-metric">
                  <strong>{runCount}</strong>
                  <span>Runs</span>
                </div>
              </div>
              <Link className="btn btn-soft btn-sm settings-inline-link" href="/app#history">Open history</Link>
            </div>
          </section>

          <section className="settings-section" id="usage">
            <div className="settings-section-copy">
              <h2>Usage</h2>
              <p>Completed tailoring runs count against the current monthly plan period.</p>
            </div>
            <div className="settings-section-panel">
              <div className="settings-usage-card">
                <div>
                  <span className="settings-price-kicker">This month</span>
                  <strong>
                    {usage.monthlyRunLimit === null
                      ? `${usage.monthlyRuns}`
                      : `${usage.monthlyRuns}/${usage.monthlyRunLimit}`}
                  </strong>
                  <small>{usage.monthlyRunLimit === null ? "unlimited premium runs" : `${usage.remainingRuns} remaining`}</small>
                </div>
                {usage.monthlyRunLimit === null ? (
                  <div className="settings-usage-track unlimited"><span style={{ width: "100%" }} /></div>
                ) : (
                  <div className="settings-usage-track">
                    <span style={{ width: `${Math.min(100, (usage.monthlyRuns / usage.monthlyRunLimit) * 100)}%` }} />
                  </div>
                )}
                <div className="settings-usage-meta">
                  <span>{usage.monthlyRunLimit === null ? "No monthly cap" : `${usage.remainingRuns} runs left`}</span>
                  <span>{usageResetLabel ? `Resets ${usageResetLabel}` : "Resets monthly"}</span>
                </div>
              </div>
              <p className="settings-billing-note">
                {usage.monthlyRunLimit === null
                  ? premiumEnding && premiumEndLabel
                    ? `Premium access remains available until ${premiumEndLabel}.`
                    : "Premium does not count completed runs against a monthly cap."
                  : "Free includes 5 completed tailoring runs each month. Upgrade when you need more room."}
              </p>
            </div>
          </section>

          <section className="settings-section" id="exports">
            <div className="settings-section-copy">
              <h2>Exports</h2>
              <p>
                {premiumActive
                  ? premiumEnding && premiumEndLabel
                    ? `PDF, DOCX, and TXT exports remain active until ${premiumEndLabel}.`
                    : "PDF, DOCX, and TXT exports are active for this account."
                  : "PDF export is included on Free. DOCX and TXT unlock with Premium."}
              </p>
            </div>
            <div className="settings-section-panel settings-export-list">
              {exportRows.map((row) => (
                <div className={`settings-export-item ${row.enabled ? "enabled" : "disabled"}`} key={row.label}>
                  <span><RoleForgeIcon name={row.enabled ? "check" : "lock"} size={14} />{row.label}</span>
                  <small>{row.enabled ? row.included : row.locked}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="settings-section" id="billing">
            <div className="settings-section-copy">
              <h2>Billing</h2>
              <p>Premium is priced for early users at ${PREMIUM_PRICE.monthly / 100}/month or ${PREMIUM_PRICE.yearly / 100}/year.</p>
            </div>
            <div className="settings-section-panel settings-billing-panel">
              <div className="settings-billing-head">
                <span className={`settings-status-pill ${premiumEnding ? "ready" : billingTone}`}>
                  {premiumEnding ? "Canceling" : billingLabel}
                </span>
                <form action="/api/billing/portal" method="post">
                  <button className="ghost-button" type="submit" disabled={!billingReady || entitlement.billingStatus === "none"}>
                    Manage billing
                  </button>
                </form>
              </div>
              {premiumActive ? (
                <div className="settings-plan-active-card">
                  <div>
                    <span className="settings-price-kicker">Current access</span>
                    <strong>{premiumEnding ? "Premium is ending" : "Premium is active"}</strong>
                    <p>
                      {premiumEnding && premiumEndLabel
                        ? `Your subscription is canceled and Premium access remains available until ${premiumEndLabel}.`
                        : "Unlimited tailoring runs and PDF, DOCX, and TXT exports are available in the studio."}
                    </p>
                  </div>
                  <Link className="btn btn-soft btn-sm settings-inline-link" href="/app">Open studio</Link>
                </div>
              ) : (
                <div className="settings-price-grid">
                  <article className="settings-price-card">
                    <div>
                      <span className="settings-price-kicker">Monthly</span>
                      <strong>${PREMIUM_PRICE.monthly / 100}</strong>
                      <small>per month</small>
                    </div>
                    <form action="/api/billing/checkout" method="post">
                      <input type="hidden" name="interval" value="month" />
                      <button className="primary-button" type="submit" disabled={!billingReady}>Start monthly</button>
                    </form>
                  </article>
                  <article className="settings-price-card featured">
                    <div>
                      <span className="settings-price-kicker">Yearly</span>
                      <strong>${PREMIUM_PRICE.yearly / 100}</strong>
                      <small>per year</small>
                    </div>
                    <form action="/api/billing/checkout" method="post">
                      <input type="hidden" name="interval" value="year" />
                      <button className="primary-button" type="submit" disabled={!billingReady}>Start yearly</button>
                    </form>
                  </article>
                </div>
              )}
              <p className="settings-billing-note">
                {premiumActive
                  ? premiumEnding
                    ? "Use Manage billing if you want to reactivate or review invoices."
                    : "Use Manage billing for subscription changes and invoices."
                  : billingReady
                  ? "Checkout opens securely in Stripe. Premium access updates after the subscription syncs."
                  : "Premium checkout is not available right now."}
              </p>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
