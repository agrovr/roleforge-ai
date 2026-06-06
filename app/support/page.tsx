import type { Metadata } from "next";
import Link from "next/link";

import { Brand } from "../components/Brand";
import { PublicAccountMenu } from "../components/PublicAccountMenu";
import { RoleForgeIcon } from "../components/RoleForgeIcons";
import { SupportReferenceCopyButton } from "../components/SupportReferenceCopyButton";
import { ThemeToggle } from "../components/ThemeToggle";
import {
  SUPPORT_REQUEST_CATEGORIES,
  loadSupportRequests,
  parseSupportRequestPrefill,
  supportCategoryLabel,
  supportRequestHref,
  supportRequestReference,
  supportStatusLabel,
  type SupportRequestCategory,
  type SupportRequestStatus,
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

const supportGuides = [
  {
    title: "Workflow or export problem",
    detail: "Include the file type, selected export format, and any request id shown in the Studio.",
    icon: "file" as const,
    href: supportRequestHref({
      category: "workflow",
      subject: "Workflow or export issue",
      contextUrl: "/support#request",
    }),
  },
  {
    title: "Billing or Premium issue",
    detail: "Mention whether checkout, billing management, or Premium access sync is the part that looks wrong.",
    icon: "lock" as const,
    href: supportRequestHref({
      category: "billing",
      subject: "Billing or Premium access",
      contextUrl: "/settings#billing",
    }),
  },
  {
    title: "Saved project issue",
    detail: "Share the project name and whether restore, rename, stage, delete, or exports look wrong.",
    icon: "settings" as const,
    href: supportRequestHref({
      category: "saved-projects",
      subject: "Saved project issue",
      contextUrl: "/settings#projects",
    }),
  },
  {
    title: "Privacy or data request",
    detail: "Use this for account exports, communication preferences, deletion questions, or privacy policy follow-up.",
    icon: "lock" as const,
    href: supportRequestHref({
      category: "privacy",
      subject: "Privacy or data request",
      contextUrl: "/settings#data-privacy",
    }),
  },
  {
    title: "Sign-in or profile access",
    detail: "Use this when login, email changes, security details, or account deletion controls need attention.",
    icon: "mail" as const,
    href: supportRequestHref({
      category: "account",
      subject: "Account access question",
      contextUrl: "/settings#account",
    }),
  },
] as const;

const supportTriageItems: Array<{
  category: SupportRequestCategory;
  detail: string;
  evidence: string;
  icon: "file" | "lock" | "settings" | "mail";
}> = [
  {
    category: "workflow",
    detail: "Upload, Tailor, generated assets, or export creation stopped before finishing.",
    evidence: "Include the request id when shown, file type, selected template, and the last workflow step you tried.",
    icon: "file",
  },
  {
    category: "exports",
    detail: "A ready PDF, DOCX, or TXT download is missing, expired, locked, or attached to the wrong run.",
    evidence: "Include export format, saved project name, and whether the issue happens from Studio, History, or Settings.",
    icon: "file",
  },
  {
    category: "billing",
    detail: "Checkout, billing management, cancellation, or Premium access does not match the account state.",
    evidence: "Include whether the issue is checkout, portal, subscription status, or Premium entitlement sync.",
    icon: "lock",
  },
  {
    category: "privacy",
    detail: "Account exports, communication preferences, deletion controls, or privacy policy details need review.",
    evidence: "Include the settings section, requested data action, and whether you already downloaded your account record.",
    icon: "lock",
  },
  {
    category: "account",
    detail: "Sign-in, email changes, profile details, security metadata, or account deletion controls need attention.",
    evidence: "Include sign-in method, account email, and the settings section where the issue appears.",
    icon: "mail",
  },
  {
    category: "saved-projects",
    detail: "Restore, rename, stage, delete, or saved document history behaves unexpectedly.",
    evidence: "Include project name, application stage, export format, and whether the run is local or account-saved.",
    icon: "settings",
  },
];

const supportLifecycle: Array<{
  status: SupportRequestStatus;
  detail: string;
}> = [
  {
    status: "open",
    detail: "Your request is saved with an RF reference and visible in Support and Settings history.",
  },
  {
    status: "reviewing",
    detail: "The request has enough account context to investigate the workflow, billing, or saved-project state.",
  },
  {
    status: "closed",
    detail: "The request is resolved or no longer needs action; the reference remains in account history.",
  },
];

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
    <main className="legal-shell support-shell">
      <header className="settings-page-topbar legal-topbar">
        <Brand href="/" label="RoleForge AI home" />
        <div className="settings-page-actions">
          <Link className="btn btn-soft btn-sm" href="/help">Help</Link>
          <Link className="btn btn-soft btn-sm" href="/status">Status</Link>
          <ThemeToggle />
          <PublicAccountMenu
            supportHref={supportRequestHref({
              category: "workflow",
              subject: "Support page question",
              contextUrl: "/support",
            })}
          />
        </div>
      </header>

      <section className="legal-hero support-hero" aria-labelledby="support-title">
        <div>
          <div className="eyebrow">Support</div>
          <h1 id="support-title" className="display">Get help with your workflow.</h1>
          <p>
            Send account-linked details for saved projects, billing, exports, or resume runs so the issue can be traced without exposing private files in public channels.
          </p>
        </div>
        <div className="legal-hero-card support-hero-card" aria-label="Support summary">
          <RoleForgeIcon name="mail" size={18} />
          <span>Signed-in requests are saved to your account</span>
          <span>Requests appear in Support and Settings history</span>
          <span>Include request IDs from Studio when available</span>
          <span>Never paste full payment card details or private credentials</span>
        </div>
      </section>

      <section className="support-layout" aria-label="Support request workspace">
        <div className="support-guides">
          {supportGuides.map((guide) => (
            <Link className="support-guide-card" href={guide.href} key={guide.title}>
              <span><RoleForgeIcon name={guide.icon} size={16} /></span>
              <strong>{guide.title}</strong>
              <p>{guide.detail}</p>
              <small>Prefill request</small>
            </Link>
          ))}

          <section className="support-triage-card" aria-label="Support triage guide">
            <div className="support-triage-head">
              <span className="eyebrow">Before sending</span>
              <strong>Send the details that make the issue traceable.</strong>
            </div>
            <div className="support-triage-list">
              {supportTriageItems.map((item) => (
                <article className="support-triage-item" key={item.category}>
                  <span aria-hidden="true"><RoleForgeIcon name={item.icon} size={14} /></span>
                  <div>
                    <strong>{supportCategoryLabel(item.category)}</strong>
                    <p>{item.detail}</p>
                    <small>{item.evidence}</small>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

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

          <section className="support-response-card" aria-label="Support request lifecycle">
            <div className="support-response-head">
              <span className="eyebrow">After submit</span>
              <strong>Track the request from your account.</strong>
              <p>Support requests are stored with account-safe context and an RF reference. Status changes appear here and in Settings.</p>
            </div>
            <div className="support-response-list">
              {supportLifecycle.map((item) => (
                <article className="support-response-item" key={item.status}>
                  <span className={`support-status-badge ${item.status}`}>{supportStatusLabel(item.status)}</span>
                  <small>{item.detail}</small>
                </article>
              ))}
            </div>
          </section>

          {signedIn ? (
            <form className="support-form" action="/api/support-requests" method="post">
              <label>
                <span>Topic</span>
                <select name="category" required defaultValue={prefill.category}>
                  {SUPPORT_REQUEST_CATEGORIES.map((category) => (
                    <option key={category} value={category}>{supportCategoryLabel(category)}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Subject</span>
                <input
                  name="subject"
                  maxLength={120}
                  minLength={4}
                  required
                  defaultValue={prefill.subject}
                  placeholder="Export download is not updating"
                />
              </label>
              <label>
                <span>Related page or request id</span>
                <input
                  name="contextUrl"
                  maxLength={300}
                  defaultValue={prefill.contextUrl ?? ""}
                  placeholder="/settings#billing or req_..."
                />
              </label>
              <label>
                <span>Message</span>
                <textarea
                  name="message"
                  minLength={20}
                  maxLength={2000}
                  required
                  rows={7}
                  placeholder="What happened, what you expected, and the last step you tried."
                />
              </label>
              <button className="primary-button support-submit" type="submit">
                Send request <RoleForgeIcon name="mail" size={14} />
              </button>
            </form>
          ) : (
            <div className="support-signin-card">
              <strong>Use your account session</strong>
              <p>Support requests are saved with the signed-in account so billing, export access, and saved project context can be checked safely.</p>
              <Link className="primary-button support-submit" href={`/login?next=${signInNext}&account=signin-required`}>
                Sign in for support <RoleForgeIcon name="arrow" size={14} />
              </Link>
            </div>
          )}

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
        </section>
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
  );
}
