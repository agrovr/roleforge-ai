import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AccountAvatar } from "../components/AccountAvatar";
import { Brand } from "../components/Brand";
import { ResumePreview } from "../components/ResumePreview";
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
import { APPLICATION_STATUS_OPTIONS, isApplicationStatus } from "../lib/applicationStatus";
import { billingStateDetail, billingStateLabel, billingStatusTone } from "../lib/billing/display";
import { reconcileUserSubscriptionEntitlement, syncCheckoutSessionEntitlement } from "../lib/billing/entitlements";
import { billingNotice } from "../lib/billing/notices";
import { billingReadiness } from "../lib/billing/readiness";
import { getStripeBillingConfig, PREMIUM_PRICE } from "../lib/billing/stripe";
import { loadAccountEntitlement } from "../lib/entitlements";
import {
  RESUME_TEMPLATE_COOKIE,
  RESUME_TEMPLATES,
  getResumeTemplate,
  isResumeTemplateSlug,
  resumeTemplateStudioHref,
} from "../lib/resumeTemplates";
import { settingsProjectSummaries } from "../lib/settingsProjects";
import { getConfiguredSiteOrigin } from "../lib/siteUrl";
import { createRoleForgeServerClient } from "../lib/supabase/server";
import { deleteSavedProject, loadSavedRuns, renameSavedProject, updateSavedProjectStatus } from "../lib/supabase/savedProjects";
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
    case "template-saved":
      return { tone: "success" as const, text: "Resume direction saved." };
    case "template-invalid":
      return { tone: "warn" as const, text: "Choose a supported resume direction." };
    case "project-stage-saved":
      return { tone: "success" as const, text: "Saved project stage updated." };
    case "project-stage-invalid":
      return { tone: "warn" as const, text: "Choose an available project stage." };
    case "project-stage-unavailable":
      return { tone: "warn" as const, text: "Saved project stage could not be updated." };
    case "project-renamed":
      return { tone: "success" as const, text: "Saved project renamed." };
    case "project-rename-invalid":
      return { tone: "warn" as const, text: "Use a project name of 120 characters or fewer." };
    case "project-rename-unavailable":
      return { tone: "warn" as const, text: "Saved project name could not be updated." };
    case "project-deleted":
      return { tone: "success" as const, text: "Saved project removed." };
    case "project-delete-invalid":
      return { tone: "warn" as const, text: "Type DELETE to remove a saved project." };
    case "project-delete-unavailable":
      return { tone: "warn" as const, text: "Saved project could not be removed." };
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

async function updateTemplatePreferenceAction(formData: FormData) {
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

  const template = formData.get("template");
  if (typeof template !== "string" || !isResumeTemplateSlug(template)) {
    redirect("/settings?account=template-invalid#preferences");
  }

  const cookieStore = await cookies();
  cookieStore.set(RESUME_TEMPLATE_COOKIE, template, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });

  redirect("/settings?account=template-saved#preferences");
}

async function updateSettingsProjectStatusAction(formData: FormData) {
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

  const projectId = typeof formData.get("projectId") === "string" ? String(formData.get("projectId")).trim() : "";
  const status = formData.get("status");
  if (!projectId || projectId.length > 120 || !isApplicationStatus(status)) {
    redirect("/settings?account=project-stage-invalid#projects");
  }

  try {
    await updateSavedProjectStatus(supabase, projectId, status, user.id);
  } catch {
    redirect("/settings?account=project-stage-unavailable#projects");
  }

  redirect("/settings?account=project-stage-saved#projects");
}

async function renameSettingsProjectAction(formData: FormData) {
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

  const projectId = typeof formData.get("projectId") === "string" ? String(formData.get("projectId")).trim() : "";
  const title = typeof formData.get("title") === "string" ? String(formData.get("title")).replace(/\s+/g, " ").trim() : "";
  if (!projectId || projectId.length > 120 || !title || title.length > 120) {
    redirect("/settings?account=project-rename-invalid#projects");
  }

  try {
    await renameSavedProject(supabase, projectId, title, user.id);
  } catch {
    redirect("/settings?account=project-rename-unavailable#projects");
  }

  redirect("/settings?account=project-renamed#projects");
}

