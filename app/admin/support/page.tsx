import { notFound, redirect } from "next/navigation";

import { SiteHeader } from "@/app/components/SiteHeader";
import { SiteFooter } from "@/app/components/SiteFooter";
import { PublicAccountMenu } from "@/app/components/PublicAccountMenu";
import { RoleForgeIcon } from "@/app/components/RoleForgeIcons";
import {
  isSupportAdminUser,
  loadAdminSupportQueue,
  parseAdminSupportStatus,
  supportOperatorReadiness,
  type AdminSupportRequest,
} from "@/app/lib/supportAdmin";
import { createRoleForgeRouteClient } from "@/app/lib/supabase/routeClient";
import { createRoleForgeServiceClient } from "@/app/lib/supabase/service";

import { SupportQueue } from "./SupportQueue";
import { updateSupportSelection } from "./bulk";
import { supportQueueCounts } from "@/app/lib/supportQueue";

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
      requests = await loadAdminSupportQueue(serviceClient);
      summary = supportQueueCounts(requests);
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
  return (
    <>
      <a className="site-skip-link" href="#admin-support-main">Skip to support inbox</a>
      <SiteHeader signedIn studioHref="/app" context="Operator inbox" navigationLinks={[["Projects", "/home", "projects"], ["Studio", "/app", "studio"], ["Support page", "/support", "support"], ["Settings", "/settings", "settings"]]}>
        <PublicAccountMenu supportHref="/support" />
      </SiteHeader>
    <main className="admin-support-shell" id="admin-support-main">

      <section className="admin-support-hero" aria-label="Support inbox overview">
        <div>
          <span className="eyebrow">Operator inbox</span>
          <h1>Support requests</h1>
          <p>Review customer requests, reply by email, and update the status from any browser.</p>
        </div>
        <div className="admin-support-stats" aria-label="Support inbox counts">
          <span><strong>{requests.length}</strong> requests</span>
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

      <SupportQueue initialRequests={requests} initialStatus={status} readiness={readiness} loadError={loadError || !serviceClient} updateAction={updateSupportSelection} />
    </main>
    <SiteFooter variant="compact" />
    </>
  );
}
