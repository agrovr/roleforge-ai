import type { Metadata } from "next";
import Link from "next/link";

import { Brand } from "../components/Brand";
import { PublicAccountMenu } from "../components/PublicAccountMenu";
import { RoleForgeIcon, type RoleForgeIconName } from "../components/RoleForgeIcons";
import { ThemeToggle } from "../components/ThemeToggle";
import { billingReadiness } from "../lib/billing/readiness";
import { getStripeBillingConfig } from "../lib/billing/stripe";
import { supportRequestHref } from "../lib/supportRequests";
import { getSupabaseConfig } from "../lib/supabase/config";
import { normalizeWorkflowCapabilities, type WorkflowCapabilities } from "../lib/workflowCapabilities";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "System Status",
  description: "Live RoleForge AI status for account access, resume workflow, exports, and Premium billing readiness.",
  alternates: {
    canonical: "/status",
  },
};

type StatusTone = "good" | "ready" | "warn";

type StatusItem = {
  title: string;
  value: string;
  detail: string;
  tone: StatusTone;
  icon: RoleForgeIconName;
};

type StatusAction = {
  title: string;
  detail: string;
  href: string;
  icon: RoleForgeIconName;
};

type StatusDiagnostic = {
  label: string;
  value: string;
  detail: string;
  tone: StatusTone;
};

function backendBaseUrl() {
  return process.env.NEXT_PUBLIC_BACKEND_URL?.trim().replace(/\/+$/, "") ?? "";
}