async function deleteSettingsProjectAction(formData: FormData) {
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

  const projectId = typeof formData.get("projectId") === "string" ? String(formData.get("projectId")).trim() : "";
  const confirmDelete = typeof formData.get("confirmDelete") === "string" ? String(formData.get("confirmDelete")).trim() : "";
  if (!projectId || projectId.length > 120 || confirmDelete !== "DELETE") {
    redirect("/settings?account=project-delete-invalid#projects");
  }

  try {
    await deleteSavedProject(supabase, projectId, user.id);
  } catch {
    redirect("/settings?account=project-delete-unavailable#projects");
  }

  redirect("/settings?account=project-deleted#projects");
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
                <a href="#preferences"><RoleForgeIcon name="layers" size={14} /> Preferences</a>
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

          <section className="settings-section" id="preferences">
            <div className="settings-section-copy">
              <h2>Preferences</h2>
              <p>Set the default resume direction RoleForge sends with new exports.</p>
            </div>
            <div className="settings-section-panel">
              <div className="settings-template-grid" aria-label="Default resume direction">
                {RESUME_TEMPLATES.map((template) => {
                  const selected = template.slug === selectedTemplate.slug;
                  return (
                    <article className={`settings-template-card${selected ? " selected" : ""}`} key={template.slug}>
                      <div className="settings-template-thumb" style={{ borderTopColor: template.color }}>
                        <ResumePreview
                          variant={template.variant}
                          name={template.previewName}
                          role={template.tag.replace(/ resumes| drafts| roles/i, "")}
                          highlight={selected}
                        />
                      </div>
                      <div className="settings-template-card-copy">
                        <div className="template-title-row">
                          <span className="template-name">{template.name}</span>
                          <span className="template-tag">{template.tag}</span>
                        </div>
                        <p>{template.detail}</p>
                        <form className="settings-template-form" action={updateTemplatePreferenceAction}>
                          <input type="hidden" name="template" value={template.slug} />
                          <button
                            className={`btn btn-soft btn-sm settings-template-button${selected ? " selected" : ""}`}
                            type="submit"
                            aria-pressed={selected}
                          >
                            {selected ? "Selected" : "Set default"}
                            <RoleForgeIcon name={selected ? "check" : "layers"} size={12} />
                          </button>
                        </form>
                      </div>
                    </article>
                  );
                })}
              </div>
              <div className="settings-export-actions">
                <span>{selectedTemplate.name} is selected for new exports and studio runs.</span>
                <Link className="btn btn-soft btn-sm settings-inline-link" href={resumeTemplateStudioHref(selectedTemplate.slug)}>Open in studio</Link>
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
                    <article
                      className="settings-project-item"
                      key={project.key}
                    >
                      <div>
                        <Link href={project.href} aria-label={`Open ${project.title} in History`}>
                          <strong>{project.title}</strong>
                        </Link>
                        <span>{project.detail}</span>
                      </div>
                      <small title={`${project.stageDetail} ${project.actionDetail}`}>
                        {project.stageLabel} · {project.actionLabel}
                      </small>
                      {project.projectId ? (
                        <form className="settings-project-stage-form" action={updateSettingsProjectStatusAction}>
                          <input type="hidden" name="projectId" value={project.projectId} />
                          <div className="settings-project-stage-controls" role="group" aria-label={`Set project stage for ${project.title}`}>
                            {APPLICATION_STATUS_OPTIONS.map((option) => {
                              const selected = project.stageStatus === option.status;
                              return (
                                <button
                                  className={selected ? "active" : ""}
                                  disabled={selected}
                                  key={`${project.projectId}-${option.status}`}
                                  name="status"
                                  type="submit"
                                  value={option.status}
                                  title={option.detail}
                                  aria-pressed={selected}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                        </form>
                      ) : null}
                      {project.projectId ? (
                        <form className="settings-project-rename" action={renameSettingsProjectAction}>
                          <input type="hidden" name="projectId" value={project.projectId} />
                          <label>
                            <span>Project name</span>
                            <div className="settings-project-rename-row">
                              <input
                                name="title"
                                defaultValue={project.title}
                                maxLength={120}
                                aria-label={`Rename ${project.title}`}
                                autoComplete="off"
                              />
                              <button type="submit">Save name</button>
                            </div>
                          </label>
                        </form>
                      ) : null}
                      {project.downloads.length ? (
                        <div className="settings-project-downloads" aria-label={`Downloads for ${project.title}`}>
                          {project.downloads.map((download) => (
                            <a
                              className="btn btn-soft btn-sm"
                              href={download.url}
                              key={`${project.key}-${download.format}`}
                            >
                              <RoleForgeIcon name="download" size={12} />
                              {download.label}
                            </a>
                          ))}
                        </div>
                      ) : null}
                      {project.projectId ? (
                        <details className="settings-project-delete">
                          <summary>Remove project</summary>
                          <form action={deleteSettingsProjectAction}>
                            <input type="hidden" name="projectId" value={project.projectId} />
                            <label>
                              <span>Type DELETE to remove this saved project and its runs.</span>
                              <div className="settings-project-delete-row">
                                <input
                                  name="confirmDelete"
                                  aria-label={`Type DELETE to remove ${project.title}`}
                                  autoComplete="off"
                                  placeholder="DELETE"
                                />
                                <button type="submit">Remove</button>
                              </div>
                            </label>
                          </form>
                        </details>
                      ) : null}
                    </article>
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
