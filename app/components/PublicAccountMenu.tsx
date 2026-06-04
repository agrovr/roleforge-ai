"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AccountAvatar } from "./AccountAvatar";
import { RoleForgeIcon } from "./RoleForgeIcons";

type PublicAccountStatus = {
  configured?: boolean;
  user?: {
    email?: string;
    name?: string;
    imageUrl?: string;
  } | null;
  entitlement?: {
    plan?: string;
    billingStatus?: string;
    monthlyRunLimit?: number | null;
    exportFormats?: {
      pdf?: boolean;
      docx?: boolean;
      txt?: boolean;
    };
  };
  usage?: {
    monthlyRuns?: number;
    remainingRuns?: number | null;
  } | null;
  accountSummary?: {
    savedProjectCount?: number | null;
    supportRequestCount?: number | null;
  } | null;
  billing?: {
    checkoutReady?: boolean;
    portalReady?: boolean;
  };
};

type PublicAccountMenuProps = {
  supportHref?: string;
};

function runAllowanceLabel(limit: number | null | undefined) {
  if (limit === null) return "Unlimited";
  if (typeof limit === "number") return `${limit} monthly`;
  return "Usage";
}

function countLabel(count: number | null | undefined, singular: string, plural: string) {
  if (typeof count !== "number") return "Account";
  return `${count} ${count === 1 ? singular : plural}`;
}

function currentPagePath() {
  const path = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return path.startsWith("/") ? path : "/app";
}

