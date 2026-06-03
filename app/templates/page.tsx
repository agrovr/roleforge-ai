import Link from "next/link";
import { cookies } from "next/headers";

import { AccountAvatar } from "../components/AccountAvatar";
import { Brand } from "../components/Brand";
import { RoleForgeIcon } from "../components/RoleForgeIcons";
import { accountAvatarUrl, accountDisplayName } from "../lib/accountUser";
import { RESUME_TEMPLATE_COOKIE, getResumeTemplate, resumeTemplateStudioHref } from "../lib/resumeTemplates";
import { supportRequestHref } from "../lib/supportRequests";
import { ThemeToggle } from "../components/ThemeToggle";
import { createRoleForgeServerClient } from "../lib/supabase/server";
import { TemplateLibrary } from "./TemplateLibrary";

async function getTemplateLinks() {
  const supabase = await createRoleForgeServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const signedIn = Boolean(user);
  const templateCookie = (await cookies()).get(RESUME_TEMPLATE_COOKIE)?.value;
  const initialTemplateSlug = getResumeTemplate(templateCookie).slug;
  const displayName = accountDisplayName(user);
  const accountInitials = (displayName || user?.email || "RF").slice(0, 2).toUpperCase();
  const billingSupportHref = supportRequestHref({
    category: "billing",
    subject: "Billing or Premium access",
    contextUrl: "/templates",
  });

  return {
    accountImageUrl: accountAvatarUrl(user),
    accountInitials,
    accountName: displayName || user?.email || "RoleForge user",
    email: user?.email ?? "",
    signedIn,
    initialTemplateSlug,
    billingSupportHref,
    studioHref: signedIn ? "/app" : "/login?next=/app",
    settingsHref: signedIn ? "/settings#exports" : `/login?next=${encodeURIComponent("/settings#exports")}`,
  };
}

export default async function TemplatesPage() {
  const { accountImageUrl, accountInitials, accountName, email, signedIn, initialTemplateSlug, billingSupportHref, studioHref, settingsHref } = await getTemplateLinks();
  const selectedTemplate = getResumeTemplate(initialTemplateSlug);

  return (
    <main className="templates-page-shell">
      <header className="settings-page-topbar">
        <Brand href="/" label="RoleForge AI home" />
        <div className="settings-page-actions">
          <Link className="btn btn-soft btn-sm" href={studioHref}>Studio</Link>
          <ThemeToggle />
          {signedIn ? (
            <details className="settings-account-menu templates-account-menu" data-account-menu="true">
              <summary className="studio-account-button templates-topbar-avatar" aria-label="Open account menu">
                <AccountAvatar initials={accountInitials} imageUrl={accountImageUrl} />
              </summary>
              <div className="studio-account-popover settings-account-popover templates-account-popover" role="group" aria-label="Account menu">
                <div className="studio-account-popover-head">
                  <span>Account</span>
                </div>
                <div className="studio-account-identity">
                  <div className="studio-account-avatar" aria-hidden="true">
                    <AccountAvatar initials={accountInitials} imageUrl={accountImageUrl} />
                  </div>
                  <div>
                    <strong className="studio-account-email" title={email}>{accountName}</strong>
                    <span>{selectedTemplate.name} direction</span>
                  </div>
                </div>
                <div className="studio-account-insights" aria-label="Template account summary">
                  <Link href={resumeTemplateStudioHref(initialTemplateSlug)}>
                    <strong>{selectedTemplate.name}</strong>
                    <span>Selected direction</span>
                  </Link>
                  <Link href="/settings#exports">
                    <strong>Exports</strong>
                    <span>Format access</span>
                  </Link>
                  <Link href="/settings#billing">
                    <strong>Billing</strong>
                    <span>Plan controls</span>
                  </Link>
                </div>
                <div className="studio-account-shortcuts settings-account-shortcuts">
                  <Link href="/app"><RoleForgeIcon name="file" size={14} /> Studio</Link>
                  <Link href="/settings"><RoleForgeIcon name="settings" size={14} /> Settings</Link>
                  <Link href="/settings#billing"><RoleForgeIcon name="lock" size={14} /> Billing</Link>
                  <Link href="/settings#security"><RoleForgeIcon name="lock" size={14} /> Security</Link>
                  <Link href="/status"><RoleForgeIcon name="scan" size={14} /> Status</Link>
                  <Link href="/updates"><RoleForgeIcon name="sparkle" size={14} /> Updates</Link>
                  <Link href="/support"><RoleForgeIcon name="mail" size={14} /> Support</Link>
                  <Link href="/help"><RoleForgeIcon name="mail" size={14} /> Help</Link>
                </div>
                <div className="studio-account-utilities settings-account-utilities" aria-label="Account utilities">
                  <a href="/api/account/export">
                    <RoleForgeIcon name="download" size={14} /> Export account record
                  </a>
                  <Link href="/settings#preferences">
                    <RoleForgeIcon name="layers" size={14} /> Preferences
                  </Link>
                  <Link href="/settings#support">
                    <RoleForgeIcon name="mail" size={14} /> Support history
                  </Link>
                  <Link href="/help">
                    <RoleForgeIcon name="mail" size={14} /> Help center
                  </Link>
                  <Link href={billingSupportHref}>
                    <RoleForgeIcon name="mail" size={14} /> Billing support
                  </Link>
                  <Link href="/status">
                    <RoleForgeIcon name="scan" size={14} /> System status
                  </Link>
                  <Link href="/updates">
                    <RoleForgeIcon name="sparkle" size={14} /> Product updates
                  </Link>
                </div>
                <form className="studio-account-form" action="/auth/signout" method="post">
                  <input type="hidden" name="next" value="/login?account=signed-out" />
                  <button className="ghost-button studio-account-submit" type="submit">Sign out</button>
                </form>
              </div>
            </details>
          ) : null}
        </div>
      </header>

      <section className="templates-page-hero" aria-labelledby="templates-title">
        <div>
          <div className="eyebrow">Template library</div>
          <h1 id="templates-title">Resume formats for cleaner exports.</h1>
          <p>
            Choose the visual direction RoleForge should carry into new PDF and premium DOCX exports. You can change it before each run.
          </p>
        </div>
        <div className="templates-page-actions">
          <Link className="primary-button" href={studioHref}>
            Open studio <RoleForgeIcon name="arrow" size={14} />
          </Link>
          <Link className="ghost-button" href={settingsHref}>
            Export access
          </Link>
        </div>
      </section>

      <TemplateLibrary signedIn={signedIn} initialTemplateSlug={initialTemplateSlug} />
    </main>
  );
}
