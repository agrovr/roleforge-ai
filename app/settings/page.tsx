import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Brand } from "../components/Brand";
import { RoleForgeIcon } from "../components/RoleForgeIcons";
import { ThemeToggle } from "../components/ThemeToggle";
import { accountDisplayName } from "../lib/accountUser";
import { billingStateDetail, billingStateLabel, billingStatusTone } from "../lib/billing/display";
import { reconcileUserSubscriptionEntitlement, syncCheckoutSessionEntitlement } from "../lib/billing/entitlements";
import { billingReadiness } from "../lib/billing/readiness";
import { getStripeBillingConfig, PREMIUM_PRICE } from "../lib/billing/stripe";
import { loadAccountEntitlement } from "../lib/entitlements";
import { historyRunStatus } from "../lib/history";
import { RESUME_TEMPLATE_COOKIE, getResumeTemplate, isResumeTemplateSlug } from "../lib/resumeTemplates";
import { savedRunHistoryHref } from "../lib/savedRunLinks";
import { createRoleForgeServerClient } from "../lib/supabase/server";
import { loadSavedRuns } from "../lib/supabase/savedProjects";
import {
  loadAccountUsage,
  monthlyRunAllowanceLabel,
  monthlyRunAllowanceSentence,
  runWord,
  usageProgressPercent,
} from "../lib/usage";
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

function billingNotice(value: string | undefined, options?: { premiumActive?: boolean }) {
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

function formatSavedRunDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function savedRunCanRestore(run: { snapshot?: Record<string, unknown> }) {
  const result = run.snapshot?.result;
  if (!result || typeof result !== "object") return false;
  const tailoredText = (result as { tailored_text?: unknown }).tailored_text;
  return typeof tailoredText === "string" && Boolean(tailoredText.trim());
}

function savedRunTemplateName(run: { snapshot?: Record<string, unknown> }) {
  if (typeof run.snapshot?.templateName === "string" && run.snapshot.templateName.trim()) {
    return run.snapshot.templateName;
  }

  const templateSlug = run.snapshot?.templateSlug;
  if (typeof templateSlug === "string" && isResumeTemplateSlug(templateSlug)) {
    return getResumeTemplate(templateSlug).name;
  }

  return "";
}

async function countRows(
  supabase: NonNullable<Awaited<ReturnType<typeof createRoleForgeServerClient>>>,
  table: "resume_projects" | "tailor_runs",
  userId: string,
) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId) as CountResult;
  return error ? 0 : count ?? 0;
}

