import Link from "next/link";
import { redirect } from "next/navigation";

import { Brand } from "../components/Brand";
import { RoleForgeIcon } from "../components/RoleForgeIcons";
import { ThemeToggle } from "../components/ThemeToggle";
import { getStripeBillingConfig, PREMIUM_PRICE } from "../lib/billing/stripe";
import { loadAccountEntitlement } from "../lib/entitlements";
import { createRoleForgeServerClient } from "../lib/supabase/server";
import { loadAccountUsage } from "../lib/usage";

type CountResult = { count: number | null; error: unknown };

async function countRows(
  supabase: NonNullable<Awaited<ReturnType<typeof createRoleForgeServerClient>>>,
  table: "resume_projects" | "tailor_runs",
) {
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true }) as CountResult;
  return error ? 0 : count ?? 0;
}

export default async function SettingsPage() {
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
  ]);
  const entitlement = await loadAccountEntitlement(supabase, user.id);
  const usage = await loadAccountUsage(supabase, entitlement);
  const billingConfig = getStripeBillingConfig();
  const billingReady = billingConfig.checkoutConfigured && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  const premiumActive = entitlement.plan === "premium" && ["active", "trialing"].includes(entitlement.billingStatus);
  const planLabel = entitlement.plan === "premium" ? "Premium" : "Free";
  const billingLabel =
    entitlement.billingStatus === "none"
      ? "No billing active"
      : entitlement.billingStatus.replace(/_/g, " ");
  const displayName =
    typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : "";

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
        <aside className="settings-page-nav" aria-label="Settings sections">
          <a className="active" href="#account"><RoleForgeIcon name="settings" size={15} /> Account</a>
          <a href="#projects"><RoleForgeIcon name="chart" size={15} /> Saved projects</a>
          <a href="#usage"><RoleForgeIcon name="sparkle" size={15} /> Usage</a>
          <a href="#exports"><RoleForgeIcon name="download" size={15} /> Exports</a>
          <a href="#billing"><RoleForgeIcon name="lock" size={15} /> Billing</a>
        </aside>

        <section className="settings-page-main">
          <div className="settings-page-hero">
            <div>
              <div className="eyebrow">Workspace settings</div>
              <h1>Settings</h1>
              <p>Manage your account, saved projects, export access, and plan state.</p>
            </div>
            <span className="settings-status-pill good">{planLabel} plan</span>
          </div>

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
                  <strong>{planLabel}</strong>
                  <span>Current plan</span>
                </div>
                <div className="settings-metric">
                  <strong>{billingLabel}</strong>
                  <span>Billing state</span>
                </div>
              </div>
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
              </div>
              <p className="settings-billing-note">
                {usage.monthlyRunLimit === null
                  ? "Premium has no monthly run cap. Fair-use protections still apply to keep the service stable."
                  : "Free includes 5 completed tailoring runs each month. Upgrade when you need more room."}
              </p>
            </div>
          </section>

          <section className="settings-section" id="exports">
            <div className="settings-section-copy">
              <h2>Exports</h2>
              <p>PDF export is available now. DOCX and TXT unlock only when premium entitlement is active.</p>
            </div>
            <div className="settings-section-panel settings-export-list">
              <div className="settings-export-item enabled">
                <span><RoleForgeIcon name="check" size={14} />PDF</span>
                <small>{entitlement.exportFormats.pdf ? "Included" : "Unavailable"}</small>
              </div>
              <div className={`settings-export-item ${entitlement.exportFormats.docx ? "enabled" : "disabled"}`}>
                <span><RoleForgeIcon name="lock" size={14} />DOCX</span>
                <small>{entitlement.exportFormats.docx ? "Premium entitlement active" : "Premium"}</small>
              </div>
              <div className={`settings-export-item ${entitlement.exportFormats.txt ? "enabled" : "disabled"}`}>
                <span><RoleForgeIcon name="lock" size={14} />TXT</span>
                <small>{entitlement.exportFormats.txt ? "Premium entitlement active" : "Premium"}</small>
              </div>
            </div>
          </section>

          <section className="settings-section" id="billing">
            <div className="settings-section-copy">
              <h2>Billing</h2>
              <p>Premium is priced for early users at ${PREMIUM_PRICE.monthly / 100}/month or ${PREMIUM_PRICE.yearly / 100}/year.</p>
            </div>
            <div className="settings-section-panel settings-billing-panel">
              <div className="settings-billing-head">
                <span className={`settings-status-pill ${premiumActive ? "good" : "muted"}`}>{billingLabel}</span>
                <form action="/api/billing/portal" method="post">
                  <button className="ghost-button" type="submit" disabled={!billingReady || entitlement.billingStatus === "none"}>
                    Manage billing
                  </button>
                </form>
              </div>
              <div className="settings-price-grid">
                <article className="settings-price-card">
                  <div>
                    <span className="settings-price-kicker">Monthly</span>
                    <strong>${PREMIUM_PRICE.monthly / 100}</strong>
                    <small>per month</small>
                  </div>
                  <form action="/api/billing/checkout" method="post">
                    <input type="hidden" name="interval" value="month" />
                    <button className="primary-button" type="submit" disabled={!billingReady || premiumActive}>
                      {premiumActive ? "Current plan" : "Start monthly"}
                    </button>
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
                    <button className="primary-button" type="submit" disabled={!billingReady || premiumActive}>
                      {premiumActive ? "Current plan" : "Start yearly"}
                    </button>
                  </form>
                </article>
              </div>
              <p className="settings-billing-note">
                {billingReady
                  ? "Checkout opens in Stripe. Premium access updates after Stripe confirms the subscription."
                  : "Checkout is disabled until the Stripe and Supabase service environment variables are configured."}
              </p>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