export function PublicAccountMenu({ supportHref = "/support" }: PublicAccountMenuProps) {
  const [status, setStatus] = useState<PublicAccountStatus | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;

    fetch("/api/auth/status", { credentials: "same-origin" })
      .then((response) => response.ok ? response.json() as Promise<PublicAccountStatus> : null)
      .then((payload) => {
        if (alive) setStatus(payload);
      })
      .catch(() => {
        if (alive) setStatus(null);
      });

    return () => {
      alive = false;
    };
  }, []);

  const user = status?.user ?? null;
  const loading = status === undefined;
  const signedIn = Boolean(user);
  const accountName = user?.name || user?.email || "RoleForge account";
  const accountEmail = user?.email || "Signed in";
  const accountInitials = useMemo(() => {
    const source = accountName || accountEmail || "RF";
    return source.slice(0, 2).toUpperCase();
  }, [accountEmail, accountName]);
  const premiumActive = status?.entitlement?.plan === "premium" && ["active", "trialing"].includes(status?.entitlement?.billingStatus ?? "");
  const planLabel = premiumActive ? "Premium" : "Free";
  const planCaption = premiumActive ? "Unlimited runs active" : "PDF export now";
  const exportFormats = status?.entitlement?.exportFormats;
  const exportLabel = exportFormats?.docx ? "PDF DOCX TXT" : "PDF";
  const exportCaption = exportFormats?.docx ? "Premium exports" : "DOCX and TXT need Premium";
  const usageLabel = runAllowanceLabel(status?.entitlement?.monthlyRunLimit);
  const usageCaption = typeof status?.usage?.monthlyRuns === "number"
    ? `${status.usage.monthlyRuns} used${typeof status.usage.remainingRuns === "number" ? `, ${status.usage.remainingRuns} left` : ""}`
    : "Refreshes in Settings";
  const savedProjectCount = status?.accountSummary?.savedProjectCount;
  const supportRequestCount = status?.accountSummary?.supportRequestCount;
  const savedProjectLabel = countLabel(savedProjectCount, "project", "projects");
  const savedProjectCaption = typeof savedProjectCount === "number" ? "Saved to account" : "Manage in Settings";
  const supportRequestLabel = countLabel(supportRequestCount, "request", "requests");
  const supportRequestCaption = typeof supportRequestCount === "number" ? "Support history" : "Track from Support";
  const billingActionLabel = premiumActive
    ? "Manage billing"
    : status?.billing?.checkoutReady
      ? "View Premium"
      : "Billing status";
  const billingActionHref = premiumActive || status?.billing?.checkoutReady ? "/settings#billing" : "/status";
  const projectActionLabel = typeof savedProjectCount === "number" && savedProjectCount > 0 ? "Restore project" : "Start project";
  const projectActionHref = typeof savedProjectCount === "number" && savedProjectCount > 0 ? "/settings#projects" : "/app";
  const supportActionLabel = typeof supportRequestCount === "number" && supportRequestCount > 0 ? "Support history" : "Contact support";
  const supportActionHref = typeof supportRequestCount === "number" && supportRequestCount > 0 ? "/settings#support" : supportHref;

  if (loading) {
    return (
      <span className="studio-account-button settings-topbar-avatar public-topbar-avatar public-account-loading" aria-busy="true" aria-label="Loading account menu">
        <span aria-hidden="true" />
        <span className="sr-only">Loading account menu</span>
      </span>
    );
  }

  if (!signedIn) {
    return (
      <Link
        className="btn btn-soft btn-sm public-account-signin"
        href="/login?next=/app&account=signin-required"
        onClick={(event) => {
          event.preventDefault();
          window.location.assign(`/login?next=${encodeURIComponent(currentPagePath())}&account=signin-required`);
        }}
      >
        Sign in
      </Link>
    );
  }

  return (
    <details className="settings-account-menu public-account-menu" data-account-menu="true">
      <summary className="studio-account-button settings-topbar-avatar public-topbar-avatar" aria-label="Open account menu">
        <AccountAvatar initials={accountInitials} imageUrl={user?.imageUrl} />
      </summary>
      <div className="studio-account-popover settings-account-popover public-account-popover" role="group" aria-label="Account menu">
        <div className="studio-account-popover-head">
          <span>Account</span>
        </div>
        <div className="studio-account-identity">
          <div className="studio-account-avatar" aria-hidden="true">
            <AccountAvatar initials={accountInitials} imageUrl={user?.imageUrl} />
          </div>
          <div>
            <strong className="studio-account-email" title={accountEmail}>{accountName}</strong>
            <span>{accountEmail}</span>
          </div>
        </div>
        <div className="studio-account-insights public-account-insights" aria-label="Public page account summary">
          <Link href="/settings#billing">
            <strong>{planLabel}</strong>
            <span>{planCaption}</span>
          </Link>
          <Link href="/settings#exports">
            <strong>{exportLabel}</strong>
            <span>{exportCaption}</span>
          </Link>
          <Link href="/settings#usage">
            <strong>{usageLabel}</strong>
            <span>{usageCaption}</span>
          </Link>
          <Link href="/settings#projects">
            <strong>{savedProjectLabel}</strong>
            <span>{savedProjectCaption}</span>
          </Link>
          <Link href="/settings#support">
            <strong>{supportRequestLabel}</strong>
            <span>{supportRequestCaption}</span>
          </Link>
        </div>
        <div className="studio-account-next-actions public-account-next-actions" aria-label="Recommended account actions">
          <Link href="/app"><RoleForgeIcon name="file" size={14} /> Resume work</Link>
          <Link href={billingActionHref}><RoleForgeIcon name="lock" size={14} /> {billingActionLabel}</Link>
          <Link href={projectActionHref}><RoleForgeIcon name="chart" size={14} /> {projectActionLabel}</Link>
          <Link href={supportActionHref}><RoleForgeIcon name="mail" size={14} /> {supportActionLabel}</Link>
        </div>
        <div className="studio-account-shortcuts settings-account-shortcuts public-account-shortcuts">
          <Link href="/app"><RoleForgeIcon name="file" size={14} /> Studio</Link>
          <Link href="/settings"><RoleForgeIcon name="settings" size={14} /> Settings</Link>
          <Link href="/settings#projects"><RoleForgeIcon name="chart" size={14} /> Saved projects</Link>
          <Link href="/settings#billing"><RoleForgeIcon name="lock" size={14} /> Billing</Link>
          <Link href="/templates"><RoleForgeIcon name="layers" size={14} /> Templates</Link>
          <Link href="/status"><RoleForgeIcon name="scan" size={14} /> Status</Link>
          <Link href="/updates"><RoleForgeIcon name="sparkle" size={14} /> Updates</Link>
          <Link href={supportHref}><RoleForgeIcon name="mail" size={14} /> Support</Link>
        </div>
        <div className="studio-account-utilities settings-account-utilities public-account-utilities" aria-label="Account utilities">
          <a href="/api/account/export">
            <RoleForgeIcon name="download" size={14} /> Export account record
          </a>
          <Link href="/settings#security">
            <RoleForgeIcon name="lock" size={14} /> Security
          </Link>
          <Link href="/settings#support">
            <RoleForgeIcon name="mail" size={14} /> Support history
          </Link>
          <Link href="/help">
            <RoleForgeIcon name="mail" size={14} /> Help center
          </Link>
          <Link href={supportHref}>
            <RoleForgeIcon name="mail" size={14} /> Contact support
          </Link>
        </div>
        <form className="studio-account-form" action="/auth/signout" method="post">
          <input type="hidden" name="next" value="/login?account=signed-out" />
          <button className="ghost-button studio-account-submit" type="submit">Sign out</button>
        </form>
      </div>
    </details>
  );
}