export default async function SettingsPage({ searchParams }: { searchParams: SettingsSearchParams }) {
  const params = await searchParams;
  const billingParam = getParam(params.billing);
  const checkoutSessionId = getParam(params.session_id);
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

  if (checkoutSessionId) {
    const syncedCheckout = await syncCheckoutSessionEntitlement(user.id, checkoutSessionId).catch(() => false);

    if (syncedCheckout) {
      redirect("/settings?billing=checkout-success#billing");
    }
  }

  const [projectCount, runCount, recentSavedRuns] = await Promise.all([
    countRows(supabase, "resume_projects", user.id),
    countRows(supabase, "tailor_runs", user.id),
    loadSavedRuns(supabase, user.id).catch(() => []),
    reconcileUserSubscriptionEntitlement(user.id).catch(() => false),
  ]);
  const entitlement = await loadAccountEntitlement(supabase, user.id);
  const usage = await loadAccountUsage(supabase, user.id, entitlement);
  const templateCookie = (await cookies()).get(RESUME_TEMPLATE_COOKIE)?.value;
  const selectedTemplate = getResumeTemplate(templateCookie);
  const billingConfig = getStripeBillingConfig();
  const premiumActive = entitlement.plan === "premium" && ["active", "trialing"].includes(entitlement.billingStatus);
  const notice = billingNotice(billingParam, { premiumActive });
  const planLabel = premiumActive ? "Premium" : "Free";
  const premiumEnding = premiumActive && entitlement.cancelAtPeriodEnd;
  const premiumEndLabel = formatPlanDate(entitlement.cancelAt || entitlement.currentPeriodEnd);
  const billingLabel = billingStateLabel(entitlement.billingStatus, { premiumEnding });
  const billingDetail = billingStateDetail(entitlement.billingStatus, { premiumEnding, premiumEndLabel });
  const billingTone = billingStatusTone(entitlement.billingStatus);
  const usageResetLabel = formatPlanDate(usage.currentPeriodEnd);
  const { checkoutReady, portalReady } = billingReadiness(billingConfig, {
    hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    billingStatus: entitlement.billingStatus,
  });
  const displayPlanLabel = premiumEnding ? "Premium ending" : `${planLabel} plan`;
  const displayName = accountDisplayName(user);
  const planFeatures = premiumActive
    ? ["Unlimited runs", "DOCX and TXT exports", premiumEnding && premiumEndLabel ? `Access until ${premiumEndLabel}` : "Saved projects"]
    : [monthlyRunAllowanceLabel(usage.monthlyRunLimit), "PDF export", "Saved projects"];
  const exportRows: ExportRow[] = [
    { label: "PDF", enabled: entitlement.exportFormats.pdf, included: "Included", locked: "Unavailable" },
    { label: "DOCX", enabled: entitlement.exportFormats.docx, included: "Included with Premium", locked: "Premium" },
    { label: "TXT", enabled: entitlement.exportFormats.txt, included: "Included with Premium", locked: "Premium" },
  ];
  const usedRunWord = runWord(usage.monthlyRuns);
  const remainingRunWord = runWord(usage.remainingRuns);
  const usageUsedLabel =
    usage.monthlyRunLimit === null
      ? `${usage.monthlyRuns} ${usedRunWord} used`
      : `${usage.monthlyRuns}/${usage.monthlyRunLimit} runs used`;
  const usageHelperLabel =
    usage.monthlyRunLimit === null
      ? "Premium unlimited"
      : `${usage.remainingRuns} ${remainingRunWord} remaining`;
  const usageMetaLabel =
    usage.monthlyRunLimit === null
      ? "No monthly cap"
      : `${usage.remainingRuns} ${remainingRunWord} left`;
  const usageTrackWidth = usageProgressPercent(usage);
  const projectCountLabel = projectCount === 1 ? "Project" : "Projects";
  const runCountLabel = runCount === 1 ? "Run" : "Runs";
  const recentProjectRuns = recentSavedRuns.slice(0, 3);

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
                  <span>{projectCountLabel}</span>
                </div>
                <div className="settings-metric">
                  <strong>{runCount}</strong>
                  <span>{runCountLabel}</span>
                </div>
              </div>
              {recentProjectRuns.length ? (
                <div className="settings-project-list" aria-label="Recent saved projects">
                  {recentProjectRuns.map((run) => {
                    const canRestore = savedRunCanRestore(run);
                    const status = historyRunStatus(run, entitlement);
                    const templateName = savedRunTemplateName(run);
                    return (
                      <Link
                        className="settings-project-item"
                        href={savedRunHistoryHref(run, { restore: canRestore })}
                        key={run.accountRunId ?? run.id}
                        aria-label={`Open ${run.projectTitle || run.roleHint} in History`}
                      >
                        <div>
                          <strong>{run.projectTitle || run.roleHint}</strong>
                          <span>
                            {run.filename} · {formatSavedRunDate(run.createdAt)} · {run.score}/100
                            {templateName ? ` · ${templateName}` : ""}
                          </span>
                        </div>
                        <small title={status.detail}>{canRestore ? "Restore" : status.label}</small>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="settings-project-empty">
                  <strong>No saved runs yet</strong>
                  <span>Completed exports will appear here and reopen from History.</span>
                </div>
              )}
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
                  <strong>{usageUsedLabel}</strong>
                  <small> - {usageHelperLabel}</small>
                </div>
                {usage.monthlyRunLimit === null ? (
                  <div className="settings-usage-track unlimited"><span style={{ width: "100%" }} /></div>
                ) : (
                  <div className="settings-usage-track">
                    <span style={{ width: `${usageTrackWidth}%` }} />
                  </div>
                )}
                <div className="settings-usage-meta">
                  <span>{usageMetaLabel}</span>
                  <span>{usageResetLabel ? `Resets ${usageResetLabel}` : "Resets monthly"}</span>
                </div>
              </div>
              <p className="settings-billing-note">
                {usage.monthlyRunLimit === null
                  ? premiumEnding && premiumEndLabel
                    ? `Premium access remains available until ${premiumEndLabel}.`
                    : "Premium does not count completed runs against a monthly cap."
                  : monthlyRunAllowanceSentence(usage.monthlyRunLimit)}
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
              <div className="settings-export-actions">
                <span>{selectedTemplate.name} is selected as your resume direction and is sent with new exports.</span>
                <Link className="btn btn-soft btn-sm settings-inline-link" href="/templates">Browse templates</Link>
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
                <span className={`settings-status-pill ${premiumEnding ? "ready" : billingTone}`}>
                  {billingLabel}
                </span>
                <form action="/api/billing/portal" method="post">
                  <button className="ghost-button" type="submit" disabled={!portalReady}>
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
                      <button className="primary-button" type="submit" disabled={!checkoutReady}>Start monthly</button>
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
                      <button className="primary-button" type="submit" disabled={!checkoutReady}>Start yearly</button>
                    </form>
                  </article>
                </div>
              )}
              <p className="settings-billing-note">
                {premiumActive
                  ? premiumEnding
                    ? "Use Manage billing if you want to reactivate or review invoices."
                    : "Use Manage billing for subscription changes and invoices."
                  : checkoutReady
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
