import type { Metadata } from "next";
import Link from "next/link";

import { Brand } from "../components/Brand";
import { RoleForgeIcon, type RoleForgeIconName } from "../components/RoleForgeIcons";
import { ThemeToggle } from "../components/ThemeToggle";
import { billingReadiness } from "../lib/billing/readiness";
import { getStripeBillingConfig } from "../lib/billing/stripe";
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

function backendBaseUrl() {
  return process.env.NEXT_PUBLIC_BACKEND_URL?.trim().replace(/\/+$/, "") ?? "";
}

async function loadBackendCapabilities(): Promise<{ ok: boolean; capabilities: WorkflowCapabilities | null; error: string }> {
  const baseUrl = backendBaseUrl();
  if (!baseUrl) {
    return { ok: false, capabilities: null, error: "Resume workflow checks are not available for this deployment." };
  }

  try {
    const response = await fetch(`${baseUrl}/capabilities`, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) {
      return { ok: false, capabilities: null, error: "Resume workflow checks are temporarily unavailable." };
    }
    return { ok: true, capabilities: normalizeWorkflowCapabilities(await response.json()), error: "" };
  } catch {
    return { ok: false, capabilities: null, error: "Resume workflow checks did not respond before the status check timed out." };
  }
}

function formatList(values: string[]) {
  if (!values.length) return "Unavailable";
  return values.join(" / ");
}

export default async function StatusPage() {
  const supabaseConfig = getSupabaseConfig();
  const backend = await loadBackendCapabilities();
  const billing = billingReadiness(getStripeBillingConfig(), {
    hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    billingStatus: "none",
  });

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
          : "Premium checkout is paused while billing configuration is completed. Free PDF workflow can remain available.",
      tone: billing.checkoutReady ? "good" : billing.portalReady ? "ready" : "warn",
      icon: "settings",
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

      <section className="legal-footer-card" aria-label="Status footer">
        <div>
          <span className="eyebrow">Need to act?</span>
          <strong>Open the workflow or account controls.</strong>
        </div>
        <div className="legal-footer-actions">
          <Link className="btn btn-soft btn-sm" href="/app">Studio</Link>
          <Link className="btn btn-soft btn-sm" href="/settings">Settings</Link>
          <Link className="btn btn-soft btn-sm" href="/templates">Templates</Link>
          <Link className="btn btn-soft btn-sm" href="/updates">Updates</Link>
          <Link className="btn btn-soft btn-sm" href="/help">Help</Link>
        </div>
      </section>
    </main>
  );
}
