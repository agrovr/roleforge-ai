import { SupportForm } from "./SupportForm";
import { HelpHubHeader } from "../components/HelpHubHeader";
import { SiteFooter } from "../components/SiteFooter";
import type { Metadata } from "next";
import Link from "next/link";

import { RoleForgeIcon } from "../components/RoleForgeIcons";
import { SupportReferenceCopyButton } from "../components/SupportReferenceCopyButton";
import { isSupportAdminUser } from "../lib/supportAdmin";
import {
  loadSupportRequests,
  parseSupportRequestPrefill,
  supportRequestHref,
  supportRequestReference,
} from "../lib/supportRequests";
import { createRoleForgeServerClient } from "../lib/supabase/server";

export const metadata: Metadata = {
  title: "Support",
  description: "Contact RoleForge AI support for account, billing, privacy, export, saved project, and resume workflow help.",
  alternates: {
    canonical: "/support",
  },
};

type SupportSearchParams = Promise<Record<string, string | string[] | undefined>>;

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function supportNotice(value: string | undefined, reference?: string) {
  switch (value) {
    case "sent": {
      const referenceLabel = reference ? supportRequestReference(reference) : "";
      return {
        tone: "success" as const,
        referenceLabel,
        text: referenceLabel
          ? `Support request saved as ${referenceLabel}. We will use your account email for follow-up.`
          : "Support request saved. We will use your account email for follow-up.",
      };
    }
    case "invalid":
      return { tone: "warn" as const, text: "Add a topic, a short subject, and a detailed message." };
    case "unavailable":
      return { tone: "warn" as const, text: "Support requests are taking a moment. Try again from this page." };
    default:
      return null;
  }
}

