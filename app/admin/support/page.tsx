import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Brand } from "@/app/components/Brand";
import { RoleForgeIcon } from "@/app/components/RoleForgeIcons";
import {
  isSupportAdminUser,
  loadAdminSupportRequests,
  loadAdminSupportSummary,
  parseAdminSupportStatus,
  supportOperatorReadiness,
  type AdminSupportRequest,
} from "@/app/lib/supportAdmin";
import { createRoleForgeRouteClient } from "@/app/lib/supabase/routeClient";
import { createRoleForgeServiceClient } from "@/app/lib/supabase/service";

import { SupportSubmitButton } from "./SupportSubmitButton";

type AdminSupportPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function statusNotice(value: string | undefined) {
  switch (value) {
    case "reply-sent":
      return "Support reply sent.";
    case "reply-sent-status-stale":
      return "Support reply sent. The request status changed in another tab, so the newer status was preserved.";
    case "updated":
      return "Support request status updated.";
    case "stale":
      return "This request changed in another tab. Review the latest status before applying another action.";
    case "reply-unavailable":
      return "Support replies need a verified RoleForge sender before they can be sent.";
    case "invalid":
      return "That support request action could not be applied.";
    case "unavailable":
      return "The support inbox is temporarily unavailable.";
    case "denied":
      return "This account cannot manage support requests.";
    default:
      return "";
  }
}

function SupportStatusForm({ request, status, label, icon, returnStatus }: { request: AdminSupportRequest; status: "open" | "reviewing" | "closed"; label: string; icon: "check" | "mail" | "undo"; returnStatus: "open" | "reviewing" | "closed" | "all" }) {
  const disabled = request.status === status;
  return (
    <form action="/admin/support/actions" method="post">
      <input type="hidden" name="id" value={request.id} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="version" value={request.updatedAt} />
      <input type="hidden" name="returnStatus" value={returnStatus} />
      <SupportSubmitButton disabled={disabled} icon={icon} label={label} pendingLabel="Updating…" />
    </form>
  );
}

function readinessTone(ready: boolean) {
  return ready ? "ready" : "needs-setup";
}

