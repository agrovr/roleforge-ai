import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AccountAvatar } from "../components/AccountAvatar";
import { Brand } from "../components/Brand";
import { RoleForgeIcon } from "../components/RoleForgeIcons";
import { ThemeToggle } from "../components/ThemeToggle";
import { validateAccountEmail } from "../lib/accountEmail";
import { loadAccountProfile, saveAccountProfile } from "../lib/accountProfile";
import {
  accountAvatarUrl,
  accountDisplayName,
  accountEmailVerificationLabel,
  accountSecurityDateLabel,
  accountSignInMethodLabel,
} from "../lib/accountUser";
import { billingStateDetail, billingStateLabel, billingStatusTone } from "../lib/billing/display";
import { reconcileUserSubscriptionEntitlement, syncCheckoutSessionEntitlement } from "../lib/billing/entitlements";
import { billingNotice } from "../lib/billing/notices";
import { billingReadiness } from "../lib/billing/readiness";
import { getStripeBillingConfig, PREMIUM_PRICE } from "../lib/billing/stripe";
import { loadAccountEntitlement } from "../lib/entitlements";
import { RESUME_TEMPLATE_COOKIE, getResumeTemplate } from "../lib/resumeTemplates";
import { settingsProjectSummaries } from "../lib/settingsProjects";
import { getConfiguredSiteOrigin } from "../lib/siteUrl";
import { createRoleForgeServerClient } from "../lib/supabase/server";
import { loadSavedRuns } from "../lib/supabase/savedProjects";
import {
  loadAccountUsage,
  monthlyRunAllowanceLabel,
  monthlyRunAllowanceSentence,
  runWord,
  usageProgressPercent,
} from "../lib/usage";
import { BillingSubmitButton } from "./BillingSubmitButton";
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

function formatPlanDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function accountNotice(value: string | undefined) {
  switch (value) {
    case "profile-saved":
      return { tone: "success" as const, text: "Display name saved." };
    case "profile-invalid":
      return { tone: "warn" as const, text: "Use a display name of 80 characters or fewer." };
    case "profile-unavailable":
      return { tone: "warn" as const, text: "Profile changes are temporarily unavailable." };
    case "email-change-sent":
      return { tone: "success" as const, text: "Check your inbox to finish the email change if confirmation is required." };
    case "email-invalid":
      return { tone: "warn" as const, text: "Enter a different valid email address." };
    case "email-unavailable":
      return { tone: "warn" as const, text: "Email changes are temporarily unavailable." };
    case "delete-invalid":
      return { tone: "warn" as const, text: "Type DELETE to confirm account deletion." };
    case "delete-billing-active":
      return { tone: "warn" as const, text: "Cancel Premium from Manage billing before deleting this account." };
    case "delete-unavailable":
      return { tone: "warn" as const, text: "Account deletion is temporarily unavailable." };
    default:
      return null;
  }
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

async function updateAccountProfileAction(formData: FormData) {
  "use server";

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

  try {
    await saveAccountProfile(supabase, user, {
      displayName: formData.get("displayName"),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    redirect(`/settings?account=${message.includes("80 characters") ? "profile-invalid" : "profile-unavailable"}#account`);
  }

  redirect("/settings?account=profile-saved#account");
}

async function updateAccountEmailAction(formData: FormData) {
  "use server";

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

  const parsedEmail = validateAccountEmail(formData.get("email"), user.email);
  if (!parsedEmail.ok) {
    redirect("/settings?account=email-invalid#account-email");
  }

  const emailRedirectTo = `${getConfiguredSiteOrigin()}/auth/callback?next=${encodeURIComponent("/settings?account=email-change-sent#account")}`;
  const { error } = await supabase.auth.updateUser(
    { email: parsedEmail.email },
    { emailRedirectTo },
  );

  if (error) {
    redirect("/settings?account=email-unavailable#account-email");
  }

  redirect("/settings?account=email-change-sent#account-email");
}

export default async function SettingsPage({ searchParams }: { searchParams: SettingsSearchParams }) {
  const params = await searchParams;
  const accountParam = getParam(params.account);
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

    redirect(`/settings?billing=${syncedCheckout ? "checkout-success" : "checkout-syncing"}#billing`);
  }

  const [projectCount, runCount, recentSavedRuns, accountProfile] = await Promise.all([
    countRows(supabase, "resume_projects", user.id),
    countRows(supabase, "tailor_runs", user.id),
    loadSavedRuns(supabase, user.id).catch(() => []),
    loadAccountProfile(supabase, user.id).catch(() => null),
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
  const showCheckoutHeaderAction = !premiumActive && checkoutReady;
  const portalActionTitle = portalReady
    ? "Open Stripe billing management"
    : showCheckoutHeaderAction
      ? "Open secure Stripe checkout"
      : premiumActive
        ? "Billing management is unavailable right now."
        : "Premium billing is not accepting payments right now.";
  const inactiveBillingActionLabel = premiumActive ? "Billing unavailable right now" : "Premium billing unavailable";
  const displayPlanLabel = premiumEnding ? "Premium ending" : `${planLabel} plan`;
  const displayName = accountDisplayName(user, accountProfile?.displayName);
  const accountInitials = (displayName || user.email || "RF").slice(0, 2).toUpperCase();
  const accountImageUrl = accountAvatarUrl(user);
  const signInMethodLabel = accountSignInMethodLabel(user);
  const emailVerificationLabel = accountEmailVerificationLabel(user);
  const lastSignInLabel = accountSecurityDateLabel(user.last_sign_in_at);
  const accountCreatedLabel = accountSecurityDateLabel(user.created_at);
  const profileNotice = accountNotice(accountParam);
  const planFeatures = premiumActive
    ? ["Unlimited runs", "DOCX and TXT exports", premiumEnding && premiumEndLabel ? `Access until ${premiumEndLabel}` : "PDF export included"]
    : [monthlyRunAllowanceLabel(usage.monthlyRunLimit), "PDF export", "Saved project sync"];
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
  const recentProjectSummaries = settingsProjectSummaries(recentSavedRuns, entitlement);
  const settingsAccountPlanCaption = premiumEnding && premiumEndLabel
    ? `Access until ${premiumEndLabel}`
    : premiumActive
      ? "Unlimited workspace"
      : "PDF export included";
  const settingsAccountUsageValue = usage.monthlyRunLimit === null ? "Unlimited" : `${usage.remainingRuns}`;
  const settingsAccountUsageCaption = usage.monthlyRunLimit === null
    ? `${usage.monthlyRuns} ${usedRunWord} this month`
    : `${usage.remainingRuns} ${remainingRunWord} left this month`;
  const settingsAccountExportValue = entitlement.exportFormats.docx ? "PDF DOCX TXT" : "PDF";
  const settingsAccountExportCaption = entitlement.exportFormats.docx ? "Premium exports active" : "DOCX and TXT need Premium";

  return (
    <main className="settings-page-shell">
      <header className="settings-page-topbar">
        <Brand href="/" label="RoleForge AI home" />
        <div className="settings-page-actions">
          <Link className="btn btn-soft btn-sm" href="/app">Studio</Link>
          <ThemeToggle />
          <details className="settings-account-menu">
            <summary className="studio-account-button settings-topbar-avatar" aria-label="Open account menu">
              <AccountAvatar initials={accountInitials} imageUrl={accountImageUrl} />
            </summary>
            <div className="studio-account-popover settings-account-popover" role="group" aria-label="Account menu">
              <div className="studio-account-popover-head">
                <span>Account</span>
              </div>
              <div className="studio-account-identity">
                <div className="studio-account-avatar" aria-hidden="true">
                  <AccountAvatar initials={accountInitials} imageUrl={accountImageUrl} />
                </div>
                <div>
                  <strong className="studio-account-email" title={user.email || "Signed in"}>{user.email || "Signed in"}</strong>
                  <span>{displayPlanLabel}</span>
                </div>
              </div>
              <div className="studio-account-insights" aria-label="Account status summary">
                <a href="#billing">
                  <strong>{premiumEnding ? "Ending" : planLabel}</strong>
                  <span>{settingsAccountPlanCaption}</span>
                </a>
                <a href="#usage">
                  <strong>{settingsAccountUsageValue}</strong>
                  <span>{settingsAccountUsageCaption}</span>
                </a>
                <a href="#exports">
                  <strong>{settingsAccountExportValue}</strong>
                  <span>{settingsAccountExportCaption}</span>
                </a>
              </div>
              <div className="studio-account-shortcuts settings-account-shortcuts">
                <Link href="/app"><RoleForgeIcon name="file" size={14} /> Studio</Link>
                <a href="#security"><RoleForgeIcon name="lock" size={14} /> Security</a>
                <Link href="/app#history"><RoleForgeIcon name="chart" size={14} /> Saved projects</Link>
                <Link href="/templates"><RoleForgeIcon name="layers" size={14} /> Templates</Link>
                <a href="#billing"><RoleForgeIcon name="lock" size={14} /> Billing</a>
              </div>
              <div className="studio-account-list">
                <a className="studio-account-summary" href="#projects">
                  <span><RoleForgeIcon name="chart" size={14} /> Saved projects</span>
                  <small>{projectCount} {projectCountLabel.toLowerCase()} and {runCount} {runCountLabel.toLowerCase()} saved to this account.</small>
                </a>
                <a className="studio-account-summary" href="#usage">
                  <span><RoleForgeIcon name="sparkle" size={14} /> Usage</span>
                  <small>{usageUsedLabel}; {usageHelperLabel.toLowerCase()}.</small>
                </a>
                <a className="studio-account-summary" href="#security">
                  <span><RoleForgeIcon name="lock" size={14} /> Security</span>
                  <small>{signInMethodLabel}; last sign-in {lastSignInLabel.toLowerCase()}.</small>
                </a>
                <a className="studio-account-summary" href="#billing">
                  <span><RoleForgeIcon name="settings" size={14} /> Billing</span>
                  <small>{billingDetail}</small>
                </a>
              </div>
              <form className="studio-account-form" action="/auth/signout" method="post">
                <input type="hidden" name="next" value="/login?account=signed-out" />
                <button className="ghost-button studio-account-submit" type="submit">Sign out</button>
              </form>
            </div>
          </details>
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

          {profileNotice ? (
            <div className={`settings-billing-alert ${profileNotice.tone}`} role="status">
              <RoleForgeIcon name={profileNotice.tone === "success" ? "check" : "settings"} size={16} />
              <span>{profileNotice.text}</span>
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
                  <AccountAvatar initials={accountInitials} imageUrl={accountImageUrl} />
                </div>
                <div>
                  <strong>{displayName || "RoleForge user"}</strong>
                  <span>{user.email}</span>
                </div>
              </div>
              <form className="settings-profile-form" action={updateAccountProfileAction}>
                <label htmlFor="settings-display-name">Display name</label>
                <div className="settings-profile-edit-row">
                  <input
                    id="settings-display-name"
                    name="displayName"
                    type="text"
                    autoComplete="name"
                    maxLength={80}
                    defaultValue={displayName}
                    placeholder="Add a display name"
                  />
                  <button className="primary-button" type="submit">
                    Save name
                  </button>
                </div>
                <small>Shown in your account menu and saved-project profile.</small>
              </form>
              <form className="settings-profile-form" id="account-email" action={updateAccountEmailAction}>
                <label htmlFor="settings-account-email">Email address</label>
                <div className="settings-profile-edit-row">
                  <input
                    id="settings-account-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    defaultValue={user.email ?? ""}
                    placeholder="you@example.com"
                    required
                  />
                  <button className="primary-button" type="submit">
                    Update email
                  </button>
                </div>
                <small>Supabase may send confirmation links to your current and new email before the change applies.</small>
              </form>
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
              <div className="settings-profile-actions">
                <Link className="primary-button" href="/app">
                  <RoleForgeIcon name="file" size={14} /> Open studio
                </Link>
                <a className="ghost-button" href="/api/account/export">
                  <RoleForgeIcon name="download" size={14} /> Download summary
                </a>
                <form action="/auth/signout" method="post">
                  <input type="hidden" name="next" value="/login?account=signed-out" />
                  <button className="ghost-button" type="submit">Sign out</button>
                </form>
              </div>
              <div className="settings-danger-zone" id="account-danger">
                <div>
                  <strong>Delete account</strong>
                  <span>
                    Permanently removes your RoleForge account and saved projects. Download your summary first. Premium accounts must cancel billing before deletion.
                  </span>
                </div>
                <form action="/api/account/delete" method="post">
                  <label htmlFor="settings-delete-confirmation">Type DELETE</label>
                  <div className="settings-danger-actions">
                    <input
                      id="settings-delete-confirmation"
                      name="confirmation"
                      type="text"
                      autoComplete="off"
                      inputMode="text"
                      spellCheck={false}
                      required
                    />
                    <button className="ghost-button settings-danger-button" type="submit">
                      Delete account
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </section>

          <section className="settings-section" id="security">
            <div className="settings-section-copy">
              <h2>Security</h2>
              <p>Review how this account signs in and when it was last used.</p>
            </div>
            <div className="settings-section-panel">
              <div className="settings-metric-row">
                <div className="settings-metric">
                  <strong>{signInMethodLabel}</strong>
                  <span>Sign-in method</span>
                </div>
                <div className="settings-metric">
                  <strong>{emailVerificationLabel}</strong>
                  <span>Email status</span>
                </div>
                <div className="settings-metric">
                  <strong>{lastSignInLabel}</strong>
                  <span>Last sign-in</span>
                </div>
                <div className="settings-metric">
                  <strong>{accountCreatedLabel}</strong>
                  <span>Account created</span>
                </div>
              </div>
              <p className="settings-billing-note">
                RoleForge uses Supabase Auth for secure email and provider sign-in. Password, passkey, or 2FA controls appear here only after those account methods are enabled.
              </p>
              <div className="settings-profile-actions">
                <a className="ghost-button" href="#account-email">
                  <RoleForgeIcon name="settings" size={14} /> Update email
                </a>
                <form action="/auth/signout" method="post">
                  <input type="hidden" name="next" value="/login?account=signed-out" />
                  <button className="ghost-button" type="submit">Sign out</button>
                </form>
              </div>
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
              {recentProjectSummaries.length ? (
                <div className="settings-project-list" aria-label="Recent saved projects">
                  {recentProjectSummaries.map((project) => (
                    <Link
                      className="settings-project-item"
                      href={project.href}
                      key={project.key}
                      aria-label={`Open ${project.title} in History`}
                    >
                      <div>
                        <strong>{project.title}</strong>
                        <span>{project.detail}</span>
                      </div>
                      <small title={`${project.stageDetail} ${project.actionDetail}`}>
                        {project.stageLabel} · {project.actionLabel}
                      </small>
                    </Link>
                  ))}
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
                {portalReady ? (
                  <form action="/api/billing/portal" method="post">
                    <BillingSubmitButton
                      className="ghost-button"
                      pendingLabel="Opening billing..."
                      ready
                      readyLabel="Manage billing"
                      title={portalActionTitle}
                    />
                  </form>
                ) : showCheckoutHeaderAction ? (
                  <form action="/api/billing/checkout" method="post">
                    <input type="hidden" name="interval" value="month" />
                    <BillingSubmitButton
                      className="ghost-button"
                      pendingLabel="Opening checkout..."
                      ready
                      readyLabel="Start Premium"
                      title={portalActionTitle}
                    />
                  </form>
                ) : (
                  <span className="ghost-button settings-disabled-action" aria-disabled="true" title={portalActionTitle}>
                    {inactiveBillingActionLabel}
                  </span>
                )}
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
                      <BillingSubmitButton
                        className="primary-button"
                        pendingLabel="Opening checkout..."
                        ready={checkoutReady}
                        readyLabel="Start monthly"
                      />
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
                      <BillingSubmitButton
                        className="primary-button"
                        pendingLabel="Opening checkout..."
                        ready={checkoutReady}
                        readyLabel="Start yearly"
                      />
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
                  : "Premium billing is paused while payments are prepared. The free signed-in studio remains available."}
              </p>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