async function loadBackendCapabilities(): Promise<{ ok: boolean; capabilities: WorkflowCapabilities | null; error: string; latencyMs: number | null }> {
  const baseUrl = backendBaseUrl();
  if (!baseUrl) {
    return { ok: false, capabilities: null, error: "Resume workflow checks are not available for this deployment.", latencyMs: null };
  }

  const startedAt = Date.now();
  try {
    const response = await fetch(`${baseUrl}/capabilities`, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    const latencyMs = Date.now() - startedAt;
    if (!response.ok) {
      return { ok: false, capabilities: null, error: "Resume workflow checks are temporarily unavailable.", latencyMs };
    }
    return { ok: true, capabilities: normalizeWorkflowCapabilities(await response.json()), error: "", latencyMs };
  } catch {
    return { ok: false, capabilities: null, error: "Resume workflow checks did not respond before the status check timed out.", latencyMs: null };
  }
}

function formatList(values: string[]) {
  if (!values.length) return "Unavailable";
  return values.join(" / ");
}

export default async function StatusPage() {
  const supabaseConfig = getSupabaseConfig();
  const backend = await loadBackendCapabilities();
  const checkedAt = new Date();
  const checkedAtLabel = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Chicago",
  }).format(checkedAt);
  const billing = billingReadiness(getStripeBillingConfig(), {
    hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    billingStatus: "none",
  });
  const frontendUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") || "https://roleforgeai.vercel.app";
  const backendUrl = backendBaseUrl();

  const uploadFormats = backend.capabilities?.upload_formats.filter((format) => format.enabled).map((format) => format.label) ?? [];
  const freeExports = backend.capabilities?.export_formats.filter((format) => format.enabled && format.plan !== "premium").map((format) => format.label) ?? [];
  const premiumExports = backend.capabilities?.export_formats.filter((format) => format.enabled && format.plan === "premium").map((format) => format.label) ?? [];
  const templateCount = backend.capabilities?.export_templates.length ?? 0;

  const items: StatusItem[] = [
    {
      title: "Account access",
      value: supabaseConfig.configured ? "Operational" : "Unavailable",
      detail: supabaseConfig.configured
        ? "Google and email sign-in can sync saved projects to Supabase accounts."
        : "Account sign-in is not configured for this deployment.",
      tone: supabaseConfig.configured ? "good" : "warn",
      icon: "lock",
    },
    {
      title: "Resume workflow",
      value: backend.ok ? "Operational" : "Check needed",
      detail: backend.ok
        ? `${formatList(uploadFormats)} uploads are advertised by the backend.`
        : backend.error,
      tone: backend.ok ? "good" : "warn",
      icon: "file",
    },
    {
      title: "Exports",
      value: backend.ok ? "Available" : "Check needed",
      detail: backend.ok
        ? `Free: ${formatList(freeExports)}. Premium: ${formatList(premiumExports)}. ${templateCount} template directions are advertised.`
        : "Export availability depends on the resume workflow service.",
      tone: backend.ok ? "good" : "warn",
      icon: "download",
    },
    {
      title: "Premium billing",
      value: billing.checkoutReady ? "Checkout ready" : billing.portalReady ? "Portal ready" : "Paused",
      detail: billing.checkoutReady
        ? "Stripe checkout and billing portal configuration are ready for signed-in accounts."
        : billing.portalReady
          ? "Existing Stripe customers can open billing management; new checkout is not open."
          : "Premium checkout is unavailable right now. Free PDF workflow can remain available.",
      tone: billing.checkoutReady ? "good" : billing.portalReady ? "ready" : "warn",
      icon: "settings",
    },
  ];
  const actions: StatusAction[] = [
    {
      title: "Run a workflow check",
      detail: "Open Studio to verify upload, targeting, export, and saved project behavior from your account.",
      href: "/app",
      icon: "file",
    },
    {
      title: "Review account controls",
      detail: "Open Settings for profile, security, saved projects, exports, usage, and billing state.",
      href: "/settings",
      icon: "settings",
    },
    {
      title: "Report a workflow issue",
      detail: "Create a support request with the workflow category and Status page context already attached.",
      href: supportRequestHref({
        category: "workflow",
        subject: "Status page workflow issue",
        contextUrl: "/status",
      }),
      icon: "mail",
    },
    {
      title: "Report billing access",
      detail: "Create a billing support request when checkout, billing management, or Premium access looks out of sync.",
      href: supportRequestHref({
        category: "billing",
        subject: "Status page billing issue",
        contextUrl: "/status",
      }),
      icon: "lock",
    },
  ];
  const hasWarning = items.some((item) => item.tone === "warn");
  const incidentTone: StatusTone = hasWarning ? "warn" : "good";
  const incidentTitle = hasWarning ? "Some checks need attention" : "No active incident detected";
  const incidentDetail = hasWarning
    ? "At least one live readiness check is degraded. Use the action cards below to retry the workflow or contact support with this Status page context."
    : "Account access, backend capabilities, exports, and billing readiness are reporting healthy from this deployment check.";
  const diagnostics: StatusDiagnostic[] = [
    {
      label: "Last checked",
      value: checkedAtLabel,
      detail: "Displayed in Central time from the live status render.",
      tone: "ready",
    },
    {
      label: "Frontend",
      value: frontendUrl.replace(/^https?:\/\//, ""),
      detail: "Public Vercel deployment serving RoleForge AI.",
      tone: "good",
    },
    {
      label: "Backend",
      value: backend.ok && backend.latencyMs !== null ? `${backend.latencyMs} ms` : backendUrl ? "Check needed" : "Unavailable",
      detail: backend.ok
        ? `${backendUrl.replace(/^https?:\/\//, "")}/capabilities responded to this status render.`
        : backend.error,
      tone: backend.ok ? "good" : "warn",
    },
    {
      label: "Account provider",
      value: supabaseConfig.configured ? "Supabase ready" : "Check needed",
      detail: supabaseConfig.configured ? "Auth configuration is present for protected account surfaces." : "Account sign-in is unavailable for this deployment.",
      tone: supabaseConfig.configured ? "good" : "warn",
    },
    {
      label: "Billing mode",
      value: billing.checkoutReady ? "Live checkout" : billing.portalReady ? "Portal only" : "Paused",
      detail: billing.checkoutReady
        ? "New Premium checkout and customer billing management are configured."
        : billing.portalReady
          ? "Existing customers can manage billing, but new checkout is not open."
          : "Premium checkout is unavailable from this deployment check.",
      tone: billing.checkoutReady ? "good" : billing.portalReady ? "ready" : "warn",
    },
  ];

  return (
    <main className="legal-shell status-shell">
      <header className="settings-page-topbar legal-topbar">
        <Brand href="/" label="RoleForge AI home" />
        <div className="settings-page-actions">
          <Link className="btn btn-soft btn-sm" href="/app">Studio</Link>
          <Link className="btn btn-soft btn-sm" href="/help">Help</Link>
          <ThemeToggle />
          <PublicAccountMenu
            supportHref={supportRequestHref({
              category: "workflow",
              subject: "Status page question",
              contextUrl: "/status",
            })}
          />
        </div>
      </header>

      <section className="legal-hero status-hero" aria-labelledby="status-title">
        <div>
          <div className="eyebrow">System status</div>
          <h1 id="status-title" className="display">RoleForge readiness at a glance.</h1>
          <p>
            Live checks for account access, resume workflow availability, export formats, and Premium billing readiness.
          </p>
        </div>
        <div className="legal-hero-card status-hero-card" aria-label="Status summary">
          <RoleForgeIcon name="check" size={18} />
          <span>Status uses current deployment configuration</span>
          <span>Backend workflow status comes from advertised capabilities</span>
          <span>Billing status reflects whether Stripe checkout is configured</span>
        </div>
      </section>

      <section className="status-grid" aria-label="RoleForge system status">
        {items.map((item) => (
          <article className={`status-card ${item.tone}`} key={item.title}>
            <div className="status-card-icon">
              <RoleForgeIcon name={item.icon} size={18} />
            </div>
            <div>
              <span>{item.title}</span>
              <strong>{item.value}</strong>
              <p>{item.detail}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="status-diagnostics" aria-label="Status diagnostics">
        <article className={`status-incident-card ${incidentTone}`}>
          <span><RoleForgeIcon name={incidentTone === "good" ? "check" : "settings"} size={17} /></span>
          <div>
            <strong>{incidentTitle}</strong>
            <p>{incidentDetail}</p>
          </div>
        </article>
        <div className="status-diagnostic-grid">
          {diagnostics.map((diagnostic) => (
            <article className={`status-diagnostic-card ${diagnostic.tone}`} key={diagnostic.label}>
              <span>{diagnostic.label}</span>
              <strong>{diagnostic.value}</strong>
              <small>{diagnostic.detail}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="status-action-grid" aria-label="Status next steps">
        {actions.map((action) => (
          <Link className="status-action-card" href={action.href} key={action.title}>
            <span><RoleForgeIcon name={action.icon} size={16} /></span>
            <strong>{action.title}</strong>
            <small>{action.detail}</small>
          </Link>
        ))}
      </section>

      <section className="legal-footer-card" aria-label="Status footer">
        <div>
          <span className="eyebrow">Need to act?</span>
          <strong>Open the workflow or account controls.</strong>
        </div>
        <div className="legal-footer-actions">
          <Link className="btn btn-soft btn-sm" href="/app">Studio</Link>
          <Link className="btn btn-soft btn-sm" href="/settings">Settings</Link>
          <Link className="btn btn-soft btn-sm" href="/templates">Templates</Link>
          <Link className="btn btn-soft btn-sm" href="/support">Support</Link>
          <Link className="btn btn-soft btn-sm" href="/updates">Updates</Link>
          <Link className="btn btn-soft btn-sm" href="/help">Help</Link>
        </div>
      </section>
    </main>
  );
}
