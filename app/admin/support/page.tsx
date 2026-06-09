import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Brand } from "@/app/components/Brand";
import { RoleForgeIcon } from "@/app/components/RoleForgeIcons";
import {
  isSupportAdminUser,
  loadAdminSupportRequests,
  parseAdminSupportStatus,
  supportOperatorReadiness,
  type AdminSupportRequest,
} from "@/app/lib/supportAdmin";
import { createRoleForgeRouteClient } from "@/app/lib/supabase/routeClient";
import { createRoleForgeServiceClient } from "@/app/lib/supabase/service";

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
    case "updated":
      return "Support request status updated.";
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

function SupportStatusForm({ request, status, label, icon }: { request: AdminSupportRequest; status: "open" | "reviewing" | "closed"; label: string; icon: "check" | "mail" | "undo" }) {
  const disabled = request.status === status;
  return (
    <form action="/admin/support/actions" method="post">
      <input type="hidden" name="id" value={request.id} />
      <input type="hidden" name="status" value={status} />
      <button className="admin-support-action" type="submit" disabled={disabled}>
        <RoleForgeIcon name={icon} size={14} />
        {label}
      </button>
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
  const requests = serviceClient ? await loadAdminSupportRequests(serviceClient, { status, limit: 40 }) : [];
  const openCount = requests.filter((request) => request.status === "open").length;
  const reviewingCount = requests.filter((request) => request.status === "reviewing").length;
  const readiness = supportOperatorReadiness();
  const operatorSteps = [
    {
      label: "Reply",
      detail: "Open a drafted email to the customer with the support reference included.",
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
    },
    {
      label: "Inbox database",
      value: readiness.serviceRoleReady ? "Connected" : "Unavailable",
      detail: "SUPABASE_SERVICE_ROLE_KEY lets the inbox review and update all support requests.",
      ready: readiness.serviceRoleReady,
    },
    {
      label: "Email alerts",
      value: readiness.emailAlertsReady ? "Configured" : "Optional",
      detail: "Resend can email new requests to your support inbox.",
      ready: readiness.emailAlertsReady,
    },
    {
      label: "Customer replies",
      value: readiness.customerReplyReady ? "Configured" : "Needs sender",
      detail: "Replies send from the configured support sender so your private admin email stays hidden.",
      ready: readiness.customerReplyReady,
    },
    {
      label: "Webhook alerts",
      value: readiness.webhookReady ? "Configured" : "Optional",
      detail: "An HTTPS webhook can forward requests to Slack, Zapier, Make, or another operator channel.",
      ready: readiness.webhookReady,
    },
  ] as const;

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
          <span><strong>{openCount}</strong> open</span>
          <span><strong>{reviewingCount}</strong> reviewing</span>
        </div>
      </section>

      {notice ? <p className="admin-support-notice">{notice}</p> : null}
      {!serviceClient ? <p className="admin-support-notice">The operator inbox is unavailable right now.</p> : null}

      <section className="admin-support-playbook" aria-label="Browser support workflow">
        <div>
          <span className="eyebrow">No terminal needed</span>
          <h2>Handle requests from this page</h2>
          <p>Use the web inbox as the source of truth. New tickets arrive here, email alerts can bring you back here, and status buttons keep the queue current from desktop or mobile.</p>
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
          <article className={`admin-support-readiness-card ${readinessTone(item.ready)}`} key={item.label}>
            <span aria-hidden="true"><RoleForgeIcon name={item.ready ? "check" : "settings"} size={15} /></span>
            <div>
              <small>{item.label}</small>
              <strong>{item.value}</strong>
              <p>{item.detail}</p>
            </div>
          </article>
        ))}
      </section>

      <nav className="admin-support-filter" aria-label="Support request filters">
        {(["open", "reviewing", "closed", "all"] as const).map((item) => (
          <Link className={status === item ? "active" : ""} href={`/admin/support?status=${item}`} key={item}>
            {item === "all" ? "All" : item[0].toUpperCase() + item.slice(1)}
          </Link>
        ))}
      </nav>

      <section className="admin-support-list" aria-label="Support request list">
        {requests.length ? requests.map((request) => {
          return (
            <article className="admin-support-card" key={request.id}>
              <header>
                <div>
                  <span className="admin-support-reference">{request.referenceLabel}</span>
                  <h2>{request.subject}</h2>
                  <p>{request.categoryLabel} · {request.createdLabel} · {request.statusLabel}</p>
                </div>
                <span className={`admin-support-status ${request.status}`}>{request.statusLabel}</span>
              </header>
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
              <form className="admin-support-reply-form" action="/admin/support/reply" method="post">
                <input type="hidden" name="id" value={request.id} />
                <label htmlFor={`reply-${request.id}`}>Customer-safe reply</label>
                <textarea
                  id={`reply-${request.id}`}
                  name="message"
                  rows={4}
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
                    <button
                      className="admin-support-action primary"
                      type="submit"
                      name="nextStatus"
                      value="reviewing"
                      disabled={!readiness.customerReplyReady || request.email === "No email"}
                    >
                      <RoleForgeIcon name="mail" size={14} />
                      Send reply
                    </button>
                    <button
                      className="admin-support-action"
                      type="submit"
                      name="nextStatus"
                      value="closed"
                      disabled={!readiness.customerReplyReady || request.email === "No email"}
                    >
                      <RoleForgeIcon name="check" size={14} />
                      Send and close
                    </button>
                  </div>
                </div>
              </form>
              <div className="admin-support-actions">
                <SupportStatusForm request={request} status="reviewing" label="Reviewing" icon="mail" />
                <SupportStatusForm request={request} status="closed" label="Close" icon="check" />
                {request.status === "closed" ? <SupportStatusForm request={request} status="open" label="Reopen" icon="undo" /> : null}
              </div>
            </article>
          );
        }) : (
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