export default async function SupportPage({ searchParams }: { searchParams: SupportSearchParams }) {
  const params = await searchParams;
  const notice = supportNotice(getParam(params.support), getParam(params.ref));
  const prefill = parseSupportRequestPrefill({
    category: getParam(params.category),
    subject: getParam(params.subject),
    context: getParam(params.context),
    contextUrl: getParam(params.contextUrl),
  });
  const signInNext = encodeURIComponent(supportRequestHref(prefill.hasPrefill ? prefill : {}));
  const supabase = await createRoleForgeServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const signedIn = Boolean(user);
  const supportAdmin = isSupportAdminUser(user);
  const accountEmail = user?.email ?? "";
  const recentSupportRequests = supabase && user
    ? await loadSupportRequests(supabase, user.id, { limit: 5 }).catch(() => [])
    : [];
  const latestSupportRequest = recentSupportRequests[0] ?? null;
  const supportRequestPacket: Array<{
    label: string;
    value: string;
    detail: string;
    tone: "good" | "neutral" | "warn";
    icon: "mail" | "chart" | "link" | "lock";
  }> = [
    {
      label: signedIn ? "Account email" : "Account session",
      value: signedIn ? accountEmail || "Signed in account" : "Sign in required",
      detail: signedIn
        ? "Used for follow-up and account-safe context."
        : "Sign in so requests attach to plan and saved-project state.",
      tone: signedIn ? "good" : "warn",
      icon: "mail",
    },
    {
      label: "Request history",
      value: latestSupportRequest ? latestSupportRequest.referenceLabel : "No recent request",
      detail: latestSupportRequest
        ? `${latestSupportRequest.statusLabel} · ${latestSupportRequest.createdLabel}`
        : "New requests will appear here and in Settings.",
      tone: latestSupportRequest ? "good" : "neutral",
      icon: "chart",
    },
    {
      label: "Page context",
      value: prefill.hasPrefill ? "Included" : "Optional",
      detail: prefill.hasPrefill
        ? "Prefilled from the page that sent you here."
        : "Add a page path or request id when it helps trace the issue.",
      tone: prefill.hasPrefill ? "good" : "neutral",
      icon: "link",
    },
    {
      label: "Private data",
      value: "Keep out",
      detail: "Do not paste card numbers, passwords, or secret keys.",
      tone: "warn",
      icon: "lock",
    },
  ];

  return (
    <div className="help-hub-page">
      <HelpHubHeader active="support" signedIn={signedIn} />
      <main className="legal-shell support-shell" id="help-hub-main">

      <section className="legal-hero support-hero" aria-labelledby="support-title">
        <div>
          <div className="eyebrow">Support</div>
          <h1 id="support-title" className="display">Send a request with real context.</h1>
          <p>
            Each request gets an RF reference. You can find it again in Support or Settings.
          </p>
        </div>
        <div className="legal-hero-card support-hero-card" aria-label="Support summary">
          <RoleForgeIcon name="mail" size={18} />
          <span>Signed-in requests are saved to your account</span>
          <span>Include the page or request ID when reporting an issue</span>
          <span>Never paste full payment card details or private credentials</span>
        </div>
      </section>

      {supportAdmin ? (
        <section className="support-admin-entry" aria-label="Operator support inbox">
          <span aria-hidden="true"><RoleForgeIcon name="mail" size={15} /></span>
          <div>
            <strong>Operator inbox is available for this account.</strong>
            <p>Review customer requests and update status from the browser, including on mobile.</p>
          </div>
          <Link className="btn btn-soft btn-sm" href="/admin/support">Open support inbox</Link>
        </section>
      ) : null}

      <section className="support-layout" aria-label="Support request workspace">
        <section className="support-request-card" id="request" aria-label="Support request form">
          <div className="support-request-head">
            <span className="eyebrow">Request help</span>
            <strong>{signedIn ? "Send a support request" : "Sign in to send a support request"}</strong>
            <p>
              {signedIn
                ? `Replies use ${accountEmail || "your account email"}. Keep the message focused on the current issue.`
                : "Sign in first so the request can be tied to your account, plan state, and saved project history."}
            </p>
          </div>

          {notice ? (
            <div className={`support-notice ${notice.tone}`} role="status">
              <RoleForgeIcon name={notice.tone === "success" ? "check" : "settings"} size={15} />
              <div className="support-notice-content">
                <span>{notice.text}</span>
                {"referenceLabel" in notice && notice.referenceLabel ? (
                  <SupportReferenceCopyButton referenceLabel={notice.referenceLabel} />
                ) : null}
              </div>
            </div>
          ) : null}

          {prefill.hasPrefill ? (
            <div className="support-prefill-note" role="status">
              <RoleForgeIcon name="check" size={15} />
              <span>Support details were prefilled from the page where you asked for help.</span>
            </div>
          ) : null}

          {signedIn ? (
            <SupportForm prefill={prefill} />
          ) : (
            <div className="support-signin-card">
              <strong>Use your account session</strong>
              <p>Support requests are saved with the signed-in account so billing, export access, and saved project context can be checked safely.</p>
              <Link className="primary-button support-submit" href={`/login?next=${signInNext}&account=signin-required`}>
                Sign in for support <RoleForgeIcon name="arrow" size={14} />
              </Link>
            </div>
          )}

        </section>
        <aside className="support-context" aria-label="Request details">
          <section className="support-packet-card" aria-label="Support request packet">
            <div className="support-packet-head">
              <span className="eyebrow">Request packet</span>
              <strong>What gets attached</strong>
              <p>RoleForge saves only account-safe context with your request.</p>
            </div>
            <div className="support-packet-list">
              {supportRequestPacket.map((item) => (
                <article className={`support-packet-item ${item.tone}`} key={item.label}>
                  <span aria-hidden="true"><RoleForgeIcon name={item.icon} size={14} /></span>
                  <div>
                    <small>{item.label}</small>
                    <strong>{item.value}</strong>
                    <p>{item.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {signedIn ? (
            <section className="support-history" aria-label="Recent support requests">
              <div className="support-history-head">
                <span className="eyebrow">Recent requests</span>
                <Link className="btn btn-soft btn-sm" href="/settings#support">View in Settings</Link>
              </div>
              {recentSupportRequests.length ? (
                <div className="support-history-list">
                  {recentSupportRequests.map((request) => (
                    <article className="support-history-item" key={request.id}>
                      <div>
                        <span>{request.referenceLabel} · {request.categoryLabel} · {request.createdLabel}</span>
                        <strong>{request.subject}</strong>
                        <p>{request.messagePreview}</p>
                        {request.contextUrl ? <small>{request.contextUrl}</small> : null}
                      </div>
                      <div className="support-history-actions">
                        <SupportReferenceCopyButton referenceLabel={request.referenceLabel} />
                        <span className={`support-status-badge ${request.status}`}>{request.statusLabel}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="support-history-empty">
                  <strong>No support requests yet</strong>
                  <span>Requests submitted from this account will appear here with their current status.</span>
                </div>
              )}
            </section>
          ) : null}
        </aside>
      </section>

      <section className="legal-footer-card" aria-label="Support footer">
        <div>
          <span className="eyebrow">Need self-service?</span>
          <strong>Help and Status cover common issues.</strong>
        </div>
        <div className="legal-footer-actions">
          <Link className="btn btn-soft btn-sm" href="/help">Help center</Link>
          <Link className="btn btn-soft btn-sm" href="/status">System status</Link>
          <Link className="btn btn-soft btn-sm" href="/settings">Settings</Link>
        </div>
      </section>
      </main>
      <SiteFooter active="/support" variant="compact" />
    </div>
  );
}