export default async function AdminSupportPage({ searchParams }: AdminSupportPageProps) {
  const params = await searchParams;
  const routeClient = await createRoleForgeRouteClient();
  if (!routeClient) notFound();

  const {
    data: { user },
  } = await routeClient.supabase.auth.getUser();

  if (!user) redirect("/login?next=/admin/support&account=signin-required");
  if (!isSupportAdminUser(user)) notFound();

  const serviceClient = createRoleForgeServiceClient();
  const requestedStatus = getParam(params?.status);
  const status = requestedStatus === "all" ? "all" : parseAdminSupportStatus(requestedStatus) ?? "open";
  const notice = statusNotice(getParam(params?.support));
  let requests: AdminSupportRequest[] = [];
  let summary = { all: 0, open: 0, reviewing: 0, closed: 0 };
  let loadError = false;

  if (serviceClient) {
    try {
      [requests, summary] = await Promise.all([
        loadAdminSupportRequests(serviceClient, { status, limit: 40 }),
        loadAdminSupportSummary(serviceClient),
      ]);
    } catch (error) {
      loadError = true;
      console.error("Admin support inbox load failed", error);
    }
  }
  const readiness = supportOperatorReadiness();
  const operatorSteps = [
    {
      label: "Reply",
      detail: "Write and send a customer-safe reply from this inbox with the support reference included.",
    },
    {
      label: "Reviewing",
      detail: "Mark the request while you investigate, so the open queue stays clean.",
    },
    {
      label: "Close",
      detail: "Close the request after you answer it. Reopen it if the customer follows up.",
    },
  ];
  const readinessCards = [
    {
      label: "Admin access",
      value: readiness.adminAccessReady ? "Configured" : "Needs setup",
      detail: "ROLEFORGE_ADMIN_EMAILS controls who can open this inbox.",
      ready: readiness.adminAccessReady,
      required: true,
    },
    {
      label: "Inbox database",
      value: readiness.serviceRoleReady ? "Connected" : "Unavailable",
      detail: "SUPABASE_SERVICE_ROLE_KEY lets the inbox review and update all support requests.",
      ready: readiness.serviceRoleReady,
      required: true,
    },
    {
      label: "Customer replies",
      value: readiness.customerReplyReady ? "Configured" : "Needs sender",
      detail: "Replies send from the configured support sender so your private admin email stays hidden.",
      ready: readiness.customerReplyReady,
      required: true,
    },
    {
      label: "Email alerts",
      value: readiness.emailAlertsReady ? "Configured" : "Optional",
      detail: "Resend can email new requests to your support inbox.",
      ready: readiness.emailAlertsReady,
      required: false,
    },
    {
      label: "Webhook alerts",
      value: readiness.webhookReady ? "Configured" : "Optional",
      detail: "An HTTPS webhook can forward requests to Slack, Zapier, Make, or another operator channel.",
      ready: readiness.webhookReady,
      required: false,
    },
  ] as const;
  const requiredSetupCount = readinessCards.filter((item) => item.required && !item.ready).length;
  const filterCounts = {
    open: summary.open,
    reviewing: summary.reviewing,
    closed: summary.closed,
    all: summary.all,
  } as const;

  return (
    <main className="admin-support-shell">
      <header className="admin-support-commandbar" aria-label="Support operator navigation">
        <Brand href="/" label="RoleForge AI home" />
        <nav aria-label="Operator shortcuts">
          <Link href="/app"><RoleForgeIcon name="file" size={14} /> Studio</Link>
          <Link href="/support"><RoleForgeIcon name="mail" size={14} /> Support page</Link>
          <Link href="/settings"><RoleForgeIcon name="settings" size={14} /> Settings</Link>
        </nav>
      </header>

      <section className="admin-support-hero" aria-label="Support inbox overview">
        <div>
          <span className="eyebrow">Operator inbox</span>
          <h1>Support requests</h1>
          <p>Review customer requests, reply by email, and update the status from any browser.</p>
        </div>
        <div className="admin-support-stats" aria-label="Support inbox counts">
          <span><strong>{requests.length}</strong> shown</span>
          <span><strong>{summary.open}</strong> open</span>
          <span><strong>{summary.reviewing}</strong> reviewing</span>
        </div>
      </section>

      {notice ? <p className="admin-support-notice">{notice}</p> : null}
      {!serviceClient || loadError ? <p className="admin-support-notice">The operator inbox is temporarily unavailable. No request data was changed.</p> : null}

      <details className="admin-support-setup" open={!serviceClient || loadError || requiredSetupCount > 0}>
        <summary>
          <span><RoleForgeIcon name="settings" size={16} /> Operations setup</span>
          <small>{requiredSetupCount ? `${requiredSetupCount} required ${requiredSetupCount === 1 ? "item needs" : "items need"} attention` : "Required systems ready"}</small>
        </summary>
        <div className="admin-support-setup-body">
          <section className="admin-support-playbook" aria-label="Browser support workflow">
            <div>
              <span className="eyebrow">Queue workflow</span>
              <h2>Reply, investigate, close</h2>
              <p>Use this inbox as the source of truth. Status changes and customer-safe replies work from desktop or mobile.</p>
            </div>
            <ol>
              {operatorSteps.map((step) => (
                <li key={step.label}>
                  <strong>{step.label}</strong>
                  <span>{step.detail}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="admin-support-readiness" aria-label="Support operations setup">
            {readinessCards.map((item) => (
              <article className={`admin-support-readiness-card ${readinessTone(item.ready)} ${item.required ? "required" : "optional"}`} key={item.label}>
                <span aria-hidden="true"><RoleForgeIcon name={item.ready ? "check" : "settings"} size={15} /></span>
                <div>
                  <small>{item.label}</small>
                  <strong>{item.value}</strong>
                  <p>{item.detail}</p>
                </div>
              </article>
            ))}
          </section>
        </div>
      </details>

      <nav className="admin-support-filter" aria-label="Support request filters">
        {(["open", "reviewing", "closed", "all"] as const).map((item) => (
          <Link className={status === item ? "active" : ""} href={`/admin/support?status=${item}`} key={item} aria-current={status === item ? "page" : undefined}>
            <span>{item === "all" ? "All" : item[0].toUpperCase() + item.slice(1)}</span>
            <strong>{filterCounts[item]}</strong>
          </Link>
        ))}
      </nav>

      <section className="admin-support-list" aria-label="Support request list">
        {requests.length ? requests.map((request) => {
          return (
            <article className="admin-support-card" data-status={request.status} aria-labelledby={`support-request-${request.id}`} key={request.id}>
              <header>
                <div className="admin-support-card-heading">
                  <span className="admin-support-reference">{request.referenceLabel}</span>
                  <span className={`admin-support-status ${request.status}`}>{request.statusLabel}</span>
                </div>
                <div className="admin-support-card-copy">
                  <h2 id={`support-request-${request.id}`}>{request.subject}</h2>
                  <p>{request.categoryLabel} · {request.createdLabel}</p>
                </div>
              </header>
              <div className="admin-support-card-body">
                <div className="admin-support-case">
                  <span className="admin-support-panel-label">Customer request</span>
                  <p className="admin-support-message">{request.message}</p>
                  <dl className="admin-support-meta">
                    <div>
                      <dt>Customer</dt>
                      <dd>{request.email}</dd>
                    </div>
                    {request.contextUrl ? (
                      <div>
                        <dt>Context</dt>
                        <dd>{request.contextUrl}</dd>
                      </div>
                    ) : null}
                  </dl>
                  <div className="admin-support-next-step" aria-label="Recommended support workflow">
                    <RoleForgeIcon name={request.status === "closed" ? "check" : "sparkle"} size={15} />
                    <span>
                      {request.status === "closed"
                        ? "Resolved. Reopen only if the customer needs another pass."
                        : "Recommended: send a customer-safe reply, mark reviewing while you investigate, then close after the customer has an answer."}
                    </span>
                  </div>
                </div>

                <div className="admin-support-workbench">
                  <span className="admin-support-panel-label">Response workspace</span>
                  <form className="admin-support-reply-form" action="/admin/support/reply" method="post">
                    <input type="hidden" name="id" value={request.id} />
                    <input type="hidden" name="version" value={request.updatedAt} />
                    <input type="hidden" name="returnStatus" value={status} />
                    <label htmlFor={`reply-${request.id}`}>Customer-safe reply</label>
                    <textarea
                      id={`reply-${request.id}`}
                      name="message"
                      rows={5}
                      minLength={12}
                      maxLength={2000}
                      placeholder={`Hi,\n\nThanks for reaching out. I checked ${request.referenceLabel} and...`}
                      disabled={!readiness.customerReplyReady || request.email === "No email"}
                    />
                    <div className="admin-support-reply-footer">
                      <span>
                        {readiness.customerReplyReady
                          ? "Sent from the configured support sender, not your private Gmail."
                          : "Customer replies are paused until a verified support sender is configured. Your private Gmail stays hidden."}
                      </span>
                      <div>
                        <SupportSubmitButton
                          className="admin-support-action primary"
                          name="nextStatus"
                          value="reviewing"
                          disabled={!readiness.customerReplyReady || request.email === "No email"}
                          icon="mail"
                          label="Send reply"
                          pendingLabel="Sending…"
                        />
                        <SupportSubmitButton
                          name="nextStatus"
                          value="closed"
                          disabled={!readiness.customerReplyReady || request.email === "No email"}
                          icon="check"
                          label="Send and close"
                          pendingLabel="Sending and closing…"
                        />
                      </div>
                    </div>
                  </form>
                  <div className="admin-support-actions">
                    <span className="admin-support-actions-label">Queue status</span>
                    <SupportStatusForm request={request} status="reviewing" label="Reviewing" icon="mail" returnStatus={status} />
                    <SupportStatusForm request={request} status="closed" label="Close" icon="check" returnStatus={status} />
                    {request.status === "closed" ? <SupportStatusForm request={request} status="open" label="Reopen" icon="undo" returnStatus={status} /> : null}
                  </div>
                </div>
              </div>
            </article>
          );
        }) : loadError ? (
          <article className="admin-support-empty is-error">
            <RoleForgeIcon name="settings" size={18} />
            <strong>Could not load this queue</strong>
            <p>Refresh the page or check the support database connection. Existing requests remain unchanged.</p>
          </article>
        ) : (
          <article className="admin-support-empty">
            <RoleForgeIcon name="check" size={18} />
            <strong>No support requests in this view</strong>
            <p>New requests will appear here after customers send them from the Support page.</p>
          </article>
        )}
      </section>
    </main>
  );
}
