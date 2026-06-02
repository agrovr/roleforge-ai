import type { Metadata } from "next";
import Link from "next/link";

import { Brand } from "../components/Brand";
import { PublicAccountMenu } from "../components/PublicAccountMenu";
import { RoleForgeIcon } from "../components/RoleForgeIcons";
import { ThemeToggle } from "../components/ThemeToggle";
import {
  SUPPORT_REQUEST_CATEGORIES,
  loadSupportRequests,
  parseSupportRequestPrefill,
  supportCategoryLabel,
  supportRequestHref,
} from "../lib/supportRequests";
import { createRoleForgeServerClient } from "../lib/supabase/server";

export const metadata: Metadata = {
  title: "Support",
  description: "Contact RoleForge AI support for account, billing, export, saved project, and resume workflow help.",
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
    title: "Saved project or account issue",
    detail: "Share the project name, account email, and whether the issue appears in Studio, Settings, or Templates.",
    icon: "settings" as const,
    href: supportRequestHref({
      category: "saved-projects",
      subject: "Saved project or account issue",
      contextUrl: "/settings#projects",
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

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function supportNotice(value: string | undefined) {
  switch (value) {
    case "sent":
      return { tone: "success" as const, text: "Support request saved. We will use your account email for follow-up." };
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
  const notice = supportNotice(getParam(params.support));
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
              <span>{notice.text}</span>
            </div>
          ) : null}

          {prefill.hasPrefill ? (
            <div className="support-prefill-note" role="status">
              <RoleForgeIcon name="check" size={15} />
              <span>Support details were prefilled from the page where you asked for help.</span>
            </div>
          ) : null}

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
                        <span>{request.categoryLabel} · {request.createdLabel}</span>
                        <strong>{request.subject}</strong>
                        <p>{request.messagePreview}</p>
                        {request.contextUrl ? <small>{request.contextUrl}</small> : null}
                      </div>
                      <span className={`support-status-badge ${request.status}`}>{request.statusLabel}</span>
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
